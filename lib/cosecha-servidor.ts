import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { CODIGO_DESAFIO_CIERRE, esRespuestasCosecha } from "@/lib/cosecha-config";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { generarTarjetaCosechaPdf } from "@/lib/tarjeta-cosecha";

type ParticipanteCosecha = {
  id: string;
};

export async function crearTarjetaCosechaParticipante(
  participante: ParticipanteCosecha,
  completitudId?: string,
) {
  const completitud = await db.completitud.findFirst({
    where: {
      participanteId: participante.id,
      desafio: { codigoQr: CODIGO_DESAFIO_CIERRE },
      ...(completitudId ? { id: completitudId } : {}),
    },
    include: { participante: { include: { empresa: true } } },
  });
  if (!completitud || !esRespuestasCosecha(completitud.respuesta)) return null;
  const propietario = completitud.participante;

  const [config, logo, foto, fuenteRegular, fuenteSemibold] = await Promise.all([
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" }, select: { nombreEvento: true } }),
    readFile(join(process.cwd(), "public", "marca", "logo-grupo-epm-blanco.png")).catch(() => undefined),
    propietario.urlFoto.startsWith("/uploads/")
      ? storage.leer(propietario.urlFoto)
        .then((imagen) => sharp(imagen).rotate().resize(420, 420, { fit: "cover", position: "centre" }).png().toBuffer())
        .catch(() => undefined)
      : Promise.resolve(undefined),
    readFile(join(process.cwd(), "public", "fuentes", "Poppins-Regular.ttf")).catch(() => undefined),
    readFile(join(process.cwd(), "public", "fuentes", "Poppins-SemiBold.ttf")).catch(() => undefined),
  ]);
  const pdf = await generarTarjetaCosechaPdf({
    nombre: propietario.nombre,
    empresa: propietario.empresa.nombre,
    evento: config.nombreEvento,
    respuestas: completitud.respuesta,
    logo,
    foto,
    fuenteRegular,
    fuenteSemibold,
  });
  const nombreSeguro = propietario.nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return { pdf, nombreSeguro, completitudId: completitud.id };
}
