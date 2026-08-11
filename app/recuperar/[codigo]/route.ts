import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { crearSesionParticipante } from "@/lib/auth";
import { consumirLimite } from "@/lib/limite-solicitudes";
function urlPublica(request: Request, ruta: string) {
  const urlSolicitud = new URL(request.url);
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
    || request.headers.get("host")?.trim();
  const protocolo = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
    || urlSolicitud.protocol.replace(":", "");
  const origen = host ? `${protocolo}://${host}` : urlSolicitud.origin;
  return new URL(ruta, `${origen.replace(/\/$/, "")}/`);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const limite = await consumirLimite({
    accion: "recuperar-sesion-qr",
    limite: 60,
    ventanaSegundos: 60,
    request,
  });
  if (!limite.permitido) {
    return NextResponse.redirect(urlPublica(request, "/registro?recuperacion=limite"), 303);
  }

  const { codigo } = await params;
  const participante = await db.participante.findUnique({
    where: { codigoRecuperacion: codigo.trim().toUpperCase() },
    select: { id: true, activo: true },
  });
  if (!participante?.activo) {
    return NextResponse.redirect(urlPublica(request, "/registro?recuperacion=invalida"), 303);
  }

  await crearSesionParticipante(participante.id);
  return NextResponse.redirect(urlPublica(request, "/"), 303);
}