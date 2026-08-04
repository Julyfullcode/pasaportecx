"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { crearSesionAdmin, cerrarSesion, requerirAdmin } from "@/lib/auth";
import { crearCodigoQr } from "@/lib/qr";
import { desafioSchema } from "@/lib/validacion";
import { recalcularPuntosParticipante } from "@/lib/puntos";
import { anunciarCambio } from "@/lib/eventos";
import { storage } from "@/lib/storage";
import type { Prisma } from "@prisma/client";
import { extensionImagen } from "@/lib/archivos";
import { obtenerReporteAlmacenamiento } from "@/lib/almacenamiento";
import {
  CODIGO_DESAFIO_CIERRE,
  FORMATO_COSECHA,
  PREGUNTAS_COSECHA,
  TITULO_DESAFIO_CIERRE,
} from "@/lib/cosecha-config";

export type EstadoLogin = { error?: string };

export async function iniciarSesionAdmin(
  _estado: EstadoLogin,
  formulario: FormData,
): Promise<EstadoLogin> {
  const usuario = String(formulario.get("usuario") ?? "").trim();
  const password = String(formulario.get("password") ?? "");
  const admin = await db.admin.findUnique({ where: { usuario } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return { error: "Usuario o contraseña incorrectos." };
  }
  await crearSesionAdmin(admin.id);
  redirect("/admin");
}

export async function salirAdmin() {
  await cerrarSesion("admin");
  redirect("/admin/login");
}

function configuracionDesdeFormulario(tipo: string, formulario: FormData) {
  if (tipo === "OPCION_MULTIPLE") {
    const lineas = String(formulario.get("opciones") ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    return {
      opciones: lineas.map((texto, indice) => ({
        id: String.fromCharCode(97 + indice),
        texto: texto.replace(/^\*/, "").trim(),
        correcta: texto.startsWith("*"),
      })),
      multiple: formulario.get("multiple") === "on",
      puntajeParcial: formulario.get("puntajeParcial") === "on",
    };
  }
  if (tipo === "RESPUESTA_ABIERTA") {
    return { respuestasAceptadas: String(formulario.get("respuestasAceptadas") ?? "").split(",").map((r) => r.trim()).filter(Boolean) };
  }
  if (tipo === "EVIDENCIA_FOTO") return { instruccion: String(formulario.get("instruccion") ?? "") };
  if (tipo === "ENCUESTA") {
    const formato = String(formulario.get("formato") ?? "texto");
    if (formato === FORMATO_COSECHA) return { formato, preguntas: PREGUNTAS_COSECHA };
    return { pregunta: String(formulario.get("pregunta") ?? ""), formato };
  }
  return {};
}

export async function guardarDesafio(formulario: FormData) {
  await requerirAdmin();
  const datos = desafioSchema.parse(Object.fromEntries(formulario));
  const id = String(formulario.get("id") ?? "");
  const existente = id
    ? await db.desafio.findUnique({ where: { id }, select: { codigoQr: true } })
    : null;
  const esCierre = existente?.codigoQr === CODIGO_DESAFIO_CIERRE;
  const estado = String(formulario.get("estado") ?? "BORRADOR") as "BORRADOR" | "PUBLICADO" | "CERRADO";
  const comun = {
    ...datos,
    tipo: esCierre ? "ENCUESTA" as const : datos.tipo,
    componenteId: datos.componenteId || null,
    esSecreto: formulario.get("esSecreto") === "on",
    estado,
    limiteCompletitudes: formulario.get("limiteCompletitudes") ? Number(formulario.get("limiteCompletitudes")) : null,
    disponibleDesde: formulario.get("disponibleDesde") ? new Date(String(formulario.get("disponibleDesde"))) : null,
    disponibleHasta: formulario.get("disponibleHasta") ? new Date(String(formulario.get("disponibleHasta"))) : null,
    configuracion: esCierre
      ? { formato: FORMATO_COSECHA, preguntas: PREGUNTAS_COSECHA }
      : configuracionDesdeFormulario(datos.tipo, formulario),
  };
  if (id) {
    await db.desafio.update({ where: { id }, data: comun });
  } else {
    await db.desafio.create({ data: { ...comun, codigoQr: crearCodigoQr(datos.titulo) } });
  }
  anunciarCambio("desafio");
  revalidatePath("/admin/desafios");
  revalidatePath("/desafios");
}

export async function crearDesafioCierre() {
  await requerirAdmin();
  const existente = await db.desafio.findUnique({ where: { codigoQr: CODIGO_DESAFIO_CIERRE } });
  if (existente) {
    await db.desafio.update({
      where: { id: existente.id },
      data: {
        tipo: "ENCUESTA",
        configuracion: { formato: FORMATO_COSECHA, preguntas: PREGUNTAS_COSECHA },
      },
    });
  } else {
    const [componente, ubicacion] = await Promise.all([
      db.componente.findFirst({ where: { activo: true }, orderBy: { orden: "asc" } }),
      db.ubicacion.findFirst({ where: { activa: true }, orderBy: { orden: "asc" } }),
    ]);
    await db.desafio.create({
      data: {
        codigoQr: CODIGO_DESAFIO_CIERRE,
        titulo: TITULO_DESAFIO_CIERRE,
        descripcion: "Recoge lo vivido en el encuentro: un aprendizaje, un agradecimiento y una acción para impulsar al regresar.",
        tipo: "ENCUESTA",
        puntos: 150,
        dia: componente ? 2 : 1,
        componenteId: componente?.id ?? null,
        ubicacion: componente ? "" : (ubicacion?.nombre ?? ""),
        estado: "BORRADOR",
        esSecreto: false,
        configuracion: { formato: FORMATO_COSECHA, preguntas: PREGUNTAS_COSECHA },
      },
    });
  }
  revalidatePath("/admin/desafios");
}

export async function cambiarEstadoDesafio(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id"));
  const estado = String(formulario.get("estado")) as "BORRADOR" | "PUBLICADO" | "CERRADO";
  await db.desafio.update({ where: { id }, data: { estado } });
  anunciarCambio("desafio");
  revalidatePath("/admin/desafios");
}

export async function duplicarDesafio(formulario: FormData) {
  await requerirAdmin();
  const original = await db.desafio.findUniqueOrThrow({ where: { id: String(formulario.get("id")) } });
  const { id: _id, creadoEn: _creadoEn, ...datos } = original;
  void _id;
  void _creadoEn;
  await db.desafio.create({
    data: {
      ...datos,
      configuracion: original.configuracion as Prisma.InputJsonValue,
      titulo: `${original.titulo} (copia)`,
      codigoQr: crearCodigoQr(original.titulo),
      estado: "BORRADOR",
    },
  });
  revalidatePath("/admin/desafios");
}

export async function eliminarDesafio(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id"));
  const completitudes = await db.completitud.count({ where: { desafioId: id } });
  if (completitudes > 0) {
    await db.desafio.update({ where: { id }, data: { estado: "CERRADO" } });
  } else {
    await db.desafio.delete({ where: { id } });
  }
  anunciarCambio("desafio");
  revalidatePath("/admin/desafios");
}

export async function cambiarGrupoParticipante(formulario: FormData) {
  await requerirAdmin();
  await db.participante.update({
    where: { id: String(formulario.get("participanteId")) },
    data: { grupoId: String(formulario.get("grupoId")) },
  });
  anunciarCambio("grupo");
  revalidatePath("/admin/participantes");
  revalidatePath("/admin/grupos");
}

export async function ajustarPuntos(formulario: FormData) {
  const admin = await requerirAdmin();
  const participanteId = String(formulario.get("participanteId"));
  const puntos = Number(formulario.get("puntos"));
  const motivo = String(formulario.get("motivo") ?? "").trim();
  if (!motivo || !Number.isInteger(puntos) || puntos === 0) return;
  await db.$transaction(async (tx) => {
    await tx.ajustePuntos.create({ data: { participanteId, puntos, motivo, adminId: admin.id } });
    await recalcularPuntosParticipante(tx, participanteId);
  });
  anunciarCambio("puntos");
  revalidatePath("/admin/participantes");
}

export async function alternarParticipante(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("participanteId"));
  const actual = await db.participante.findUniqueOrThrow({ where: { id } });
  await db.participante.update({ where: { id }, data: { activo: !actual.activo } });
  anunciarCambio("participante");
  revalidatePath("/admin/participantes");
}

export async function eliminarParticipante(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("participanteId"));
  const persona = await db.participante.findUniqueOrThrow({
    where: { id },
    include: { recuerdos: true, completitudes: { select: { urlEvidencia: true } } },
  });
  await db.participante.delete({ where: { id } });
  await Promise.allSettled([
    storage.eliminar(persona.urlFoto),
    ...persona.recuerdos.flatMap((recuerdo) => [
      storage.eliminar(recuerdo.urlFoto),
      storage.eliminar(recuerdo.urlMiniatura),
    ]),
    ...persona.completitudes
      .filter((completitud) => completitud.urlEvidencia)
      .map((completitud) => storage.eliminar(completitud.urlEvidencia!)),
  ]);
  anunciarCambio("participante");
  revalidatePath("/admin/participantes");
}

