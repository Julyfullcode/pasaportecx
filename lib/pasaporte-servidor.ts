import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { db } from "@/lib/db";
import { generarPasaportePdf } from "@/lib/pasaporte";
import { storage } from "@/lib/storage";

type ParticipantePasaporte = {
  nombre: string;
  urlFoto: string;
  codigoRecuperacion: string;
  empresa: { nombre: string };
  equipo?: { nombre: string } | null;
};

export async function crearPasaporteParticipante(participante: ParticipantePasaporte, origenSolicitud: string) {
  const config = await db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } });
  const [logo, foto, fuenteRegular, fuenteSemibold] = await Promise.all([
    readFile(join(process.cwd(), "public", "marca", "logo-grupo-epm-blanco.png")).catch(() => undefined),
    participante.urlFoto.startsWith("/uploads/")
      ? storage.leer(participante.urlFoto)
        .then((imagen) => sharp(imagen).rotate().resize(420, 420, { fit: "cover", position: "centre" }).png().toBuffer())
        .catch(() => undefined)
      : Promise.resolve(undefined),
    readFile(join(process.cwd(), "public", "fuentes", "Poppins-Regular.ttf")).catch(() => undefined),
    readFile(join(process.cwd(), "public", "fuentes", "Poppins-SemiBold.ttf")).catch(() => undefined),
  ]);
  const baseAplicacion = (process.env.NEXT_PUBLIC_APP_URL || origenSolicitud).replace(/\/$/, "");
  const pdf = await generarPasaportePdf({
    nombre: participante.nombre,
    empresa: participante.empresa.nombre,
    equipo: participante.equipo?.nombre,
    evento: config.nombreEvento,
    codigo: participante.codigoRecuperacion,
    urlRecuperacion: `${baseAplicacion}/recuperar/${participante.codigoRecuperacion}`,
    urlAplicacion: `${baseAplicacion}/`,
    appleWalletUrl: `${baseAplicacion}/wallet?plataforma=apple`,
    googleWalletUrl: `${baseAplicacion}/wallet?plataforma=google`,
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
