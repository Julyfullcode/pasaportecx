"use server";

import { redirect } from "next/navigation";
import { codigoResumenCorrecto, concederAccesoResumen } from "@/lib/acceso-resumen";

export async function ingresarPresentacionResumen(formulario: FormData) {
  const codigo = String(formulario.get("codigo") ?? "");
  if (!codigoResumenCorrecto(codigo)) redirect("/admin/proyeccion/resumen?error=codigo");
  await concederAccesoResumen();
  redirect("/admin/proyeccion/resumen/presentacion");
}
