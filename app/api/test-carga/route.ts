import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";


const PUNTOS_REGISTRO = 10;
const PUNTOS_RAFAGA = 100;
const PUNTOS_MISMO = 37;
const PUNTOS_DISTINTOS = 53;
const PUNTOS_MULTI = 17;
const CANTIDAD_MULTI = 12;

function autorizado(request: Request) {
  return process.env.VERCEL_ENV !== "production"
    && process.env.VERCEL_GIT_COMMIT_REF === "load-test-staging"
    && Boolean(process.env.ADMIN_PASSWORD) && request.headers.get("x-load-test-key") === process.env.ADMIN_PASSWORD;
}

function runValido(valor: unknown) {
  return typeof valor === "string" && /^[a-z0-9-]{6,40}$/.test(valor);
}

function prefijo(runId: string) {
  return `load-current-${runId}`;
}

async function limpiar(runId: string) {
  const marca = prefijo(runId);
  const correos = await db.correoAutorizado.findMany({
    where: { correo: { startsWith: `${marca}-` } },
    select: { participanteId: true },
  });
  const adicionales = await db.participante.findMany({
    where: { nombre: { startsWith: `Carga ${runId} ` } },
    select: { id: true },
  });
  const ids = [...new Set([
    ...correos.flatMap((item) => item.participanteId ? [item.participanteId] : []),
    ...adicionales.map((item) => item.id),
  ])];
  const [participantes, recuerdos, evidencias] = await Promise.all([
    ids.length ? db.participante.findMany({ where: { id: { in: ids } }, select: { urlFoto: true } }) : [],
    ids.length ? db.recuerdo.findMany({ where: { participanteId: { in: ids } }, select: { urlFoto: true, urlMiniatura: true } }) : [],
    ids.length ? db.completitud.findMany({ where: { participanteId: { in: ids } }, select: { urlEvidencia: true } }) : [],
  ]);
  const archivos = [...new Set([
    ...participantes.map((item) => item.urlFoto),
    ...recuerdos.flatMap((item) => [item.urlFoto, item.urlMiniatura]),
    ...evidencias.flatMap((item) => item.urlEvidencia ? [item.urlEvidencia] : []),
  ].filter((url) => url.startsWith("/uploads/")))];
  await db.$transaction(async (tx) => {
    if (ids.length) await tx.participante.deleteMany({ where: { id: { in: ids } } });
    await tx.correoAutorizado.deleteMany({ where: { correo: { startsWith: `${marca}-` } } });
    await tx.desafio.deleteMany({ where: { codigoQr: { startsWith: `${marca}-` } } });
    await tx.admin.deleteMany({ where: { usuario: `${marca}-admin` } });
    await tx.equipo.deleteMany({ where: { nombre: { startsWith: `Carga ${runId} equipo ` } } });
    await tx.empresa.deleteMany({ where: { nombre: `Carga ${runId} empresa` } });
  }, { maxWait: 15_000, timeout: 30_000 });
  await Promise.allSettled(archivos.map((url) => storage.eliminar(url)));
  return { participantes: ids.length, archivos: archivos.length };
}

