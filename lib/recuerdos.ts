export const TIPOS_REACCION = ["CORAZON", "RISA"] as const;

export type TipoReaccionRecuerdo = (typeof TIPOS_REACCION)[number];

type ReaccionBase = {
  participanteId: string;
  tipo: string;
};

export function resumirReacciones(reacciones: ReaccionBase[], participanteId: string) {
  const corazon = reacciones.filter((reaccion) => reaccion.tipo === "CORAZON").length;
  const risa = reacciones.filter((reaccion) => reaccion.tipo === "RISA").length;
  const mias = TIPOS_REACCION.filter((tipo) =>
    reacciones.some((reaccion) => reaccion.participanteId === participanteId && reaccion.tipo === tipo),
  );
  return { corazon, risa, total: corazon + risa, mias };
}

export function presentarRecuerdo<T extends { reacciones: ReaccionBase[] }>(
  recuerdo: T,
  participanteId: string,
) {
  const { reacciones, ...datos } = recuerdo;
  return { ...datos, reacciones: resumirReacciones(reacciones, participanteId) };
}
