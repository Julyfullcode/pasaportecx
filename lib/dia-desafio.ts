export const DIA_TODO_EL_TIEMPO = 0;

export function etiquetaDiaDesafio(dia: number) {
  return dia === DIA_TODO_EL_TIEMPO ? "Todo el tiempo" : `Día ${dia}`;
}

export function diasVisiblesEn(dia: 1 | 2) {
  return [DIA_TODO_EL_TIEMPO, dia];
}
