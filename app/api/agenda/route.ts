import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { participanteActual } from "@/lib/auth";
import { db } from "@/lib/db";
import { generarAgendaPdf } from "@/lib/agenda";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cachePdfAgenda = new Map<string, Promise<Uint8Array>>();

async function pdfAgenda(
  config: { nombreEvento: string; descripcionAgenda: string; organizadoresAgenda: string },
  dias: {
    fecha: string | null;
    nombre: string;
    fotos: { urlFoto: string }[];
    momentos: { horaInicio: string; horaFin: string; nombre: string; descripcion: string; destacado: boolean; urlFotoExpositor: string | null }[];
  }[],
  logo?: Uint8Array,
  fuenteRegular?: Uint8Array,
  fuenteSemibold?: Uint8Array,
) {
  const clave = createHash("sha256")
    .update(process.env.VERCEL_GIT_COMMIT_SHA ?? "local")
    .update(JSON.stringify(config))
    .update(JSON.stringify(dias))
    .digest("hex");
  const existente = cachePdfAgenda.get(clave);
  if (existente) return existente;
  if (cachePdfAgenda.size >= 3) cachePdfAgenda.clear();
  const promesa = (async () => {
    const diasConFotos = await Promise.all(dias.map(async (dia) => ({
      nombre: dia.nombre,
      fecha: dia.fecha,
      fotos: (await Promise.all(dia.fotos.map((foto) => cargarImagen(foto.urlFoto, "día"))))
        .filter((foto): foto is Buffer => Boolean(foto)),
      momentos: await Promise.all(dia.momentos.map(async ({ urlFotoExpositor, ...momento }) => ({
        ...momento,
        fotoExpositor: urlFotoExpositor
          ? await cargarImagen(urlFotoExpositor, "expositor")
          : undefined,
      }))),
    })));
    return generarAgendaPdf({
      evento: config.nombreEvento,
      descripcion: config.descripcionAgenda,
      organizadores: config.organizadoresAgenda,
      dias: diasConFotos,
      logo,
      fuenteRegular,
      fuenteSemibold,
    });
  })();
  cachePdfAgenda.set(clave, promesa);
  try { return await promesa; } catch (error) {
    cachePdfAgenda.delete(clave);
    throw error;
  }
}

async function cargarImagen(url: string, contexto: string) {
  try { return await storage.leer(url); } catch (error) {
    console.error(`No se pudo cargar una foto de ${contexto} para la agenda PDF`, error);
    return undefined;
  }
}

export async function GET() {
  if (!(await participanteActual())) return Response.json({ error: "Debes iniciar sesión para descargar la agenda." }, { status: 401 });
  try {
    const [config, dias, logo, fuenteRegular, fuenteSemibold] = await Promise.all([
      db.configuracionEvento.findUniqueOrThrow({
        where: { id: "evento" },
        select: { nombreEvento: true, descripcionAgenda: true, organizadoresAgenda: true },
      }),
      db.diaAgenda.findMany({
        orderBy: { orden: "asc" },
        select: {
          nombre: true,
          fecha: true,
          fotos: { orderBy: { orden: "asc" }, select: { urlFoto: true } },
          momentos: { orderBy: [{ horaInicio: "asc" }, { nombre: "asc" }], select: { horaInicio: true, horaFin: true, nombre: true, descripcion: true, destacado: true, urlFotoExpositor: true } },
        },
      }),
      readFile(join(process.cwd(), "public", "marca", "logo-grupo-epm-blanco.png")).catch(() => undefined),
      readFile(join(process.cwd(), "public", "fuentes", "Poppins-Regular.ttf")).catch(() => undefined),
      readFile(join(process.cwd(), "public", "fuentes", "Poppins-SemiBold.ttf")).catch(() => undefined),
    ]);
    const pdf = await pdfAgenda(config, dias, logo, fuenteRegular, fuenteSemibold);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline; filename=agenda-encuentro.pdf",
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("No se pudo generar la agenda PDF", error);
    return Response.json({ error: "No pudimos generar la agenda. Vuelve a intentarlo." }, { status: 500 });
  }
}
