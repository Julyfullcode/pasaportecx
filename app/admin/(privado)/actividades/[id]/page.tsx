import Link from "next/link";
import { ArrowLeft, MonitorPlay, Play, Square } from "lucide-react";
import { notFound } from "next/navigation";
import { EditorActividad } from "@/components/admin/EditorActividad";
import { db } from "@/lib/db";
import { leerConfiguracionActividad } from "@/lib/actividad";
import { TIPO_JUEGO_CX_EX } from "@/lib/juego-cx-ex";
import { TIPO_UNIVERSO_TARJETAS } from "@/lib/universo-experiencia";
import { EditorUniversoArquetipos } from "@/components/admin/EditorUniversoArquetipos";
import { leerConfiguracionUniverso, TIPO_UNIVERSO_ARQUETIPOS } from "@/lib/universo-arquetipos";
import { cerrarActividad, publicarActividad } from "@/app/admin/(privado)/actividades/actions";

export const dynamic = "force-dynamic";

export default async function ConfigurarActividad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actividad = await db.actividad.findUnique({ where: { id } });
  if (!actividad) notFound();
  if (actividad.tipo === TIPO_UNIVERSO_ARQUETIPOS) {
    const configuracionUniverso = leerConfiguracionUniverso(actividad.configuracion); if (!configuracionUniverso) throw new Error("La configuración del universo no es válida.");
    return <div className="p-4 md:p-7"><Link href="/admin/actividades" className="inline-flex items-center gap-2 font-extrabold text-[var(--epm-azul)]"><ArrowLeft size={18} /> Volver</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><p className="font-extrabold text-[var(--epm-verde-medio)]">Actividad independiente</p><h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Configurar El Universo de la Experiencia</h1><p className="mt-2 text-slate-600">Administra los retos y controla cuándo pueden participar las personas.</p></div><div className="flex flex-wrap gap-2">{actividad.estado !== "PUBLICADA" ? <form action={publicarActividad}><input type="hidden" name="id" value={id} /><button className="boton-primario"><Play size={18} /> Publicar actividad</button></form> : <form action={cerrarActividad}><input type="hidden" name="id" value={id} /><button className="boton-secundario"><Square size={18} /> Cerrar actividad</button></form>}<a href="/universo/galaxia?demo=1" target="_blank" rel="noopener noreferrer" className="boton-secundario"><MonitorPlay size={18} /> Probar galaxia</a></div></div><div className="mt-6"><EditorUniversoArquetipos actividadId={id} configuracion={configuracionUniverso} /></div></div>;
  }
  const configuracion = leerConfiguracionActividad(actividad.configuracion);
  if (!configuracion) throw new Error("La configuración de la actividad no es válida.");
  return <div className="p-4 md:p-7"><Link href="/admin/actividades" className="inline-flex items-center gap-2 font-extrabold text-[var(--epm-azul)]"><ArrowLeft size={18} /> Volver</Link><h1 className="mt-4 text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Configurar actividad</h1><p className="mt-2 text-slate-600">{actividad.tipo === TIPO_JUEGO_CX_EX ? "Puedes editar los textos generales y decidir si el juego entrega puntos." : actividad.tipo === TIPO_UNIVERSO_TARJETAS ? "Puedes editar la invitación, el cierre y decidir si la experiencia entrega puntos." : "Puedes editar la invitación, preguntas, opciones, insights y decidir si entrega puntos."}</p><div className="mt-6"><EditorActividad actividad={{ ...actividad, configuracion }} /></div></div>;
}
