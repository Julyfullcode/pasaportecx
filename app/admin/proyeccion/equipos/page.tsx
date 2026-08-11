import { requerirAdmin } from "@/lib/auth";
import { consultarEquiposProyeccion } from "@/lib/equipos-proyeccion";
import { MarcoProyeccion } from "@/components/proyeccion/MarcoProyeccion";
import { EquiposIntegrantes } from "@/components/proyeccion/EquiposIntegrantes";

export const dynamic = "force-dynamic";

export default async function ProyeccionEquipos() {
  await requerirAdmin();
  const equipos = await consultarEquiposProyeccion();
  return (
    <MarcoProyeccion primera="Equipos que" segunda="nos conectan">
      <EquiposIntegrantes inicial={equipos} />
    </MarcoProyeccion>
  );
}