async function preparar(runId: string, cantidad: number) {
  await limpiar(runId);
  const marca = prefijo(runId);
  const empresa = await db.empresa.create({
    data: { nombre: `Carga ${runId} empresa`, orden: 9_000, activa: true },
  });
  const equipos = await Promise.all(Array.from({ length: 3 }, (_, indice) => db.equipo.create({
    data: { nombre: `Carga ${runId} equipo ${indice + 1}`, orden: 9_000 + indice, activo: true },
  })));
  await db.configuracionEvento.upsert({
    where: { id: "evento" },
    update: { puntosPorRegistro: PUNTOS_REGISTRO, puntosPorRecuerdo: 10, maxRecuerdosConPuntos: 1, maxRecuerdosPorParticipante: 20, recuerdosRequierenAprobacion: false },
    create: { id: "evento", puntosPorRegistro: PUNTOS_REGISTRO, puntosPorRecuerdo: 10, maxRecuerdosConPuntos: 1, maxRecuerdosPorParticipante: 20, recuerdosRequierenAprobacion: false },
  });
  await db.admin.create({ data: { usuario: `${marca}-admin`, passwordHash: "cuenta-tecnica-sin-acceso" } });
  const desafios = [
    { sufijo: "burst", titulo: "Ráfaga QR", puntos: PUNTOS_RAFAGA },
    { sufijo: "same", titulo: "Idempotencia", puntos: PUNTOS_MISMO },
    { sufijo: "distinct", titulo: "Participantes distintos", puntos: PUNTOS_DISTINTOS },
    ...Array.from({ length: CANTIDAD_MULTI }, (_, indice) => ({ sufijo: `multi-${indice}`, titulo: `Multireto ${indice}`, puntos: PUNTOS_MULTI })),
  ];
  await db.desafio.createMany({
    data: desafios.map((item, indice) => ({
      codigoQr: `${marca}-${item.sufijo}`,
      titulo: `Carga ${runId}: ${item.titulo}`,
      descripcion: "Dato sintético de prueba de concurrencia.",
      tipo: "CHECK_IN",
      puntos: item.puntos,
      dia: 0,
      ubicacion: "",
      estado: "PUBLICADO",
      publicadoEn: new Date(),
      duracionMinutos: 60,
      configuracion: {},
      orden: 9_000 + indice,
    })),
  });
  const correos = Array.from({ length: cantidad }, (_, indice) => `${marca}-${indice}@example.com`);
  await db.correoAutorizado.createMany({
    data: correos.map((correo, indice) => ({ correo, equipoId: equipos[indice % equipos.length].id })),
  });
  const token = randomBytes(32).toString("base64url");
  await db.participante.create({
    data: {
      nombre: `Carga ${runId} monitor`,
      empresaId: empresa.id,
      equipoId: equipos[0].id,
      urlFoto: "/marca/logo-grupo-epm-oficial.png",
      codigoRecuperacion: randomBytes(6).toString("hex").toUpperCase(),
      puntosRegistro: 0,
      puntosTotales: 0,
      sesiones: { create: { tokenHash: createHash("sha256").update(token).digest("hex"), expiraEn: new Date(Date.now() + 2 * 60 * 60_000) } },
    },
  });
  return {
    correos,
    empresaId: empresa.id,
    equipos: equipos.map((item) => item.id),
    cookieMonitor: `pasaporte_participante=${token}`,
    codigos: {
      rafaga: `${marca}-burst`,
      mismo: `${marca}-same`,
      distintos: `${marca}-distinct`,
      multiples: Array.from({ length: CANTIDAD_MULTI }, (_, indice) => `${marca}-multi-${indice}`),
    },
    puntos: { registro: PUNTOS_REGISTRO, rafaga: PUNTOS_RAFAGA, mismo: PUNTOS_MISMO, distintos: PUNTOS_DISTINTOS, multi: PUNTOS_MULTI },
  };
}

