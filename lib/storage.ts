import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

export interface StorageAdapter {
  guardar(datos: Uint8Array, extension: string, carpeta: string): Promise<string>;
  leer(url: string): Promise<Buffer>;
  eliminar(url: string): Promise<void>;
}

const RAIZ_UPLOADS = process.env.UPLOADS_ROOT
  ? path.resolve(process.env.UPLOADS_ROOT)
  : path.join(process.cwd(), "uploads");

function rutaSegura(url: string) {
  const relativa = url.replace(/^\/uploads\//, "");
  const resuelta = path.resolve(RAIZ_UPLOADS, relativa);
  if (!resuelta.startsWith(path.resolve(RAIZ_UPLOADS))) {
    throw new Error("Ruta de almacenamiento inválida");
  }
  return resuelta;
}

export class FilesystemStorage implements StorageAdapter {
  async guardar(datos: Uint8Array, extension: string, carpeta: string) {
    const nombre = `${randomBytes(20).toString("hex")}.${extension.replace(/\W/g, "")}`;
    const directorio = path.join(RAIZ_UPLOADS, carpeta);
    await mkdir(directorio, { recursive: true });
    await writeFile(path.join(directorio, nombre), datos);
    return `/uploads/${carpeta}/${nombre}`;
  }

  leer(url: string) {
    return readFile(rutaSegura(url));
  }

  async eliminar(url: string) {
    await rm(rutaSegura(url), { force: true });
  }
}

const TIPOS_CONTENIDO: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

function configuracionSupabase() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!url || !clave || !bucket) {
    throw new Error(
      "Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o SUPABASE_STORAGE_BUCKET",
    );
  }
  return { url, clave, bucket };
}

function rutaObjeto(url: string) {
  const prefijo = "/uploads/";
  if (!url.startsWith(prefijo)) return null;
  const relativa = url.slice(prefijo.length);
  const partes = relativa.split("/");
  if (!relativa || partes.some((parte) => !parte || parte === "." || parte === "..")) {
    throw new Error("Ruta de almacenamiento inválida");
  }
  return relativa;
}

function codificarRuta(ruta: string) {
  return ruta.split("/").map(encodeURIComponent).join("/");
}

async function detalleError(respuesta: Response) {
  const detalle = (await respuesta.text()).slice(0, 500);
  return detalle ? `: ${detalle}` : "";
}

export class SupabaseStorage implements StorageAdapter {
  async guardar(datos: Uint8Array, extension: string, carpeta: string) {
    const { url, clave, bucket } = configuracionSupabase();
    const extensionSegura = extension.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const carpetaSegura = carpeta.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!carpetaSegura) throw new Error("Carpeta de almacenamiento inválida");
    const ruta = `${carpetaSegura}/${randomBytes(20).toString("hex")}.${extensionSegura}`;
    const respuesta = await fetch(
      `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${codificarRuta(ruta)}`,
      {
        method: "POST",
        headers: {
          apikey: clave,
          Authorization: `Bearer ${clave}`,
          "Content-Type": TIPOS_CONTENIDO[extensionSegura] ?? "application/octet-stream",
          "cache-control": "31536000",
          "x-upsert": "false",
        },
        body: Buffer.from(datos),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!respuesta.ok) {
      throw new Error(
        `Supabase Storage no pudo guardar el archivo (${respuesta.status})${await detalleError(respuesta)}`,
      );
    }
    return `/uploads/${ruta}`;
  }

  async leer(urlArchivo: string) {
    const ruta = rutaObjeto(urlArchivo);
    if (!ruta) throw new Error("Ruta de almacenamiento inválida");
    const { url, clave, bucket } = configuracionSupabase();
    const respuesta = await fetch(
      `${url}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${codificarRuta(ruta)}`,
      {
        headers: { apikey: clave, Authorization: `Bearer ${clave}` },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!respuesta.ok) {
      throw new Error(
        `Supabase Storage no pudo leer el archivo (${respuesta.status})${await detalleError(respuesta)}`,
      );
    }
    return Buffer.from(await respuesta.arrayBuffer());
  }

  async eliminar(urlArchivo: string) {
    const ruta = rutaObjeto(urlArchivo);
    if (!ruta) return;
    const { url, clave, bucket } = configuracionSupabase();
    const respuesta = await fetch(
      `${url}/storage/v1/object/${encodeURIComponent(bucket)}`,
      {
        method: "DELETE",
        headers: {
          apikey: clave,
          Authorization: `Bearer ${clave}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefixes: [ruta] }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!respuesta.ok && respuesta.status !== 404) {
      throw new Error(
        `Supabase Storage no pudo eliminar el archivo (${respuesta.status})${await detalleError(respuesta)}`,
      );
    }
  }
}

export const storage: StorageAdapter =
  process.env.STORAGE_DRIVER?.toLowerCase() === "supabase"
    ? new SupabaseStorage()
    : new FilesystemStorage();
