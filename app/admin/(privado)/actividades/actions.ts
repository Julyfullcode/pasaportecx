"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { anunciarCambio } from "@/lib/eventos";
import { idsRespuestasCorrectas, leerConfiguracionActividad, preguntasDe } from "@/lib/actividad";
import { recalcularPuntosParticipante } from "@/lib/puntos";

function refrescar(id: string) {
  revalidatePath("/admin/actividades");
  revalidatePath(`/admin/actividades/${id}`);
  revalidatePath(`/admin/actividades/${id}/moderar`);
  revalidatePath("/actividades");
  revalidatePath(`/actividades/${id}`);
  anunciarCambio("actividades");
}

export async function guardarActividad(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  const titulo = String(formulario.get("titulo") ?? "").trim();
  const invitacion = String(formulario.get("invitacion") ?? "").trim();
  const cierre = String(formulario.get("cierre") ?? "").trim();
  const puntosHabilitados = formulario.get("puntosHabilitados") === "on";
  const puntos = Number(formulario.get("puntos") ?? 0);
  let configuracion: unknown;
  try {
    configuracion = JSON.parse(String(formulario.get("configuracion") ?? ""));
  } catch {
    throw new Error("La configuración de preguntas no es válida.");
  }
  const configuracionValida = leerConfiguracionActividad(configuracion);
  if (!id || !titulo || !invitacion || !cierre || !configuracionValida) throw new Error("Completa todos los campos de la actividad.");
  if (configuracionValida.preguntas.some((pregunta) => pregunta.tipo === "OPCION_UNICA" && idsRespuestasCorrectas(pregunta).length === 0)) {
    throw new Error("Marca al menos una respuesta correcta en cada pregunta de opciones.");
  }
  if (!Number.isInteger(puntos) || puntos < 0 || puntos > 10000) throw new Error("Configura una cantidad de puntos válida.");
  const actividad = await db.actividad.findUniqueOrThrow({ where: { id }, select: { estado: true, _count: { select: { respuestas: true } } } });
  if (actividad.estado === "PUBLICADA") throw new Error("Pausa la actividad antes de modificarla.");
  if (actividad._count.respuestas > 0) throw new Error("Reinicia las respuestas antes de cambiar las preguntas.");
  await db.actividad.update({
    where: { id },
    data: {
      titulo,
      invitacion,
      cierre,
      puntosHabilitados,
      puntos,
      configuracion: configuracionValida as unknown as Prisma.InputJsonValue,
    },
  });
  refrescar(id);
}

export async function publicarActividad(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  await db.actividad.update({ where: { id }, data: { estado: "PUBLICADA", pasoActual: 0 } });
  refrescar(id);
}

export async function avanzarActividad(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  await db.$transaction(async (tx) => {
    const actividad = await tx.actividad.findUniqueOrThrow({ where: { id } });
    if (actividad.estado !== "PUBLICADA") throw new Error("La actividad debe estar publicada.");
    const maximo = preguntasDe(actividad.configuracion).length + 1;
    await tx.actividad.update({ where: { id }, data: { pasoActual: Math.min(actividad.pasoActual + 1, maximo) } });
  });
  refrescar(id);
}

export async function retrocederActividad(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  await db.$transaction(async (tx) => {
    const actividad = await tx.actividad.findUniqueOrThrow({ where: { id }, select: { pasoActual: true } });
    await tx.actividad.update({ where: { id }, data: { pasoActual: Math.max(0, actividad.pasoActual - 1) } });
  });
  refrescar(id);
}

export async function cerrarActividad(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  await db.actividad.update({ where: { id }, data: { estado: "CERRADA" } });
  refrescar(id);
}

export async function reiniciarActividad(formulario: FormData) {
  await requerirAdmin();
  const id = String(formulario.get("id") ?? "");
  const participaciones = await db.participacionActividad.findMany({ where: { actividadId: id }, select: { participanteId: true } });
  await db.$transaction(async (tx) => {
    await tx.respuestaActividad.deleteMany({ where: { actividadId: id } });
    await tx.resultadoJuegoActividad.deleteMany({ where: { actividadId: id } });
    await tx.participacionActividad.deleteMany({ where: { actividadId: id } });
    await tx.actividad.update({ where: { id }, data: { estado: "BORRADOR", pasoActual: 0 } });
    for (const { participanteId } of participaciones) await recalcularPuntosParticipante(tx, participanteId);
  });
  refrescar(id);
}
