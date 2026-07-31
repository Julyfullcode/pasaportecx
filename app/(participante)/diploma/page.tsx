import { Award, Download, Sparkles } from "lucide-react";
import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { Logo } from "@/components/marca/Logo";
import { MarcaHeader } from "@/components/ui/MarcaHeader";

export const dynamic = "force-dynamic";

export default async function Diploma() {
  const participante = await requerirParticipante("/diploma");
  const config = await db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } });
  const fecha = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" }).format(new Date());

  return (
    <>
      <MarcaHeader tituloVerde="Tu huella" tituloClaro="merece celebrarse" compacto />
      <div className="contenedor relative z-20 -mt-5 space-y-4">
        <section className="tarjeta overflow-hidden">
          <div className="h-3 bg-gradient-to-r from-[var(--epm-azul-profundo)] via-[var(--epm-teal)] to-[var(--epm-verde)]" />
          <div className="relative overflow-hidden px-5 py-8 text-center sm:px-10">
            <Sparkles className="absolute right-4 top-4 text-[var(--epm-verde)] opacity-60" />
            <Logo className="mx-auto h-8 w-auto sm:h-10" />
            <Award className="mx-auto mt-6 text-[var(--epm-teal)]" size={45} strokeWidth={1.7} />
            <p className="mt-3 text-xs font-extrabold uppercase tracking-[.18em] text-[var(--epm-teal)]">Diploma de participación</p>
            <p className="mt-5 text-sm text-slate-500">Grupo EPM reconoce a</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight text-[var(--epm-azul-profundo)] sm:text-4xl">{participante.nombre}</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-600">por su participación activa y entusiasta en <strong>{config.nombreEvento}</strong>, y por contribuir a una experiencia que deja huella.</p>
            <p className="mt-5 text-sm font-extrabold text-[var(--epm-azul)]">{participante.empresa.nombre} · {participante.grupo.nombre}</p>
            <p className="mt-4 text-xs text-slate-400">{fecha}</p>
          </div>
          <div className="bg-[var(--epm-teal)] px-4 py-3 text-center text-xs font-bold text-white">Vicepresidencia Experiencia Usuario-Cliente</div>
        </section>
        <a href="/api/diploma" target="_blank" rel="noopener noreferrer" className="boton-primario w-full py-4 text-base"><Download size={21} /> Ver mi diploma en PDF</a>
        <p className="px-3 text-center text-xs leading-relaxed text-slate-500">Tu diploma se crea cuando lo abres y no ocupa almacenamiento adicional.</p>
      </div>
    </>
  );
}
