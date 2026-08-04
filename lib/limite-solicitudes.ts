import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";

type OpcionesLimite = {
  accion: string;
  limite: number;
  ventanaSegundos: number;
  request?: Request;
};

function primerValor(valor: string | null) {
  return valor?.split(",")[0]?.trim() || "sin-ip";
}

export async function consumirLimite({ accion, limite, ventanaSegundos, request }: OpcionesLimite) {
  const encabezados = request?.headers ?? (await headers());
  const ip = primerValor(encabezados.get("x-forwarded-for") ?? encabezados.get("x-real-ip"));
  const secreto = process.env.AUTH_SECRET ?? "pasaporte-cx-desarrollo";
  const claveHash = createHash("sha256").update(`${secreto}:${ip}`).digest("hex");
  const ahora = new Date();
  const ventanaMs = ventanaSegundos * 1000;
  const ventana = new Date(Math.floor(ahora.getTime() / ventanaMs) * ventanaMs);
  const expiraEn = new Date(ventana.getTime() + ventanaMs * 2);

  const registro = await db.limiteSolicitud.upsert({
    where: { accion_claveHash_ventana: { accion, claveHash, ventana } },
    update: { cantidad: { increment: 1 }, expiraEn },
    create: { accion, claveHash, ventana, cantidad: 1, expiraEn },
  });

  if (registro.cantidad === 1) {
    await db.limiteSolicitud.deleteMany({ where: { expiraEn: { lt: ahora } } });
  }

  return {
    permitido: registro.cantidad <= limite,
    restantes: Math.max(0, limite - registro.cantidad),
    reintentarEn: Math.max(1, Math.ceil((ventana.getTime() + ventanaMs - ahora.getTime()) / 1000)),
  };
}
