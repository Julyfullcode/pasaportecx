import { createHash, randomBytes } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { crearReporte, imprimirReporte, type Muestra, type ReporteMetrica } from "./metricas";

const BASE_URL = process.env.LOAD_BASE_URL ?? "http://127.0.0.1:3000";
const PERFIL = process.env.LOAD_PROFILE === "quick" ? "quick" : "evento";
const REMOTO_PERMITIDO = process.env.LOAD_ALLOW_REMOTE === "1";
const ES_LOCAL = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(BASE_URL);
if (!ES_LOCAL && !REMOTO_PERMITIDO) throw new Error("La carga remota está bloqueada. Usa LOAD_ALLOW_REMOTE=1 solo sobre un entorno aislado.");

const carga = PERFIL === "quick"
  ? { registros: 30, rampaMs: 15_000, rafaga: 30, rafagaMs: 3_000, carreraMismo: 12, carreraDistintos: 20, fotos: 10, pollingMinMs: 1_000, pollingMaxMs: 1_500 }
  : { registros: Number(process.env.LOAD_REGISTRATIONS ?? 120), rampaMs: Number(process.env.LOAD_RAMP_MS ?? 12 * 60_000), rafaga: 65, rafagaMs: 7_000, carreraMismo: 25, carreraDistintos: 60, fotos: 15, pollingMinMs: 3_000, pollingMaxMs: 5_000 };

const EMPRESA_ID = "empresa-e2e";
const FOTO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const reportes: ReporteMetrica[] = [];

type UsuarioCarga = { id: string; correo: string; cookie: string; puntosRegistro: number };

function dormir(ms: number) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

function cookieDesde(respuesta: Response) {
  const cabecera = respuesta.headers.get("set-cookie") ?? "";
  const token = cabecera.match(/pasaporte_participante=([^;]+)/)?.[1];
  return token ? `pasaporte_participante=${token}` : "";
}

async function medir(peticion: (signal: AbortSignal) => Promise<Response>, validar: (respuesta: Response) => Promise<string | null>, timeoutMs = 30_000) {
  const inicio = performance.now();
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  try {
    const respuesta = await peticion(controlador.signal);
    const errorLogico = await validar(respuesta);
    return { respuesta, muestra: { duracionMs: performance.now() - inicio, status: respuesta.status, errorLogico: errorLogico ?? undefined } satisfies Muestra };
  } catch (error) {
    const timeout = error instanceof DOMException && error.name === "AbortError";
    return {
      respuesta: null,
      muestra: { duracionMs: performance.now() - inicio, timeout, errorLogico: timeout ? undefined : error instanceof Error ? error.message : "Error de red" } satisfies Muestra,
    };
  } finally {
    clearTimeout(temporizador);
  }
}

async function programar(total: number, ventanaMs: number, tarea: (indice: number) => Promise<void>) {
  const inicio = performance.now();
  await Promise.all(Array.from({ length: total }, async (_, indice) => {
    const objetivo = total <= 1 ? 0 : (ventanaMs * indice) / (total - 1);
    await dormir(Math.max(0, objetivo - (performance.now() - inicio)));
    await tarea(indice);
  }));
  return performance.now() - inicio;
}

async function asegurarDatosCarga() {
  await db.empresa.upsert({
    where: { id: EMPRESA_ID },
    update: { activa: true },
    create: { id: EMPRESA_ID, nombre: "Empresa carga", orden: 999, activa: true },
  });
  await db.configuracionEvento.update({
    where: { id: "evento" },
    data: { puntosPorRegistro: 10, recuerdosRequierenAprobacion: false, maxRecuerdosPorParticipante: 20 },
  });
  await Promise.all([
    db.desafio.upsert({ where: { codigoQr: "load-rafaga" }, update: { estado: "PUBLICADO", puntos: 100, publicadoEn: new Date(), duracionMinutos: 60 }, create: { codigoQr: "load-rafaga", titulo: "Carga ráfaga", descripcion: "Prueba de estación", tipo: "CHECK_IN", puntos: 100, dia: 0, ubicacion: "", estado: "PUBLICADO", publicadoEn: new Date(), duracionMinutos: 60, configuracion: {} } }),
    db.desafio.upsert({ where: { codigoQr: "load-race-mismo" }, update: { estado: "PUBLICADO", puntos: 37, publicadoEn: new Date(), duracionMinutos: 60 }, create: { codigoQr: "load-race-mismo", titulo: "Carrera mismo participante", descripcion: "Prueba de idempotencia", tipo: "CHECK_IN", puntos: 37, dia: 0, ubicacion: "", estado: "PUBLICADO", publicadoEn: new Date(), duracionMinutos: 60, configuracion: {} } }),
    db.desafio.upsert({ where: { codigoQr: "load-race-distintos" }, update: { estado: "PUBLICADO", puntos: 53, publicadoEn: new Date(), duracionMinutos: 60 }, create: { codigoQr: "load-race-distintos", titulo: "Carrera participantes distintos", descripcion: "Prueba de integridad", tipo: "CHECK_IN", puntos: 53, dia: 0, ubicacion: "", estado: "PUBLICADO", publicadoEn: new Date(), duracionMinutos: 60, configuracion: {} } }),
  ]);
}

