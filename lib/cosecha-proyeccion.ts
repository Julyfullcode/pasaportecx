import { db } from "@/lib/db";
import { CODIGO_DESAFIO_CIERRE, esRespuestasCosecha } from "@/lib/cosecha-config";

export type TarjetaCierreProyeccion = {
  id: string;
  completadoEn: string;
  respuestas: {
    meLlevo: string;
    agradezco: string;
    activo: string;
  };
  participante: {
    nombre: string;
    urlFoto: string;
    empresa: { nombre: string };
  };
};

export async function obtenerTarjetasCierre(): Promise<TarjetaCierreProyeccion[]> {
  const completitudes = await db.completitud.findMany({
    where: {
      estado: "APROBADO",
      desafio: { codigoQr: CODIGO_DESAFIO_CIERRE },
    },
    orderBy: { completadoEn: "desc" },
    select: {
      id: true,
      completadoEn: true,
      respuesta: true,
      participante: {
        select: {
          nombre: true,
          urlFoto: true,
          empresa: { select: { nombre: true } },
        },
      },
    },
  });
  return completitudes.flatMap((completitud) => (
    esRespuestasCosecha(completitud.respuesta)
      ? [{
        id: completitud.id,
        completadoEn: completitud.completadoEn.toISOString(),
        respuestas: completitud.respuesta,
        participante: completitud.participante,
      }]
      : []
  ));
}
