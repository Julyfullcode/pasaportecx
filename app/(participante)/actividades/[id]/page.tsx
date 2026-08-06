import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requerirParticipante } from "@/lib/auth";
import { ActividadEnVivo } from "@/components/participante/ActividadEnVivo";

export const dynamic = "force-dynamic";

export default async function VerActividad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requerirParticipante(`/actividades/${id}`);
  return <div className="contenedor py-5"><Link href="/actividades" className="mb-4 inline-flex items-center gap-2 font-extrabold text-[var(--epm-azul)]"><ArrowLeft size={19} /> Volver a actividades</Link><ActividadEnVivo id={id} /></div>;
}
