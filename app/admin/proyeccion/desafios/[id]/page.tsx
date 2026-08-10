import { notFound, redirect } from "next/navigation";
import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { esDesafioPuntualidad } from "@/lib/puntualidad";
import { obtenerSeguimientoDesafio } from "@/lib/seguimiento-desafio";
import { MarcoProyeccion } from "@/components/proyeccion/MarcoProyeccion";
import { SeguimientoDesafioEnVivo } from "@/components/proyeccion/SeguimientoDesafioEnVivo";

export const dynamic = "force-dynamic";

export default async function ProyeccionSeguimientoDesafio({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requerirAdmin();
  const { id } = await params;
  const desafio = await db.desafio.findUnique({
    where: { id },
    select: {
      titulo: true,
      configuracion: true,
      completitudes: { orderBy: { completadoEn: "desc" }, take: 5, select: { respuesta: true } },
    },
  });
  if (!desafio) notFound();
  if (esDesafioPuntualidad(desafio)) redirect(`/admin/proyeccion/puntualidad/${id}`);
  const seguimiento = await obtenerSeguimientoDesafio(id);
  if (!seguimiento) notFound();

  return (
    <MarcoProyeccion primera="Así avanza" segunda={seguimiento.desafio.titulo}>
      <SeguimientoDesafioEnVivo inicial={seguimiento} />
    </MarcoProyeccion>
  );
}
