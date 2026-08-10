import QRCode from "qrcode";
import { adminActual } from "@/lib/auth";
import { db } from "@/lib/db";
import { esConfiguracionPuntualidad } from "@/lib/puntualidad";
import { datosQrPuntualidad } from "@/lib/puntualidad-qr";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await adminActual()) return Response.json({ error: "Debes iniciar sesión como administrador." }, { status: 401 });
  const { id } = await params;
  const desafio = await db.desafio.findUnique({ where: { id }, select: { codigoQr: true, configuracion: true } });
  if (!desafio || !esConfiguracionPuntualidad(desafio.configuracion)) {
    return Response.json({ error: "Este desafío no es de puntualidad." }, { status: 404 });
  }
  const origen = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const datos = datosQrPuntualidad(desafio.codigoQr, origen);
  const qr = await QRCode.toDataURL(datos.url, {
    width: 1200,
    margin: 2,
    color: { dark: "#0B3B60", light: "#FFFFFF" },
    errorCorrectionLevel: "H",
  });
  return Response.json({ qr, vigenciaMs: datos.vigenciaMs }, {
    headers: { "Cache-Control": "private, no-store, no-cache, max-age=0", "Vercel-CDN-Cache-Control": "no-store" },
  });
}