export async function revisarEvidencia(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id"));
  const decision = String(formulario.get("decision"));
  const urlParaEliminar = await db.$transaction(async (tx) => {
    const completitud = await tx.completitud.findUniqueOrThrow({ where: { id }, include: { desafio: true } });
    const configuracion = await tx.configuracionEvento.findUniqueOrThrow({
      where: { id: "evento" },
      select: { eliminarEvidenciasRechazadas: true },
    });
    const eliminarFoto = decision !== "aprobar" && configuracion.eliminarEvidenciasRechazadas;
    await tx.completitud.update({
      where: { id },
      data: {
        estado: decision === "aprobar" ? "APROBADO" : "RECHAZADO",
        puntosOtorgados: decision === "aprobar" ? completitud.desafio.puntos : 0,
        urlEvidencia: eliminarFoto ? null : completitud.urlEvidencia,
      },
    });
    await recalcularPuntosParticipante(tx, completitud.participanteId);
    return eliminarFoto ? completitud.urlEvidencia : null;
  });
  if (urlParaEliminar) await storage.eliminar(urlParaEliminar).catch(() => undefined);
  anunciarCambio("puntos");
  revalidatePath("/admin/evidencias");
}

export async function moderarRecuerdo(formulario: FormData) {
  const admin = await requerirAdmin();
  const id = String(formulario.get("id"));
  const accion = String(formulario.get("accion"));
  const recuerdo = await db.recuerdo.findUniqueOrThrow({ where: { id } });
  if (accion === "eliminar") {
    await db.$transaction(async (tx) => {
      await tx.recuerdo.delete({ where: { id } });
      await tx.ajustePuntos.deleteMany({
        where: { participanteId: recuerdo.participanteId, motivo: `Recuerdo #${id}` },
      });
      await recalcularPuntosParticipante(tx, recuerdo.participanteId);
    });
    await Promise.all([storage.eliminar(recuerdo.urlFoto), storage.eliminar(recuerdo.urlMiniatura)]);
  } else if (accion === "mostrar") {
    await db.$transaction(async (tx) => {
      await tx.recuerdo.update({
        where: { id },
        data: { visible: true, pendiente: false, reportado: false },
      });
      if (recuerdo.pendiente) {
        const configuracion = await tx.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } });
        const conPuntos = await tx.ajustePuntos.count({
          where: { participanteId: recuerdo.participanteId, motivo: { startsWith: "Recuerdo #" } },
        });
        if (configuracion.puntosPorRecuerdo > 0 && conPuntos < configuracion.maxRecuerdosConPuntos) {
          await tx.ajustePuntos.create({
            data: {
              participanteId: recuerdo.participanteId,
              puntos: configuracion.puntosPorRecuerdo,
              motivo: `Recuerdo #${id}`,
              adminId: admin.id,
            },
          });
          await recalcularPuntosParticipante(tx, recuerdo.participanteId);
        }
      }
    });
  } else {
    await db.recuerdo.update({ where: { id }, data: { visible: false } });
  }
  anunciarCambio("recuerdo");
  revalidatePath("/admin/recuerdos");
}

