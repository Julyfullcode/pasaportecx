import { db } from "@/lib/db";

const CARPETAS_GESTIONADAS = new Set([
  "agenda-dias",
  "agenda",
  "empresas",
  "evidencias",
  "expositores",
  "miniaturas",
  "perfiles",
  "recuerdos",
]);

type ObjetoStorage = {
  nombre: string;
  bytes: bigint | number | string;
  creadoEn: Date | string;
};

type Referencias = {
  participantes: { urlFoto: string }[];
  recuerdos: { urlFoto: string; urlMiniatura: string }[];
  completitudes: { urlEvidencia: string | null }[];
  empresas: { urlLogo: string | null }[];
  fotosAgenda: { urlFoto: string }[];
  momentosAgenda: { urlFotoExpositor: string | null }[];
  desafios: { urlImagen: string | null }[];
  configuracion: { urlAgendaPdf: string | null }[];
};

function rutaStorage(url: string | null | undefined) {
  return url?.startsWith("/uploads/") ? url.slice("/uploads/".length) : null;
}

export function analizarObjetosAlmacenamiento(
  objetos: ObjetoStorage[],
  referencias: Referencias,
  limiteBytes = 1024 ** 3,
) {
  const usadas = new Set<string>();
  const agregar = (url: string | null | undefined) => {
    const ruta = rutaStorage(url);
    if (ruta) usadas.add(ruta);
  };
  referencias.participantes.forEach((item) => agregar(item.urlFoto));
  referencias.recuerdos.forEach((item) => {
    agregar(item.urlFoto);
    agregar(item.urlMiniatura);
  });
  referencias.completitudes.forEach((item) => agregar(item.urlEvidencia));
  referencias.empresas.forEach((item) => agregar(item.urlLogo));
  referencias.fotosAgenda.forEach((item) => agregar(item.urlFoto));
  referencias.momentosAgenda.forEach((item) => agregar(item.urlFotoExpositor));
  referencias.desafios.forEach((item) => agregar(item.urlImagen));
  referencias.configuracion.forEach((item) => agregar(item.urlAgendaPdf));

  const ahora = Date.now();
  const graciaMs = 24 * 60 * 60 * 1000;
  const carpetas = new Map<string, { archivos: number; bytes: number }>();
  const huerfanos: string[] = [];
  let bytesTotales = 0;
  let bytesHuerfanos = 0;

  for (const objeto of objetos) {
    const bytes = Number(objeto.bytes) || 0;
    const carpeta = objeto.nombre.split("/")[0] || "otros";
    bytesTotales += bytes;
    const actual = carpetas.get(carpeta) ?? { archivos: 0, bytes: 0 };
    actual.archivos += 1;
    actual.bytes += bytes;
    carpetas.set(carpeta, actual);

    const antiguedadSuficiente = ahora - new Date(objeto.creadoEn).getTime() >= graciaMs;
    if (!usadas.has(objeto.nombre) && CARPETAS_GESTIONADAS.has(carpeta) && antiguedadSuficiente) {
      huerfanos.push(objeto.nombre);
      bytesHuerfanos += bytes;
    }
  }

  return {
    disponible: true as const,
    archivos: objetos.length,
    bytesTotales,
    limiteBytes,
    porcentaje: limiteBytes > 0 ? Math.min(100, (bytesTotales / limiteBytes) * 100) : 0,
    carpetas: [...carpetas.entries()]
      .map(([nombre, datos]) => ({ nombre, ...datos }))
      .sort((a, b) => b.bytes - a.bytes),
    huerfanos,
    bytesHuerfanos,
  };
}

export async function obtenerReporteAlmacenamiento() {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!bucket || process.env.STORAGE_DRIVER?.toLowerCase() !== "supabase") {
    return { disponible: false as const, motivo: "El reporte estará disponible en producción con Supabase Storage." };
  }

  try {
    const [objetos, participantes, recuerdos, completitudes, empresas, fotosAgenda, momentosAgenda, desafios, configuracion] = await Promise.all([
      db.$queryRawUnsafe<ObjetoStorage[]>(
        `SELECT name AS "nombre", COALESCE((metadata->>'size')::bigint, 0) AS "bytes", created_at AS "creadoEn"
         FROM storage.objects
         WHERE bucket_id = $1
         ORDER BY created_at ASC`,
        bucket,
      ),
      db.participante.findMany({ select: { urlFoto: true } }),
      db.recuerdo.findMany({ select: { urlFoto: true, urlMiniatura: true } }),
      db.completitud.findMany({ select: { urlEvidencia: true } }),
      db.empresa.findMany({ select: { urlLogo: true } }),
      db.fotoDiaAgenda.findMany({ select: { urlFoto: true } }),
      db.momentoAgenda.findMany({ select: { urlFotoExpositor: true } }),
      db.desafio.findMany({ select: { urlImagen: true } }),
      db.configuracionEvento.findMany({ select: { urlAgendaPdf: true } }),
    ]);
    const limiteConfigurado = Number(process.env.SUPABASE_STORAGE_LIMIT_BYTES);
    return analizarObjetosAlmacenamiento(
      objetos,
      { participantes, recuerdos, completitudes, empresas, fotosAgenda, momentosAgenda, desafios, configuracion },
      Number.isFinite(limiteConfigurado) && limiteConfigurado > 0 ? limiteConfigurado : 1024 ** 3,
    );
  } catch (error) {
    console.error("No se pudo calcular el uso de Supabase Storage", error);
    return { disponible: false as const, motivo: "No pudimos consultar el uso del almacenamiento en este momento." };
  }
}
