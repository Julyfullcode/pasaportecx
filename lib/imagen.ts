"use client";

export async function comprimirImagen(
  archivo: File,
  maximo: number,
  calidad = 0.76,
  formato: "image/webp" | "image/jpeg" = "image/webp",
): Promise<Blob> {
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, maximo / Math.max(imagen.width, imagen.height));
  const ancho = Math.max(1, Math.round(imagen.width * escala));
  const alto = Math.max(1, Math.round(imagen.height * escala));
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const contexto = lienzo.getContext("2d");
  if (!contexto) throw new Error("Tu navegador no permite procesar la imagen");
  contexto.drawImage(imagen, 0, 0, ancho, alto);
  imagen.close();
  return new Promise((resolve, reject) =>
    lienzo.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir la foto"))),
      formato,
      calidad,
    ),
  );
}