export async function guardarConfiguracion(formulario: FormData) {
  await requerirAdmin();
  const eliminarEvidenciasRechazadas = formulario.get("eliminarEvidenciasRechazadas") === "on";
  await db.configuracionEvento.update({
    where: { id: "evento" },
    data: {
      nombreEvento: String(formulario.get("nombreEvento")),
      descripcionAgenda: String(formulario.get("descripcionAgenda") ?? "").trim().slice(0, 800),
      organizadoresAgenda: String(formulario.get("organizadoresAgenda") ?? "").trim().slice(0, 300),
      diplomaHabilitado: formulario.get("diplomaHabilitado") === "on",
      tamanoPodioIndividual: Number(formulario.get("tamanoPodioIndividual")),
      tamanoPodioEquipos: Number(formulario.get("tamanoPodioEquipos")),
      metodoPuntajeEquipo: String(formulario.get("metodoPuntajeEquipo")) as "PROMEDIO" | "SUMA",
      modoAsistentes: String(formulario.get("modoAsistentes")) as "MOSAICO" | "CARRUSEL" | "DESTACADO",
      intervaloAsistentesSegundos: Number(formulario.get("intervaloAsistentesSegundos")),
      cicloMixto: String(formulario.get("cicloMixto")),
      puntosPorRecuerdo: Number(formulario.get("puntosPorRecuerdo")),
      maxRecuerdosConPuntos: Number(formulario.get("maxRecuerdosConPuntos")),
      maxRecuerdosPorParticipante: Math.max(1, Math.min(50, Number(formulario.get("maxRecuerdosPorParticipante")) || 10)),
      eliminarEvidenciasRechazadas,
      recuerdosRequierenAprobacion: formulario.get("recuerdosRequierenAprobacion") === "on",
      asignacionAutomatica: formulario.get("asignacionAutomatica") === "on",
    },
  });
  if (eliminarEvidenciasRechazadas) {
    const rechazadas = await db.completitud.findMany({
      where: { estado: "RECHAZADO", urlEvidencia: { not: null } },
      select: { id: true, urlEvidencia: true },
    });
    if (rechazadas.length > 0) {
      await db.completitud.updateMany({
        where: { id: { in: rechazadas.map((item) => item.id) } },
        data: { urlEvidencia: null },
      });
      await Promise.allSettled(rechazadas.map((item) => storage.eliminar(item.urlEvidencia!)));
    }
  }
  anunciarCambio("configuracion");
  revalidatePath("/admin/configuracion");
  revalidatePath("/");
  revalidatePath("/diploma");
}

