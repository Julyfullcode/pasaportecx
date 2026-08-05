import { z } from "zod";

export const correoElectronicoSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "El correo electrónico es demasiado largo.")
  .email("Escribe un correo electrónico válido.");

export function normalizarCorreo(correo: string) {
  return correo.trim().toLowerCase();
}

export function clasificarCorreos(valor: string) {
  const candidatos = [...new Set(
    valor
      .split(/[\s,;]+/)
      .map(normalizarCorreo)
      .filter(Boolean),
  )].slice(0, 1_000);
  const validos: string[] = [];
  const invalidos: string[] = [];
  for (const candidato of candidatos) {
    const resultado = correoElectronicoSchema.safeParse(candidato);
    if (resultado.success) validos.push(resultado.data);
    else invalidos.push(candidato);
  }
  return { validos, invalidos };
}
