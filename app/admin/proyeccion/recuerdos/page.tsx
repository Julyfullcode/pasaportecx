import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { MarcoProyeccion } from "@/components/proyeccion/MarcoProyeccion";
import { MuroRecuerdosProyeccion } from "@/components/proyeccion/MuroRecuerdos";

export const dynamic = "force-dynamic";

export default async function ProyeccionRecuerdos() {
  await requerirAdmin();
  const recuerdos = await db.recuerdo.findMany({
    where: { visible: true, pendiente: false, reportado: false },
    orderBy: [{ reacciones: { _count: "desc" } }, { creadoEn: "desc" }],
    take: 20,
    select: {
      id: true,
      urlFoto: true,
      descripcion: true,
      participante: { select: { nombre: true, urlFoto: true } },
      reacciones: { select: { tipo: true } },
    },
  });
  return <MarcoProyeccion primera="Momentos que" segunda="nos conectan"><MuroRecuerdosProyeccion inicial={recuerdos} /></MarcoProyeccion>;
}