export async function limpiarArchivosHuerfanos(formulario: FormData) {
  await requerirAdmin();
  if (String(formulario.get("confirmacion") ?? "").trim() !== "ELIMINAR HUERFANOS") return;
  const reporte = await obtenerReporteAlmacenamiento();
  if (!reporte.disponible || reporte.huerfanos.length === 0) return;
  await Promise.allSettled(
    reporte.huerfanos.map((ruta) => storage.eliminar(`/uploads/${ruta}`)),
  );
  revalidatePath("/admin/configuracion");
}

export async function guardarDiaAgenda(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  const nombre = String(formulario.get("nombre") ?? "").trim().slice(0, 100);
  const fechaIngresada = String(formulario.get("fecha") ?? "");
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaIngresada) ? fechaIngresada : null;
  const ordenIngresado = Number(formulario.get("orden") ?? 1);
  const orden = Number.isFinite(ordenIngresado) ? Math.max(1, Math.trunc(ordenIngresado)) : 1;
  if (!nombre) return;
  if (id) await db.diaAgenda.update({ where: { id }, data: { nombre, fecha, orden } });
  else await db.diaAgenda.create({ data: { nombre, fecha, orden } });
  anunciarCambio("agenda");
  revalidatePath("/admin/configuracion");
}

export async function eliminarDiaAgenda(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  if (!id) return;
  const dia = await db.diaAgenda.findUnique({
    where: { id },
    select: {
      fotos: { select: { urlFoto: true } },
      momentos: { select: { urlFotoExpositor: true } },
    },
  });
  await db.diaAgenda.deleteMany({ where: { id } });
  await Promise.allSettled(
    [
      ...(dia?.momentos ?? [])
        .filter((momento) => momento.urlFotoExpositor)
        .map((momento) => storage.eliminar(momento.urlFotoExpositor!)),
      ...(dia?.fotos ?? []).map((foto) => storage.eliminar(foto.urlFoto)),
    ],
  );
  anunciarCambio("agenda");
  revalidatePath("/admin/configuracion");
}

