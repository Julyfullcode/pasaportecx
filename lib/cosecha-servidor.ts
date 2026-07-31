import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { CODIGO_DESAFIO_CIERRE, FORMATO_COSECHA, esRespuestasCosecha } from "@/lib/cosecha-config";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { generarTarjetaCosechaPdf } from "@/lib/tarjeta-cosecha";

type ParticipanteCosecha = {
  id: string;
  nombre: string;
  urlFoto: string;
  empresa: { nombre: string };
  grupo: { nombre: string };
};

export async function crearTarjetaCosechaParticipante(participante: ParticipanteCosecha) {
  const completitudes = await db.completitud.findMany({
    where: { participanteId: participante.id },
    orderBy: { completadoEn: "desc" },
    include: { desafio: true },
  });
  const completitud = completitudes.find((item) => {
    const configuracion = item.desafio.configuracion as { formato?: string };
    return item.desafio.codigoQr === CODIGO_DESAFIO_CIERRE || configuracion.formato === FORMATO_COSECHA;
  });
  if (!completitud || !esRespuestasCosecha(completitud.respuesta)) return null;

  const [config, logo, foto, fuenteRegular, fuenteSemibold] = await Promise.all([
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" }, select: { nombreEvento: true } }),
    readFile(join(process.cwd(), "public", "marca", "logo-grupo-epm-blanco.png")).catch(() => undefined),
    participante.urlFoto.startsWith("/uploads/")
      ? storage.leer(participante.urlFoto)
        .then((imagen) => sharp(imagen).rotate().resize(420, 420, { fit: "cover", position: "centre" }).png().toBuffer())
        .catch(() => undefined)
      : Promise.resolve(undefined),
    readFile(join(process.cwd(), "public", "fuentes", "Poppins-Regular.ttf")).catch(() => undefined),
    readFile(join(process.cwd(), "public", "fuentes", "Poppins-SemiBold.ttf")).catch(() => undefined),
  ]);
  const pdf = await generarTarjetaCosechaPdf({
    nombre: participante.nombre,
    empresa: participante.empresa.nombre,
    equipo: participante.grupo.nombre,
    evento: config.nombreEvento,
    respuestas: completitud.respuesta,
    logo,
    foto,
    fuenteRegular,
    fuenteSemibold,
  });
  const nombreSeguro = participante.nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return { pdf, nombreSeguro };
}
