export const DIA_PERMANENTE = 0;

export function etiquetaDiaDesafio(dia: number) {
  return dia === DIA_PERMANENTE ? "Permanente" : `Día ${dia}`;
}
