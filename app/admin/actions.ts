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
  if (tipo === "ENCUESTA") return { pregunta: String(formulario.get("pregunta") ?? ""), formato: String(formulario.get("formato") ?? "texto") };
  return {};
}

export async function guardarDesafio(formulario: FormData) {
  await requerirAdmin();
  const datos = desafioSchema.parse(Object.fromEntries(formulario));
  const id = String(formulario.get("id") ?? "");
  const estado = String(formulario.get("estado") ?? "BORRADOR") as "BORRADOR" | "PUBLICADO" | "CERRADO";
  const comun = {
    ...datos,
    componenteId: datos.componenteId || null,
    esSecreto: formulario.get("esSecreto") === "on",
    estado,
    limiteCompletitudes: formulario.get("limiteCompletitudes") ? Number(formulario.get("limiteCompletitudes")) : null,
    disponibleDesde: formulario.get("disponibleDesde") ? new Date(String(formulario.get("disponibleDesde"))) : null,
    disponibleHasta: formulario.get("disponibleHasta") ? new Date(String(formulario.get("disponibleHasta"))) : null,
    configuracion: configuracionDesdeFormulario(datos.tipo, formulario),
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
  await db.$transaction(async (tx) => {
    const completitud = await tx.completitud.findUniqueOrThrow({ where: { id }, include: { desafio: true } });
    await tx.completitud.update({
      where: { id },
      data: {
        estado: decision === "aprobar" ? "APROBADO" : "RECHAZADO",
        puntosOtorgados: decision === "aprobar" ? completitud.desafio.puntos : 0,
      },
    });
    await recalcularPuntosParticipante(tx, completitud.participanteId);
  });
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
  await db.configuracionEvento.update({
    where: { id: "evento" },
    data: {
      nombreEvento: String(formulario.get("nombreEvento")),
      descripcionAgenda: String(formulario.get("descripcionAgenda") ?? "").trim().slice(0, 800),
      organizadoresAgenda: String(formulario.get("organizadoresAgenda") ?? "").trim().slice(0, 300),
      tamanoPodioIndividual: Number(formulario.get("tamanoPodioIndividual")),
      tamanoPodioEquipos: Number(formulario.get("tamanoPodioEquipos")),
      metodoPuntajeEquipo: String(formulario.get("metodoPuntajeEquipo")) as "PROMEDIO" | "SUMA",
      modoAsistentes: String(formulario.get("modoAsistentes")) as "MOSAICO" | "CARRUSEL" | "DESTACADO",
      intervaloAsistentesSegundos: Number(formulario.get("intervaloAsistentesSegundos")),
      cicloMixto: String(formulario.get("cicloMixto")),
      puntosPorRecuerdo: Number(formulario.get("puntosPorRecuerdo")),
      maxRecuerdosConPuntos: Number(formulario.get("maxRecuerdosConPuntos")),
      recuerdosRequierenAprobacion: formulario.get("recuerdosRequierenAprobacion") === "on",
      asignacionAutomatica: formulario.get("asignacionAutomatica") === "on",
    },
  });
  anunciarCambio("configuracion");
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
  const permitidas: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png" };
  const archivos = formulario.getAll("fotosDia")
    .filter((archivo): archivo is File => archivo instanceof File && archivo.size > 0);
  if (!archivos.length || archivos.some((archivo) => !permitidas[archivo.type] || archivo.size > 2_000_000)) return;
  const existentes = await db.fotoDiaAgenda.count({ where: { diaId } });
  const seleccionadas = archivos.slice(0, Math.min(2, Math.max(0, 6 - existentes)));
  if (!seleccionadas.length) return;
  const guardadas: string[] = [];
  try {
    for (const archivo of seleccionadas) {
      guardadas.push(await storage.guardar(
        new Uint8Array(await archivo.arrayBuffer()),
        permitidas[archivo.type],
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
  const extensionesPermitidas: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png" };
  if (tieneFotoNueva && (!extensionesPermitidas[foto.type] || foto.size > 2_000_000)) return;

  const existente = id
    ? await db.momentoAgenda.findUniqueOrThrow({ where: { id }, select: { urlFotoExpositor: true } })
    : null;
  const anterior = existente?.urlFotoExpositor ?? null;
  let nuevaUrl: string | null = null;
  try {
    if (tieneFotoNueva) {
      nuevaUrl = await storage.guardar(
        new Uint8Array(await foto.arrayBuffer()),
        extensionesPermitidas[foto.type],
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
    if (!(logo instanceof File) || !logo.type.startsWith("image/") || logo.size > 2_000_000) return;
    const extension = logo.type === "image/png" ? "png" : logo.type === "image/webp" ? "webp" : "jpg";
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

export async function purgarDatos(formulario: FormData) {
  await requerirAdmin();
  if (String(formulario.get("confirmacion")) !== "ELIMINAR DATOS PERSONALES") return;
  const participantes = await db.participante.findMany({ select: { id: true, urlFoto: true } });
  const recuerdos = await db.recuerdo.findMany({ select: { urlFoto: true, urlMiniatura: true } });
  await Promise.allSettled([
    ...participantes.map((p) => storage.eliminar(p.urlFoto)),
    ...recuerdos.flatMap((r) => [storage.eliminar(r.urlFoto), storage.eliminar(r.urlMiniatura)]),
  ]);
  await db.$transaction(async (tx) => {
    await tx.recuerdo.deleteMany();
    await tx.sesionParticipante.deleteMany();
    for (const persona of participantes) {
      await tx.participante.update({
        where: { id: persona.id },
        data: { nombre: `Participante ${persona.id.slice(-6)}`, urlFoto: "/marca/icono.svg", activo: false },
      });
    }
  });
  anunciarCambio("purga");
  revalidatePath("/admin");
}
