import { calcularPuntajeEquipo } from "@/lib/puntos";
import { db } from "@/lib/db";

export async function obtenerRankingEquipos() {
  const configuracion = await db.configuracionEvento.findUniqueOrThrow({
    where: { id: "evento" },
  });
  const grupos = await db.grupo.findMany({
    where: { activo: true },
    orderBy: { orden: "asc" },
    include: {
      participantes: {
        select: { puntosTotales: true, activo: true, id: true, urlFoto: true },
      },
    },
  });
  return grupos
    .map((grupo) => ({
      ...grupo,
      integrantes: grupo.participantes.filter((p) => p.activo).length,
      puntaje: calcularPuntajeEquipo(
        grupo.participantes,
        configuracion.metodoPuntajeEquipo,
      ),
    }))
    .sort((a, b) => b.puntaje - a.puntaje || a.orden - b.orden);
}

export function sugerirRebalanceo(
  grupos: { id: string; nombre: string; integrantes: { id: string; nombre: string }[] }[],
) {
  const copia = grupos.map((grupo) => ({
    ...grupo,
    integrantes: [...grupo.integrantes],
  }));
  const movimientos: { participanteId: string; nombre: string; desde: string; hacia: string }[] = [];
  while (copia.length > 1) {
    copia.sort((a, b) => b.integrantes.length - a.integrantes.length);
    const mayor = copia[0];
    const menor = copia[copia.length - 1];
    if (mayor.integrantes.length - menor.integrantes.length <= 1) break;
    const persona = mayor.integrantes.pop();
    if (!persona) break;
    menor.integrantes.push(persona);
    movimientos.push({
      participanteId: persona.id,
      nombre: persona.nombre,
      desde: mayor.nombre,
      hacia: menor.nombre,
    });
  }
  return movimientos;
}
