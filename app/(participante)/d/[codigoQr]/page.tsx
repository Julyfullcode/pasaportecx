import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { ResolverDesafio } from "@/components/participante/ResolverDesafio";
import { FORMATO_COSECHA } from "@/lib/cosecha-config";
import { CurvaMarca } from "@/components/marca/CurvaMarca";
import { TexturaArcos } from "@/components/marca/TexturaArcos";

export const dynamic = "force-dynamic";

export default async function DetalleDesafio({
  params,
}: {
  params: Promise<{ codigoQr: string }>;
}) {
  const { codigoQr } = await params;
  const participante = await requerirParticipante(`/d/${codigoQr}`);
  const desafio = await db.desafio.findUnique({
    where: { codigoQr },
    include: {
      componente: true,
      completitudes: { where: { participanteId: participante.id }, take: 1 },
    },
  });
  if (!desafio) notFound();
  const esCosecha = (desafio.configuracion as { formato?: string }).formato === FORMATO_COSECHA;
  return (
    <div>
      <header className="marca-gradiente relative overflow-hidden px-4 pb-28 pt-5 text-white md:pb-32">
        <TexturaArcos />
        <div className="relative z-10 mx-auto max-w-2xl">
          <Link href="/desafios" className="inline-flex items-center gap-2 font-extrabold"><ArrowLeft size={20} /> Desafíos</Link>
          <div className="mt-8 flex items-center gap-2 text-sm font-extrabold text-white/85"><MapPin size={17} /> Día {desafio.dia} · {desafio.componente?.nombre || desafio.ubicacion}</div>
          <h1 className="mt-2 text-3xl font-extrabold">{desafio.titulo}</h1>
          <p className="mt-3 max-w-xl text-white/85">{desafio.descripcion}</p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-extrabold"><Sparkles className="text-[var(--epm-verde)]" /> {desafio.puntos} puntos</span>
        </div>
        <CurvaMarca />
      </header>
      <section className="relative z-20 mx-auto -mt-4 max-w-2xl px-4">
        {desafio.completitudes[0] ? (
          <div className="tarjeta p-6 text-center">
            <CheckExistente estado={desafio.completitudes[0].estado} puntos={desafio.completitudes[0].puntosOtorgados} esCosecha={esCosecha} />
          </div>
        ) : (
          <ResolverDesafio codigo={desafio.codigoQr} tipo={desafio.tipo} puntos={desafio.puntos} configuracion={desafio.configuracion as never} />
        )}
      </section>
    </div>
  );
}

function CheckExistente({ estado, puntos, esCosecha }: { estado: string; puntos: number; esCosecha: boolean }) {
  return (
    <>
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-[var(--epm-verde-medio)]">✓</div>
      <h2 className="mt-3 text-xl font-extrabold">Ya completaste este desafío</h2>
      <p className="mt-2 text-slate-600">{estado === "PENDIENTE" ? "Tu evidencia sigue pendiente de revisión." : `Ganaste ${puntos} puntos.`}</p>
      {esCosecha && <a href="/api/cosecha#view=Fit" target="_blank" rel="noopener noreferrer" className="boton-secundario mt-5 w-full">Ver mi tarjeta de cierre</a>}
    </>
  );
}
