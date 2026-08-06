import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { EditorActividad } from "@/components/admin/EditorActividad";
import { db } from "@/lib/db";
import { leerConfiguracionActividad } from "@/lib/actividad";

export const dynamic = "force-dynamic";

export default async function ConfigurarActividad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actividad = await db.actividad.findUnique({ where: { id } });
  if (!actividad) notFound();
  const configuracion = leerConfiguracionActividad(actividad.configuracion);
  if (!configuracion) throw new Error("La configuración de la actividad no es válida.");
  return <div className="p-4 md:p-7"><Link href="/admin/actividades" className="inline-flex items-center gap-2 font-extrabold text-[var(--epm-azul)]"><ArrowLeft size={18} /> Volver</Link><h1 className="mt-4 text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Configurar actividad</h1><p className="mt-2 text-slate-600">Puedes editar la invitación, preguntas, opciones, insights y decidir si entrega puntos.</p><div className="mt-6"><EditorActividad actividad={{ ...actividad, configuracion }} /></div></div>;
}
