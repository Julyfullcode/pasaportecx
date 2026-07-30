import { calcularPuntajeEquipo } from "@/lib/puntos";
import { db } from "@/lib/db";

function consultarGrupos() {
  return db.grupo.findMany({
    where: { activo: true },
    orderBy: { orden: "asc" },
    include: {
      participantes: {
        where: { activo: true },
        select: {
          puntosTotales: true,
          activo: true,
          id: true,
          nombre: true,
          urlFoto: true,
          empresa: { select: { nombre: true, urlLogo: true } },
        },
      },
    },
  });
}

function ordenarRanking(
  grupos: Awaited<ReturnType<typeof consultarGrupos>>,
  metodo: "PROMEDIO" | "SUMA",
) {
  return grupos
    .map((grupo) => ({
      ...grupo,
      integrantes: grupo.participantes.filter((p) => p.activo).length,
      puntaje: calcularPuntajeEquipo(
        grupo.participantes,
        metodo,
      ),
    }))
    .sort((a, b) => b.puntaje - a.puntaje || a.orden - b.orden);
}

export async function obtenerRankingEquipos(metodo?: "PROMEDIO" | "SUMA") {
  const [configuracion, grupos] = await Promise.all([
    metodo ? Promise.resolve(null) : db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } }),
    consultarGrupos(),
  ]);
  return ordenarRanking(grupos, metodo ?? configuracion!.metodoPuntajeEquipo);
}

export async function obtenerRankingConConfiguracion() {
  const [configuracion, grupos] = await Promise.all([
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } }),
    consultarGrupos(),
  ]);
  return {
    configuracion,
    equipos: ordenarRanking(grupos, configuracion.metodoPuntajeEquipo),
  };
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