export async function agregarFotosDiaAgenda(formulario: FormData) {
  await requerirAdmin();
  const diaId = String(formulario.get("diaId") ?? "");
  if (!diaId) return;
  const archivos = formulario.getAll("fotosDia")
    .filter((archivo): archivo is File => archivo instanceof File && archivo.size > 0);
  if (!archivos.length || archivos.some((archivo) => !extensionImagen(archivo.type) || archivo.size > 600_000)) return;
  const existentes = await db.fotoDiaAgenda.count({ where: { diaId } });
  const seleccionadas = archivos.slice(0, Math.min(2, Math.max(0, 6 - existentes)));
  if (!seleccionadas.length) return;
  const guardadas: string[] = [];
  try {
    for (const archivo of seleccionadas) {
      guardadas.push(await storage.guardar(
        new Uint8Array(await archivo.arrayBuffer()),
        extensionImagen(archivo.type)!,
        "agenda-dias",
      ));
    }
    await db.$transaction(guardadas.map((urlFoto, indice) => db.fotoDiaAgenda.create({
      data: { diaId, urlFoto, orden: existentes + indice + 1 },
    })));
  } catch (error) {
    await Promise.allSettled(guardadas.map((url) => storage.eliminar(url)));
    throw error;
  }
  anunciarCambio("agenda");
  revalidatePath("/admin/configuracion");
}

export async function eliminarFotoDiaAgenda(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  if (!id) return;
  const foto = await db.fotoDiaAgenda.findUnique({ where: { id } });
  await db.fotoDiaAgenda.deleteMany({ where: { id } });
  if (foto) await storage.eliminar(foto.urlFoto).catch(() => undefined);
  anunciarCambio("agenda");
  revalidatePath("/admin/configuracion");
}

export async function guardarMomentoAgenda(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  const diaId = String(formulario.get("diaId") ?? "");
  const horaInicio = String(formulario.get("horaInicio") ?? "");
  const horaFin = String(formulario.get("horaFin") ?? "");
  const nombre = String(formulario.get("nombre") ?? "").trim().slice(0, 120);
  const descripcion = String(formulario.get("descripcion") ?? "").trim().slice(0, 800);
  const horaValida = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!diaId || !horaValida.test(horaInicio) || !horaValida.test(horaFin) || !nombre) return;
  const foto = formulario.get("fotoExpositor");
  const tieneFotoNueva = foto instanceof File && foto.size > 0;
  if (tieneFotoNueva && (!extensionImagen(foto.type) || foto.size > 250_000)) return;

  const existente = id
    ? await db.momentoAgenda.findUniqueOrThrow({ where: { id }, select: { urlFotoExpositor: true } })
    : null;
  const anterior = existente?.urlFotoExpositor ?? null;
  let nuevaUrl: string | null = null;
  try {
    if (tieneFotoNueva) {
      nuevaUrl = await storage.guardar(
        new Uint8Array(await foto.arrayBuffer()),
        extensionImagen(foto.type)!,
        "expositores",
      );
    }
    const quitarFoto = formulario.get("quitarFotoExpositor") === "on";
    const urlFotoExpositor = nuevaUrl ?? (quitarFoto ? null : anterior);
    const destacado = formulario.get("destacado") === "on";
    const datos = { diaId, horaInicio, horaFin, nombre, descripcion, destacado, urlFotoExpositor };
    if (id) await db.momentoAgenda.update({ where: { id }, data: datos });
    else await db.momentoAgenda.create({ data: datos });
    if (anterior && anterior !== urlFotoExpositor) {
      await storage.eliminar(anterior).catch(() => undefined);
    }
  } catch (error) {
    if (nuevaUrl) await storage.eliminar(nuevaUrl).catch(() => undefined);
    throw error;
  }
  anunciarCambio("agenda");
  revalidatePath("/admin/configuracion");
}

