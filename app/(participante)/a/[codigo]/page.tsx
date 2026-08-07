import { requerirParticipante } from "@/lib/auth";
import { ActividadEnVivo } from "@/components/participante/ActividadEnVivo";

export const dynamic = "force-dynamic";

export default async function AccesoActividadQr({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  await requerirParticipante(`/a/${codigo}`);
  return <div className="contenedor py-5"><ActividadEnVivo codigo={codigo} /></div>;
}
