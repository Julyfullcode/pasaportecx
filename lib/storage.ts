import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

export interface StorageAdapter {
  guardar(datos: Uint8Array, extension: string, carpeta: string): Promise<string>;
  leer(url: string): Promise<Buffer>;
  eliminar(url: string): Promise<void>;
}

const RAIZ_UPLOADS = path.join(process.cwd(), "uploads");

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

export const storage: StorageAdapter = new FilesystemStorage();
