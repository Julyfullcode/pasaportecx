import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { MuroRecuerdos } from "@/components/participante/MuroRecuerdos";
import { presentarRecuerdo } from "@/lib/recuerdos";

export const dynamic = "force-dynamic";

export default async function Recuerdos({ searchParams }: { searchParams: Promise<{ subir?: string }> }) {
  const participante = await requerirParticipante("/recuerdos");
  const [recuerdosBase, { subir }, configuracion, recuerdosPropios] = await Promise.all([
    db.recuerdo.findMany({
      where: { visible: true, pendiente: false, reportado: false },
      orderBy: { creadoEn: "desc" },
      take: 18,
      include: {
        participante: { include: { empresa: true } },
        reacciones: { select: { participanteId: true, tipo: true } },
      },
    }),
    searchParams,
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" }, select: { maxRecuerdosPorParticipante: true } }),
    db.recuerdo.count({ where: { participanteId: participante.id } }),
  ]);
  const recuerdos = recuerdosBase.map((recuerdo) => presentarRecuerdo(recuerdo, participante.id));
  return (
    <div className="contenedor py-6">
      <p className="font-extrabold text-[var(--epm-verde-medio)]">Lo que vivimos</p>
      <h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Muro de recuerdos</h1>
      <p className="mt-2 text-sm text-slate-600">Fotos espontáneas del encuentro, compartidas por todos.</p>
      <MuroRecuerdos
        iniciales={recuerdos}
        participanteId={participante.id}
        abrirSubida={subir === "1" && recuerdosPropios < configuracion.maxRecuerdosPorParticipante}
        cupoInicial={{
          limite: configuracion.maxRecuerdosPorParticipante,
          usados: recuerdosPropios,
          restantes: Math.max(0, configuracion.maxRecuerdosPorParticipante - recuerdosPropios),
        }}
      />
    </div>
  );
}
