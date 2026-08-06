export const TIPOS_REACCION = ["CORAZON", "RISA"] as const;

export type TipoReaccionRecuerdo = (typeof TIPOS_REACCION)[number];

type ReaccionBase = {
  participanteId: string;
  tipo: string;
};

export function resumirReacciones(reacciones: ReaccionBase[], participanteId: string) {
  const corazon = reacciones.filter((reaccion) => reaccion.tipo === "CORAZON").length;
  const risa = reacciones.filter((reaccion) => reaccion.tipo === "RISA").length;
  const propia = [...reacciones].reverse().find((reaccion) => reaccion.participanteId === participanteId);
  const mias = propia && TIPOS_REACCION.includes(propia.tipo as TipoReaccionRecuerdo)
    ? [propia.tipo as TipoReaccionRecuerdo]
    : [];
  return { corazon, risa, total: corazon + risa, mias };
}

export function presentarRecuerdo<T extends { reacciones: ReaccionBase[] }>(
  recuerdo: T,
  participanteId: string,
) {
  const { reacciones, ...datos } = recuerdo;
  return { ...datos, reacciones: resumirReacciones(reacciones, participanteId) };
}
