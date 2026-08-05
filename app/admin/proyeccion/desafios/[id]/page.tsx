import { notFound } from "next/navigation";
import { requerirAdmin } from "@/lib/auth";
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
  const seguimiento = await obtenerSeguimientoDesafio(id);
  if (!seguimiento) notFound();

  return (
    <MarcoProyeccion primera="Así avanza" segunda={seguimiento.desafio.titulo}>
      <SeguimientoDesafioEnVivo inicial={seguimiento} />
    </MarcoProyeccion>
  );
}
