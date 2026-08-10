import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { configuracionPuntualidadDesdeValor, fechaHoraPuntualidadLegible } from "@/lib/puntualidad";
import { datosQrPuntualidad } from "@/lib/puntualidad-qr";
import { MarcoProyeccion } from "@/components/proyeccion/MarcoProyeccion";
import { QrPuntualidadDinamico } from "@/components/proyeccion/QrPuntualidadDinamico";

export const dynamic = "force-dynamic";

export default async function ProyeccionPuntualidad({ params }: { params: Promise<{ id: string }> }) {
  await requerirAdmin();
  const { id } = await params;
  const desafio = await db.desafio.findUnique({ where: { id } });
  if (!desafio) notFound();
  const puntualidad = configuracionPuntualidadDesdeValor(desafio.configuracion);
  if (!puntualidad) notFound();
  const origen = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const datos = datosQrPuntualidad(desafio.codigoQr, origen);
  const qr = await QRCode.toDataURL(datos.url, {
    width: 1200,
    margin: 2,
    color: { dark: "#0B3B60", light: "#FFFFFF" },
    errorCorrectionLevel: "H",
  });
  return (
    <MarcoProyeccion primera="Llegada a tiempo" segunda={desafio.titulo}>
      <QrPuntualidadDinamico
        desafioId={desafio.id}
        inicial={{ qr, vigenciaMs: datos.vigenciaMs }}
        hora={fechaHoraPuntualidadLegible(puntualidad)}
      />
    </MarcoProyeccion>
  );
}