export async function eliminarMomentoAgenda(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  if (!id) return;
  const momento = await db.momentoAgenda.findUnique({ where: { id }, select: { urlFotoExpositor: true } });
  await db.momentoAgenda.deleteMany({ where: { id } });
  if (momento?.urlFotoExpositor) {
    await storage.eliminar(momento.urlFotoExpositor).catch(() => undefined);
  }
  anunciarCambio("agenda");
  revalidatePath("/admin/configuracion");
}

export async function guardarCatalogo(formulario: FormData) {
  await requerirAdmin();
  const tipo = String(formulario.get("tipo"));
  const id = String(formulario.get("id") ?? "");
  const nombre = String(formulario.get("nombre") ?? "").trim();
  const orden = Number(formulario.get("orden") ?? 1);
  if (!nombre) return;
  if (tipo === "empresa") {
    if (id) await db.empresa.update({ where: { id }, data: { nombre, orden } });
    else await db.empresa.create({ data: { nombre, orden } });
  } else if (tipo === "componente") {
    const colorHex = String(formulario.get("colorHex") ?? "#0079C2");
    if (id) await db.componente.update({ where: { id }, data: { nombre, orden, colorHex } });
    else await db.componente.create({ data: { nombre, orden, colorHex } });
  } else if (tipo === "grupo") {
    const colorHex = String(formulario.get("colorHex") ?? "#0079C2");
    if (id) await db.grupo.update({ where: { id }, data: { nombre, orden, colorHex } });
    else await db.grupo.create({ data: { nombre, orden, colorHex } });
  } else if (tipo === "ubicacion") {
    if (id) await db.ubicacion.update({ where: { id }, data: { nombre, orden } });
    else await db.ubicacion.create({ data: { nombre, orden } });
  }
  anunciarCambio("catalogo");
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/grupos");
}

export async function actualizarLogoEmpresa(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  const empresa = await db.empresa.findUniqueOrThrow({ where: { id } });
  if (formulario.get("accion") === "quitar") {
    await db.empresa.update({ where: { id }, data: { urlLogo: null } });
    if (empresa.urlLogo) await storage.eliminar(empresa.urlLogo).catch(() => undefined);
  } else {
    const logo = formulario.get("logo");
    if (!(logo instanceof File) || !extensionImagen(logo.type) || logo.size > 250_000) return;
    const extension = extensionImagen(logo.type)!;
    const urlLogo = await storage.guardar(
      new Uint8Array(await logo.arrayBuffer()),
      extension,
      "empresas",
    );
    await db.empresa.update({ where: { id }, data: { urlLogo } });
    if (empresa.urlLogo) await storage.eliminar(empresa.urlLogo).catch(() => undefined);
  }
  anunciarCambio("empresa");
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/proyeccion/asistentes");
  revalidatePath("/admin/proyeccion/podio");
}

