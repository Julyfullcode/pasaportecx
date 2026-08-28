"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { anunciarCambio } from "@/lib/eventos";
import { leerConfiguracionUniverso, TIPO_UNIVERSO_ARQUETIPOS } from "@/lib/universo-arquetipos";

export async function guardarRetosUniverso(formulario: FormData) {
  await requerirAdmin(); const id = String(formulario.get("id") ?? "");
  let valor: unknown; try { valor = JSON.parse(String(formulario.get("configuracion") ?? "")); } catch { throw new Error("La configuración no es válida."); }
  const configuracion = leerConfiguracionUniverso(valor); if (!configuracion) throw new Error("Revisa los títulos, consignas y puntos de los retos.");
  const actividad = await db.actividad.findUniqueOrThrow({ where: { id }, select: { tipo: true } }); if (actividad.tipo !== TIPO_UNIVERSO_ARQUETIPOS) throw new Error("Esta actividad no corresponde al universo de arquetipos.");
  await db.actividad.update({ where: { id }, data: { configuracion: configuracion as unknown as Prisma.InputJsonValue } });
  revalidatePath(`/admin/actividades/${id}`); revalidatePath("/universo"); anunciarCambio("universo");
}
