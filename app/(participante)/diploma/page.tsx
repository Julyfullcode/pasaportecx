import { LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { MarcaHeader } from "@/components/ui/MarcaHeader";

export const dynamic = "force-dynamic";

export default async function Diploma() {
  await requerirParticipante("/diploma");
  const config = await db.configuracionEvento.findUniqueOrThrow({
    where: { id: "evento" },
    select: { diplomaHabilitado: true },
  });

  if (config.diplomaHabilitado) redirect("/api/certificado");

  return (
    <>
      <MarcaHeader tituloVerde="Tu huella" tituloClaro="merece celebrarse" compacto />
      <div className="contenedor relative z-20 -mt-5">
        <section className="tarjeta overflow-hidden text-center">
          <div className="h-3 bg-gradient-to-r from-[var(--epm-azul-profundo)] via-[var(--epm-teal)] to-[var(--epm-verde)]" />
          <div className="px-6 py-12">
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-[var(--epm-teal)]"><LockKeyhole size={36} /></span>
            <h1 className="mt-6 font-display text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Tu certificado estará disponible al finalizar el encuentro</h1>
            <p className="mx-auto mt-3 max-w-xl leading-relaxed text-slate-600">Sigue participando, compartiendo y dejando tu huella. Cuando los organizadores lo habiliten, podrás abrir aquí tu certificado en PDF.</p>
          </div>
        </section>
      </div>
    </>
  );
}