export async function alternarCatalogo(formulario: FormData) {
  await requerirAdmin();
  const tipo = String(formulario.get("tipo"));
  const id = String(formulario.get("id"));
  if (tipo === "empresa") {
    const actual = await db.empresa.findUniqueOrThrow({ where: { id } });
    await db.empresa.update({ where: { id }, data: { activa: !actual.activa } });
  } else if (tipo === "componente") {
    const actual = await db.componente.findUniqueOrThrow({ where: { id } });
    await db.componente.update({ where: { id }, data: { activo: !actual.activo } });
  } else if (tipo === "grupo") {
    const actual = await db.grupo.findUniqueOrThrow({ where: { id } });
    await db.grupo.update({ where: { id }, data: { activo: !actual.activo } });
  } else if (tipo === "ubicacion") {
    const actual = await db.ubicacion.findUniqueOrThrow({ where: { id } });
    await db.ubicacion.update({ where: { id }, data: { activa: !actual.activa } });
  }
  anunciarCambio("catalogo");
  revalidatePath("/admin/configuracion");
}

export type EstadoPreparacionPublico = {
  tipo: "inicial" | "error" | "exito";
  mensaje: string;
  eliminados?: {
    participantes: number;
    sesiones: number;
    completitudes: number;
    ajustes: number;
    recuerdos: number;
    reacciones: number;
    archivos: number;
    archivosConError: number;
  };
};

export async function prepararAplicacionPublico(
  _estado: EstadoPreparacionPublico,
  formulario: FormData,
): Promise<EstadoPreparacionPublico> {
  await requerirAdmin();
  const frase = "PREPARAR PARA PUBLICO REAL";
  if (
    String(formulario.get("confirmacionUno") ?? "").trim() !== frase
    || String(formulario.get("confirmacionDos") ?? "").trim() !== frase
  ) {
    return { tipo: "error", mensaje: "Las dos confirmaciones deben coincidir con la frase indicada." };
  }

  const [participantes, recuerdos, evidencias] = await Promise.all([
    db.participante.findMany({ select: { urlFoto: true } }),
    db.recuerdo.findMany({ select: { urlFoto: true, urlMiniatura: true } }),
    db.completitud.findMany({ where: { urlEvidencia: { not: null } }, select: { urlEvidencia: true } }),
  ]);
  const archivos = [...new Set([
    ...participantes.map(({ urlFoto }) => urlFoto),
    ...recuerdos.flatMap(({ urlFoto, urlMiniatura }) => [urlFoto, urlMiniatura]),
    ...evidencias.map(({ urlEvidencia }) => urlEvidencia!),
  ].filter((url) => url.startsWith("/uploads/")))];

  const eliminados = await db.$transaction(async (tx) => {
    const reacciones = await tx.reaccionRecuerdo.deleteMany();
    const recuerdosEliminados = await tx.recuerdo.deleteMany();
    const completitudes = await tx.completitud.deleteMany();
    const ajustes = await tx.ajustePuntos.deleteMany();
    const sesiones = await tx.sesionParticipante.deleteMany();
    const participantesEliminados = await tx.participante.deleteMany();
    return {
      participantes: participantesEliminados.count,
      sesiones: sesiones.count,
      completitudes: completitudes.count,
      ajustes: ajustes.count,
      recuerdos: recuerdosEliminados.count,
      reacciones: reacciones.count,
    };
  });

  let archivosEliminados = 0;
  let archivosConError = 0;
  for (let indice = 0; indice < archivos.length; indice += 10) {
    const lote = await Promise.allSettled(
      archivos.slice(indice, indice + 10).map((url) => storage.eliminar(url)),
    );
    archivosEliminados += lote.filter(({ status }) => status === "fulfilled").length;
    archivosConError += lote.filter(({ status }) => status === "rejected").length;
  }

  anunciarCambio("purga");
  revalidatePath("/", "layout");
  return {
    tipo: "exito",
    mensaje: archivosConError
      ? `Los datos de prueba fueron eliminados. ${archivosConError} archivo(s) no pudieron borrarse del almacenamiento; puedes usar la limpieza de archivos huérfanos.`
      : "La aplicación quedó lista para registrar al público real.",
    eliminados: {
      ...eliminados,
      archivos: archivosEliminados,
      archivosConError,
    },
  };
}