async function crearMonitor() {
  const token = randomBytes(32).toString("base64url");
  const participante = await db.participante.create({
    data: {
      nombre: `Monitor carga ${Date.now()}`,
      empresaId: EMPRESA_ID,
      urlFoto: "/marca/logo-grupo-epm-oficial.png",
      codigoRecuperacion: randomBytes(6).toString("hex").toUpperCase(),
      puntosRegistro: 0,
      puntosTotales: 0,
      sesiones: { create: { tokenHash: createHash("sha256").update(token).digest("hex"), expiraEn: new Date(Date.now() + 60 * 60_000) } },
    },
  });
  return { id: participante.id, cookie: `pasaporte_participante=${token}` };
}

async function registrar(indice: number, marca: string) {
  const correo = `load-${marca}-${indice}@example.com`;
  await db.correoAutorizado.create({ data: { correo } });
  const formulario = new FormData();
  formulario.set("correo", correo);
  formulario.set("nombres", `Carga ${indice}`);
  formulario.set("apellidos", marca);
  formulario.set("empresaId", EMPRESA_ID);
  formulario.set("aceptaDatos", "on");
  formulario.set("foto", new Blob([FOTO], { type: "image/png" }), "perfil.png");
  return { correo, ...(await medir(
    (signal) => fetch(`${BASE_URL}/api/registro`, { method: "POST", body: formulario, signal }),
    async (respuesta) => {
      if (!respuesta.ok) return (await respuesta.text()).slice(0, 200);
      const cuerpo = await respuesta.clone().json().catch(() => null) as { participante?: { nombre?: string } } | null;
      return cuerpo?.participante?.nombre && cookieDesde(respuesta) ? null : "Respuesta 2xx sin participante o cookie";
    },
    30_000,
  )) };
}

async function completar(cookie: string, codigo: string) {
  return medir(
    (signal) => fetch(`${BASE_URL}/api/desafios/${codigo}/completar`, { method: "POST", headers: { Cookie: cookie }, signal }),
    async (respuesta) => {
      const cuerpo = await respuesta.clone().json().catch(() => null) as { estado?: string; yaCompletado?: boolean; error?: string } | null;
      return respuesta.ok && (cuerpo?.estado || cuerpo?.yaCompletado) ? null : cuerpo?.error ?? "Respuesta silenciosa o mal formada";
    },
  );
}

async function verificarIntegridad(ids: string[]) {
  const participantes = await db.participante.findMany({
    where: { id: { in: ids } },
    include: { completitudes: true, ajustes: true },
  });
  const inconsistencias = participantes.flatMap((participante) => {
    const esperado = participante.esStaff ? 0 : participante.puntosRegistro
      + participante.completitudes.filter((item) => item.estado === "APROBADO").reduce((suma, item) => suma + item.puntosOtorgados, 0)
      + participante.ajustes.reduce((suma, item) => suma + item.puntos, 0);
    return esperado === participante.puntosTotales ? [] : [{ id: participante.id, esperado, real: participante.puntosTotales }];
  });
  const completitudes = await db.completitud.findMany({
    where: { participanteId: { in: ids } },
    select: { participanteId: true, desafioId: true },
  });
  const vistos = new Set<string>();
  const duplicados = completitudes.filter((item) => {
    const clave = `${item.participanteId}:${item.desafioId}`;
    if (vistos.has(clave)) return true;
    vistos.add(clave);
    return false;
  });
  return { inconsistencias, duplicados };
}

