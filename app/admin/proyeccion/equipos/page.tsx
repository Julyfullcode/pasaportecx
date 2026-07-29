import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { obtenerRankingEquipos } from "@/lib/equipos";
import { MarcoProyeccion } from "@/components/proyeccion/MarcoProyeccion";
import { PodioEquipos } from "@/components/proyeccion/PodioEquipos";

export const dynamic = "force-dynamic";

export default async function ProyeccionEquipos() {
  await requerirAdmin();
  const [configuracion, equipos] = await Promise.all([
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } }),
    obtenerRankingEquipos(),
  ]);
  return <MarcoProyeccion primera="Juntos" segunda="llegamos más lejos"><PodioEquipos inicial={equipos} metodo={configuracion.metodoPuntajeEquipo} tamano={configuracion.tamanoPodioEquipos} /></MarcoProyeccion>;
}
