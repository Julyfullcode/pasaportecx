import sharp from "sharp";

export class ImagenInvalidaError extends Error {
  constructor() {
    super("El archivo no contiene una imagen válida.");
    this.name = "ImagenInvalidaError";
  }
}

export async function normalizarImagen(
  datos: Uint8Array,
  { dimensionMaxima = 1600, calidad = 82 }: { dimensionMaxima?: number; calidad?: number } = {},
) {
  try {
    const imagen = sharp(Buffer.from(datos), {
      failOn: "error",
      limitInputPixels: 100_000_000,
    });
    const metadatos = await imagen.metadata();
    if (!metadatos.width || !metadatos.height || !["jpeg", "png", "webp", "heif", "avif", "tiff", "gif"].includes(metadatos.format ?? "")) {
      throw new ImagenInvalidaError();
    }
    const buffer = await imagen
      .rotate()
      .resize({
        width: dimensionMaxima,
        height: dimensionMaxima,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: calidad, effort: 4 })
      .toBuffer();
    return { datos: new Uint8Array(buffer), extension: "webp" as const };
  } catch (error) {
    if (error instanceof ImagenInvalidaError) throw error;
    throw new ImagenInvalidaError();
  }
}