test.describe("Carga esperada del evento", () => {
  test.setTimeout(PERFIL === "quick" ? 4 * 60_000 : 20 * 60_000);

  test("registro, ráfaga QR, puntos, podio y fotos", async () => {
    await asegurarDatosCarga();
    const marca = `${Date.now()}-${randomBytes(3).toString("hex")}`;
    const monitor = await crearMonitor();
    const usuarios: UsuarioCarga[] = [];
    const muestrasPodio: Muestra[] = [];
    const fallos: string[] = [];
    const hallazgos: Record<string, unknown> = {};
    let detenerPolling = false;
    const inicioPolling = performance.now();
    const polling = (async () => {
      while (!detenerPolling) {
        const { muestra } = await medir(
          (signal) => fetch(`${BASE_URL}/api/ranking`, { headers: { Cookie: monitor.cookie }, signal }),
          async (respuesta) => {
            const cuerpo = await respuesta.clone().json().catch(() => null) as { individual?: { id: string; puntosTotales: number }[] } | null;
            if (!respuesta.ok || !Array.isArray(cuerpo?.individual)) return "Ranking no disponible";
            const ids = new Set(cuerpo.individual.map((persona) => persona.id));
            if (ids.size !== cuerpo.individual.length) return "Ranking con participantes duplicados";
            if (cuerpo.individual.some((persona, indice) => indice > 0 && cuerpo.individual![indice - 1].puntosTotales < persona.puntosTotales)) return "Ranking fuera de orden";
            return null;
          },
        );
        muestrasPodio.push(muestra);
        const espera = carga.pollingMinMs + Math.random() * (carga.pollingMaxMs - carga.pollingMinMs);
        await dormir(espera);
      }
    })();

    await test.step("1. Pico gradual de registro", async () => {
      const muestras: Muestra[] = [];
      const duracion = await programar(carga.registros, carga.rampaMs, async (indice) => {
        const resultado = await registrar(indice, marca);
        muestras.push(resultado.muestra);
        if (resultado.respuesta?.ok) {
          const participante = await db.correoAutorizado.findUniqueOrThrow({ where: { correo: resultado.correo }, include: { participante: true } });
          usuarios.push({ id: participante.participante!.id, correo: resultado.correo, cookie: cookieDesde(resultado.respuesta), puntosRegistro: participante.participante!.puntosRegistro });
        }
      });
      const reporte = crearReporte("1. Pico de registro", muestras, duracion);
      reportes.push(reporte); imprimirReporte(reporte);
      if (reporte.errores.total) fallos.push(`Registro tuvo ${reporte.errores.total} errores.`);
      if (usuarios.length !== carga.registros) fallos.push(`Se esperaban ${carga.registros} registros y quedaron ${usuarios.length}.`);
    });

    await test.step("2. Ráfaga de QR", async () => {
      const muestras: Muestra[] = [];
      const duracion = await programar(carga.rafaga, carga.rafagaMs, async (indice) => {
        muestras.push((await completar(usuarios[indice].cookie, "load-rafaga")).muestra);
      });
      const reporte = crearReporte("2. Ráfaga QR", muestras, duracion);
      reportes.push(reporte); imprimirReporte(reporte);
      const persistidas = await db.completitud.count({ where: { desafio: { codigoQr: "load-rafaga" }, participanteId: { in: usuarios.slice(0, carga.rafaga).map((usuario) => usuario.id) } } });
      if (reporte.errores.total) fallos.push(`Ráfaga QR tuvo ${reporte.errores.total} errores.`);
      if (persistidas !== carga.rafaga) fallos.push(`La ráfaga persistió ${persistidas} de ${carga.rafaga} completitudes.`);
    });

    await test.step("3. Race condition de puntos", async () => {
      const muestras: Muestra[] = [];
      const inicio = performance.now();
      const mismo = usuarios[0];
      const distintos = usuarios.slice(0, carga.carreraDistintos);
      const respuestas = await Promise.all([
        ...Array.from({ length: carga.carreraMismo }, () => completar(mismo.cookie, "load-race-mismo")),
        ...distintos.map((usuario) => completar(usuario.cookie, "load-race-distintos")),
      ]);
      muestras.push(...respuestas.map((resultado) => resultado.muestra));
      const reporte = crearReporte("3. Race condition de puntos", muestras, performance.now() - inicio);
      reportes.push(reporte); imprimirReporte(reporte);
      const integridad = await verificarIntegridad(usuarios.map((usuario) => usuario.id));
      const mismoPersistidas = await db.completitud.count({ where: { participanteId: mismo.id, desafio: { codigoQr: "load-race-mismo" } } });
      const distintasPersistidas = await db.completitud.count({ where: { participanteId: { in: distintos.map((usuario) => usuario.id) }, desafio: { codigoQr: "load-race-distintos" } } });
      hallazgos.integridadPuntos = { mismoPersistidas, distintasPersistidas, esperadasDistintas: carga.carreraDistintos, duplicados: integridad.duplicados.length, totalesIncorrectos: integridad.inconsistencias };
      if (reporte.errores.total) fallos.push(`Carrera de puntos tuvo ${reporte.errores.total} errores.`);
      if (mismoPersistidas !== 1) fallos.push(`El participante repetido dejó ${mismoPersistidas} completitudes en lugar de 1.`);
      if (distintasPersistidas !== carga.carreraDistintos) fallos.push(`Solo persistieron ${distintasPersistidas} de ${carga.carreraDistintos} completitudes distintas.`);
      if (integridad.duplicados.length) fallos.push(`Se detectaron ${integridad.duplicados.length} completitudes duplicadas.`);
      if (integridad.inconsistencias.length) fallos.push(`Se detectaron ${integridad.inconsistencias.length} totales de puntos incorrectos.`);
    });

    detenerPolling = true;
    await polling;
    const reportePodio = crearReporte("4. Podio bajo escritura concurrente", muestrasPodio, performance.now() - inicioPolling);
    reportes.push(reportePodio); imprimirReporte(reportePodio);
    if (reportePodio.errores.total) fallos.push(`El podio tuvo ${reportePodio.errores.total} lecturas fallidas o inconsistentes.`);

    await test.step("5. Subida concurrente de fotos", async () => {
      const muestras: Muestra[] = [];
      const seleccionados = usuarios.slice(-carga.fotos);
      const inicio = performance.now();
      await Promise.all(seleccionados.map(async (usuario, indice) => {
        const formulario = new FormData();
        formulario.set("foto", new Blob([FOTO], { type: "image/png" }), `foto-${indice}.png`);
        formulario.set("miniatura", new Blob([FOTO], { type: "image/png" }), `miniatura-${indice}.png`);
        formulario.set("descripcion", `Carga concurrente ${marca}-${indice}`);
        const { muestra } = await medir(
          (signal) => fetch(`${BASE_URL}/api/recuerdos`, { method: "POST", headers: { Cookie: usuario.cookie, "Idempotency-Key": `load-${marca}-${indice}` }, body: formulario, signal }),
          async (respuesta) => {
            const cuerpo = await respuesta.clone().json().catch(() => null) as { recuerdo?: { id?: string } } | null;
            return respuesta.ok && cuerpo?.recuerdo?.id ? null : "Foto no persistida o respuesta silenciosa";
          },
          60_000,
        );
        muestras.push(muestra);
      }));
      const reporte = crearReporte("5. Subida concurrente de fotos", muestras, performance.now() - inicio);
      reportes.push(reporte); imprimirReporte(reporte);
      const recuerdos = await db.recuerdo.findMany({ where: { descripcion: { startsWith: `Carga concurrente ${marca}-` } } });
      if (reporte.errores.total) fallos.push(`La subida de fotos tuvo ${reporte.errores.total} errores.`);
      if (recuerdos.length !== carga.fotos) fallos.push(`Solo se guardaron ${recuerdos.length} de ${carga.fotos} fotos.`);
      let archivosCorruptos = 0;
      if (ES_LOCAL) {
        for (const recuerdo of recuerdos) {
          for (const url of [recuerdo.urlFoto, recuerdo.urlMiniatura]) {
            try {
              const archivo = path.join(process.cwd(), ".e2e-uploads", url.replace(/^\/uploads\//, ""));
              if ((await stat(archivo)).size <= 0 || !(await sharp(archivo).metadata()).width) archivosCorruptos += 1;
            } catch {
              archivosCorruptos += 1;
            }
          }
        }
      }
      hallazgos.fotos = { registros: recuerdos.length, archivosCorruptos };
      if (archivosCorruptos) fallos.push(`Se encontraron ${archivosCorruptos} archivos de foto perdidos o corruptos.`);
    });

    const directorio = path.join(process.cwd(), "test-results");
    await mkdir(directorio, { recursive: true });
    await writeFile(path.join(directorio, `load-${PERFIL}.json`), JSON.stringify({ perfil: PERFIL, carga, endpoints: { registro: "POST /api/registro", completar: "POST /api/desafios/:codigo/completar", podio: "GET /api/ranking", fotos: "POST /api/recuerdos" }, reportes, hallazgos, fallos }, null, 2));
    expect(fallos, `Hallazgos de carga:\n- ${fallos.join("\n- ")}`).toEqual([]);
  });
});