async function verificar(runId: string) {
  const marca = prefijo(runId);
  const autorizaciones = await db.correoAutorizado.findMany({
    where: { correo: { startsWith: `${marca}-` } },
    include: {
      participante: { include: { completitudes: { include: { desafio: { select: { codigoQr: true } } } }, ajustes: true, actividadesCompletadas: true } },
    },
    orderBy: { correo: "asc" },
  });
  const participantes = autorizaciones.flatMap((item) => item.participante ? [item.participante] : []);
  const inconsistencias = participantes.flatMap((participante) => {
    const esperado = participante.esStaff ? 0 : participante.puntosRegistro
      + participante.completitudes.filter((item) => item.estado === "APROBADO").reduce((suma, item) => suma + item.puntosOtorgados, 0)
      + participante.ajustes.reduce((suma, item) => suma + item.puntos, 0)
      + participante.actividadesCompletadas.reduce((suma, item) => suma + item.puntosOtorgados, 0);
    return esperado === participante.puntosTotales ? [] : [{ id: participante.id, esperado, real: participante.puntosTotales }];
  });
  const vistos = new Set<string>();
  let duplicados = 0;
  for (const participante of participantes) {
    for (const completitud of participante.completitudes) {
      const clave = `${participante.id}:${completitud.desafioId}`;
      if (vistos.has(clave)) duplicados += 1;
      vistos.add(clave);
    }
  }
  const equiposIncorrectos = autorizaciones.filter((item) => item.participante && item.participante.equipoId !== item.equipoId).length;
  const recuerdos = await db.recuerdo.findMany({
    where: { participanteId: { in: participantes.map((item) => item.id) }, descripcion: { startsWith: `Carga ${runId} foto ` } },
  });
  let archivosInvalidos = 0;
  for (const recuerdo of recuerdos) {
    for (const url of [recuerdo.urlFoto, recuerdo.urlMiniatura]) {
      try {
        if ((await storage.leer(url)).byteLength === 0) archivosInvalidos += 1;
      } catch {
        archivosInvalidos += 1;
      }
    }
  }
  const porCodigo = new Map<string, number>();
  participantes.flatMap((item) => item.completitudes).forEach((item) => porCodigo.set(item.desafio.codigoQr, (porCodigo.get(item.desafio.codigoQr) ?? 0) + 1));
  const primero = autorizaciones.find((item) => item.correo === `${marca}-0@example.com`)?.participante;
  const totalesEquipo = equiposIncorrectos === 0 ? await db.equipo.findMany({
    where: { nombre: { startsWith: `Carga ${runId} equipo ` } },
    orderBy: { orden: "asc" },
    select: { id: true, nombre: true, participantes: { select: { puntosTotales: true } } },
  }) : [];
  return {
    autorizados: autorizaciones.length,
    registrados: participantes.length,
    equiposIncorrectos,
    duplicados,
    inconsistencias,
    recuerdos: recuerdos.length,
    archivosInvalidos,
    rafaga: porCodigo.get(`${marca}-burst`) ?? 0,
    mismoPrimero: primero?.completitudes.filter((item) => item.desafio.codigoQr === `${marca}-same`).length ?? 0,
    distintos: porCodigo.get(`${marca}-distinct`) ?? 0,
    multiplesPrimero: primero?.completitudes.filter((item) => item.desafio.codigoQr.startsWith(`${marca}-multi-`)).length ?? 0,
    totalPrimero: primero?.puntosTotales ?? null,
    totalesEquipo: totalesEquipo.map((item) => ({ id: item.id, nombre: item.nombre, puntos: item.participantes.reduce((suma, participante) => suma + participante.puntosTotales, 0) })),
  };
}

export async function POST(request: Request) {
  if (!autorizado(request)) return new Response(null, { status: 404 });
  const cuerpo = await request.json().catch(() => null) as { accion?: string; runId?: string; cantidad?: number } | null;
  if (!cuerpo || typeof cuerpo.runId !== "string" || !runValido(cuerpo.runId)) return Response.json({ error: "runId inválido" }, { status: 400 });
  const runId = cuerpo.runId;
  if (cuerpo.accion === "preparar") return Response.json(await preparar(runId, Math.max(1, Math.min(150, Math.trunc(cuerpo.cantidad ?? 120)))));
  if (cuerpo.accion === "verificar") return Response.json(await verificar(runId));
  if (cuerpo.accion === "limpiar") return Response.json(await limpiar(runId));
  if (cuerpo.accion === "estado") return Response.json({ entorno: process.env.VERCEL_ENV, rama: process.env.VERCEL_GIT_COMMIT_REF });
  return Response.json({ error: "Acción inválida" }, { status: 400 });
}