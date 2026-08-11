"use client";

type FuenteImagen = {
  imagen: CanvasImageSource;
  ancho: number;
  alto: number;
  cerrar: () => void;
};

async function abrirImagen(archivo: File): Promise<FuenteImagen> {
  if (typeof createImageBitmap === "function") {
    try {
      const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
      return { imagen, ancho: imagen.width, alto: imagen.height, cerrar: () => imagen.close() };
    } catch {
      // Algunos navegadores no decodifican aquí formatos que sí muestran en <img>.
    }
  }
  const url = URL.createObjectURL(archivo);
  const imagen = new Image();
  imagen.decoding = "async";
  imagen.src = url;
  try {
    await imagen.decode();
    return {
      imagen,
      ancho: imagen.naturalWidth,
      alto: imagen.naturalHeight,
      cerrar: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function convertirImagen(
  fuente: FuenteImagen,
  maximo: number,
  calidad: number,
  formato: "image/webp" | "image/jpeg",
) {
  const escala = Math.min(1, maximo / Math.max(fuente.ancho, fuente.alto));
  const ancho = Math.max(1, Math.round(fuente.ancho * escala));
  const alto = Math.max(1, Math.round(fuente.alto * escala));
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const contexto = lienzo.getContext("2d");
  if (!contexto) throw new Error("Tu navegador no permite procesar la imagen");
  contexto.drawImage(fuente.imagen, 0, 0, ancho, alto);
  return new Promise<Blob>((resolve, reject) =>
    lienzo.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir la foto"))),
      formato,
      calidad,
    ),
  );
}

export async function comprimirImagen(
  archivo: File,
  maximo: number,
  calidad = 0.76,
  formato: "image/webp" | "image/jpeg" = "image/webp",
): Promise<Blob> {
  const fuente = await abrirImagen(archivo);
  try {
    return await convertirImagen(fuente, maximo, calidad, formato);
  } finally {
    fuente.cerrar();
  }
}

export async function comprimirImagenHasta(
  archivo: File,
  maximo: number,
  maxBytes: number,
  calidadInicial = 0.78,
): Promise<Blob> {
  const fuente = await abrirImagen(archivo);
  let calidad = calidadInicial;
  let dimension = maximo;
  let formato: "image/webp" | "image/jpeg" = "image/webp";
  try {
    let resultado = await convertirImagen(fuente, dimension, calidad, formato);
    // Si el navegador no codifica WebP, JPEG evita que Canvas devuelva un PNG enorme.
    if (resultado.type && resultado.type !== formato) {
      formato = "image/jpeg";
      resultado = await convertirImagen(fuente, dimension, calidad, formato);
    }
    for (let intento = 0; resultado.size > maxBytes && intento < 20; intento += 1) {
      if (calidad > 0.4) {
        calidad = Math.max(0.36, calidad - 0.08);
      } else if (dimension > 320) {
        dimension = Math.max(320, Math.floor(dimension * 0.8));
        calidad = 0.68;
      } else {
        calidad = Math.max(0.2, calidad - 0.05);
      }
      resultado = await convertirImagen(fuente, dimension, calidad, formato);
    }
    if (resultado.size > maxBytes) {
      throw new Error("No pudimos optimizar esta foto. Intenta seleccionarla nuevamente.");
    }
    return resultado;
  } finally {
    fuente.cerrar();
  }
}
