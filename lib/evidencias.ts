export function comentarioEvidencia(respuesta: unknown) {
  if (!respuesta || typeof respuesta !== "object") return "";
  const comentario = (respuesta as Record<string, unknown>).comentario;
  return typeof comentario === "string" ? comentario.trim().slice(0, 140) : "";
}
