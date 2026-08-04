import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { MarcoProyeccion } from "@/components/proyeccion/MarcoProyeccion";
import { Podio } from "@/components/proyeccion/Podio";

export const dynamic = "force-dynamic";

export default async function ProyeccionPodio() {
  await requerirAdmin();
  const [configuracion, personas] = await Promise.all([
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } }),
    db.participante.findMany({
      where: { activo: true },
      orderBy: [{ puntosTotales: "desc" }, { creadoEn: "asc" }],
      select: {
        id: true,
        nombre: true,
        urlFoto: true,
        puntosTotales: true,
        empresa: { select: { nombre: true, urlLogo: true } },
      },
    }),
  ]);
  return <MarcoProyeccion primera="Personas que" segunda="dejan huella"><Podio inicial={personas} tamano={configuracion.tamanoPodioIndividual} /></MarcoProyeccion>;
}
