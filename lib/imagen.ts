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
  try {
    let resultado = await convertirImagen(fuente, dimension, calidad, "image/webp");
    for (let intento = 0; resultado.size > maxBytes && intento < 12; intento += 1) {
      if (calidad > 0.38) {
        calidad = Math.max(0.34, calidad - 0.08);
      } else {
        dimension = Math.max(320, Math.floor(dimension * 0.8));
        calidad = 0.68;
      }
      resultado = await convertirImagen(fuente, dimension, calidad, "image/webp");
    }
    return resultado;
  } finally {
    fuente.cerrar();
  }
}
