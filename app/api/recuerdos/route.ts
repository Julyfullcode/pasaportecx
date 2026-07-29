import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { participanteActual } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { recalcularPuntosParticipante } from "@/lib/puntos";
import { anunciarCambio } from "@/lib/eventos";

export async function GET(request: Request) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Sin sesión" }, { status: 401 });
  const url = new URL(request.url);
  const pagina = Math.max(1, Number(url.searchParams.get("pagina") ?? 1));
  const propios = url.searchParams.get("mios") === "1";
  const recuerdos = await db.recuerdo.findMany({
    where: {
      visible: true,
      pendiente: false,
      ...(propios ? { participanteId: participante.id } : {}),
    },
    orderBy: { creadoEn: "desc" },
    skip: (pagina - 1) * 18,
    take: 18,
    include: { participante: { include: { grupo: true, empresa: true } } },
  });
  return Response.json({ recuerdos, siguiente: recuerdos.length === 18 ? pagina + 1 : null });
}

export async function POST(request: Request) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Tu sesión venció." }, { status: 401 });
  const formulario = await request.formData();
  const foto = formulario.get("foto");
  const miniatura = formulario.get("miniatura");
  const descripcion = String(formulario.get("descripcion") ?? "").trim().slice(0, 140);
  const clave = request.headers.get("Idempotency-Key");
  if (!(foto instanceof File) || !(miniatura instanceof File)) {
    return Response.json({ error: "Faltan los archivos de imagen." }, { status: 400 });
  }
  if (clave) {
    const existente = await db.recuerdo.findUnique({ where: { claveIdempotencia: clave } });
    if (existente) return Response.json({ recuerdo: existente, repetido: true });
  }
  const [urlFoto, urlMiniatura] = await Promise.all([
    storage.guardar(new Uint8Array(await foto.arrayBuffer()), "jpg", "recuerdos"),
    storage.guardar(new Uint8Array(await miniatura.arrayBuffer()), "jpg", "miniaturas"),
  ]);
  try {
    const recuerdo = await db.$transaction(async (tx) => {
      const configuracion = await tx.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } });
      const creado = await tx.recuerdo.create({
        data: {
          participanteId: participante.id,
          urlFoto,
          urlMiniatura,
          descripcion: descripcion || null,
          visible: !configuracion.recuerdosRequierenAprobacion,
          pendiente: configuracion.recuerdosRequierenAprobacion,
          claveIdempotencia: clave,
        },
      });
      if (!configuracion.recuerdosRequierenAprobacion && configuracion.puntosPorRecuerdo > 0) {
        const conPuntos = await tx.ajustePuntos.count({
          where: { participanteId: participante.id, motivo: { startsWith: "Recuerdo #" } },
        });
        if (conPuntos < configuracion.maxRecuerdosConPuntos) {
          const admin = await tx.admin.findFirstOrThrow();
          await tx.ajustePuntos.create({
            data: {
              participanteId: participante.id,
              puntos: configuracion.puntosPorRecuerdo,
              motivo: `Recuerdo #${creado.id}`,
              adminId: admin.id,
            },
          });
          await recalcularPuntosParticipante(tx, participante.id);
        }
      }
      return creado;
    });
    anunciarCambio("recuerdo");
    return Response.json({ recuerdo });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && clave) {
      const existente = await db.recuerdo.findUnique({ where: { claveIdempotencia: clave } });
      return Response.json({ recuerdo: existente, repetido: true });
    }
    return Response.json({ error: "No se pudo guardar esta foto. Reintenta solo esta carga." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Sin sesión" }, { status: 401 });
  const { id, accion } = (await request.json()) as { id?: string; accion?: string };
  const recuerdo = await db.recuerdo.findUnique({ where: { id } });
  if (!recuerdo) return Response.json({ error: "Recuerdo no encontrado" }, { status: 404 });
  if (accion === "reportar") {
    await db.recuerdo.update({ where: { id }, data: { reportado: true } });
  } else if (accion === "eliminar" && recuerdo.participanteId === participante.id) {
    await db.$transaction(async (tx) => {
      await tx.recuerdo.delete({ where: { id } });
      await tx.ajustePuntos.deleteMany({
        where: { participanteId: participante.id, motivo: `Recuerdo #${id}` },
      });
      await recalcularPuntosParticipante(tx, participante.id);
    });
    await Promise.all([storage.eliminar(recuerdo.urlFoto), storage.eliminar(recuerdo.urlMiniatura)]);
  } else {
    return Response.json({ error: "Acción no permitida" }, { status: 403 });
  }
  anunciarCambio("recuerdo");
  return Response.json({ ok: true });
}
