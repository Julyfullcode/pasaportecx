const EXTENSIONES_IMAGEN: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extensionImagen(tipo: string) {
  return EXTENSIONES_IMAGEN[tipo] ?? null;
}
