import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { configuracionPuntualidadDesafio, configuracionPuntualidadDesdeValor, esDesafioPuntualidad, fechaHoraPuntualidadLegible } from "@/lib/puntualidad";
import { datosQrPuntualidad } from "@/lib/puntualidad-qr";
import { obtenerSeguimientoDesafio } from "@/lib/seguimiento-desafio";
import { MarcoProyeccion } from "@/components/proyeccion/MarcoProyeccion";
import { QrPuntualidadDinamico } from "@/components/proyeccion/QrPuntualidadDinamico";
import { SeguimientoDesafioEnVivo } from "@/components/proyeccion/SeguimientoDesafioEnVivo";

export const dynamic = "force-dynamic";

export default async function ProyeccionPuntualidad({ params }: { params: Promise<{ id: string }> }) {
  await requerirAdmin();
  const { id } = await params;
  const desafio = await db.desafio.findUnique({
    where: { id },
    include: { completitudes: { orderBy: { completadoEn: "desc" }, take: 5, select: { respuesta: true } } },
  });
  if (!desafio) notFound();
  const guardada = configuracionPuntualidadDesdeValor(desafio.configuracion);
  const puntualidad = configuracionPuntualidadDesafio(desafio.configuracion, desafio.completitudes);
  if (!esDesafioPuntualidad(desafio)) notFound();
  if (puntualidad && !guardada) {
    await db.desafio.update({ where: { id }, data: { configuracion: puntualidad } });
  }
  const seguimiento = await obtenerSeguimientoDesafio(id);
  if (!seguimiento) notFound();
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
      <div className="grid h-full min-h-0 gap-[clamp(10px,1.2vw,20px)] lg:grid-cols-[minmax(270px,.62fr)_minmax(0,1.7fr)]">
        <QrPuntualidadDinamico
          desafioId={desafio.id}
          inicial={{ qr, vigenciaMs: datos.vigenciaMs }}
          hora={puntualidad ? fechaHoraPuntualidadLegible(puntualidad) : "Acceso habilitado únicamente con el QR dinámico"}
          compacto
        />
        <SeguimientoDesafioEnVivo inicial={seguimiento} compacto />
      </div>
    </MarcoProyeccion>
  );
}
