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
  evento: string,
  dias: {
    nombre: string;
    momentos: { horaInicio: string; horaFin: string; nombre: string; descripcion: string; urlFotoExpositor: string | null }[];
  }[],
  logo?: Uint8Array,
) {
  const clave = createHash("sha256")
    .update(process.env.VERCEL_GIT_COMMIT_SHA ?? "local")
    .update(evento)
    .update(JSON.stringify(dias))
    .digest("hex");
  const existente = cachePdfAgenda.get(clave);
  if (existente) return existente;
  if (cachePdfAgenda.size >= 3) cachePdfAgenda.clear();
  const promesa = (async () => {
    const diasConFotos = await Promise.all(dias.map(async (dia) => ({
      nombre: dia.nombre,
      momentos: await Promise.all(dia.momentos.map(async ({ urlFotoExpositor, ...momento }) => ({
        ...momento,
        fotoExpositor: urlFotoExpositor
          ? await storage.leer(urlFotoExpositor).catch(() => undefined)
          : undefined,
      }))),
    })));
    return generarAgendaPdf({ evento, dias: diasConFotos, logo });
  })();
  cachePdfAgenda.set(clave, promesa);
  try { return await promesa; } catch (error) {
    cachePdfAgenda.delete(clave);
    throw error;
  }
}

export async function GET() {
  if (!(await participanteActual())) return Response.json({ error: "Debes iniciar sesión para descargar la agenda." }, { status: 401 });
  try {
    const [config, dias, logo] = await Promise.all([
      db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } }),
      db.diaAgenda.findMany({
        orderBy: { orden: "asc" },
        select: { nombre: true, momentos: { orderBy: [{ horaInicio: "asc" }, { nombre: "asc" }], select: { horaInicio: true, horaFin: true, nombre: true, descripcion: true, urlFotoExpositor: true } } },
      }).catch(() => []),
      readFile(join(process.cwd(), "public", "marca", "logo-grupo-epm-oficial.png")).catch(() => undefined),
    ]);
    const pdf = await pdfAgenda(config.nombreEvento, dias, logo);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": "attachment; filename=agenda-encuentro.pdf",
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("No se pudo generar la agenda PDF", error);
    return Response.json({ error: "No pudimos generar la agenda. Vuelve a intentarlo." }, { status: 500 });
  }
}
