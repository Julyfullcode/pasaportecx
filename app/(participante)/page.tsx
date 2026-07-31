import Link from "next/link";
import { Award, CalendarDays, Camera, ChevronRight, Download, ImagePlus, LockKeyhole, Medal, Sparkles, Trophy } from "lucide-react";
import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { obtenerRankingEquipos } from "@/lib/equipos";
import { FotoPerfilEditable } from "@/components/participante/FotoPerfilEditable";
import { MarcaHeader } from "@/components/ui/MarcaHeader";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const participante = await requerirParticipante("/");
  const [ranking, equipos, completados, totalPublicados, configuracion] = await Promise.all([
    db.participante.findMany({
      where: { activo: true },
      orderBy: [{ puntosTotales: "desc" }, { creadoEn: "asc" }],
      select: { id: true },
    }),
    obtenerRankingEquipos(),
    db.completitud.count({ where: { participanteId: participante.id } }),
    db.desafio.count({ where: { estado: "PUBLICADO", esSecreto: false } }),
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" }, select: { diplomaHabilitado: true } }),
  ]);
  const posicion = ranking.findIndex((p) => p.id === participante.id) + 1;
  const posicionEquipo = equipos.findIndex((e) => e.id === participante.grupoId) + 1;
  return (
    <>
      <MarcaHeader tituloVerde="Hola," tituloClaro={participante.nombre.split(" ")[0]} compacto lateral>
        <div className="flex max-w-[60vw] items-center justify-end gap-2 text-right">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white/85 sm:text-sm">{participante.empresa.nombre}</p>
            <span className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-extrabold sm:text-xs">
              <span className="h-3 w-3 rounded-full" style={{ background: participante.grupo.colorHex }} />
              <span className="truncate">{participante.grupo.nombre}</span>
            </span>
          </div>
          <FotoPerfilEditable src={participante.urlFoto} nombre={participante.nombre} />
        </div>
      </MarcaHeader>
      <div className="contenedor relative z-20 -mt-3 space-y-4">
        <section className="tarjeta overflow-hidden p-5">
          <p className="text-sm font-extrabold uppercase tracking-wider text-slate-500">Tu puntaje total</p>
          <div className="mt-1 flex items-end justify-between">
            <p className="font-display text-6xl font-extrabold leading-none text-[var(--epm-azul-profundo)]">{participante.puntosTotales.toLocaleString("es-CO")}</p>
            <Sparkles className="text-[var(--epm-verde)]" size={36} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs font-bold text-slate-500">Posición individual</p>
              <p className="mt-1 flex items-center gap-1 font-extrabold text-[var(--epm-azul)]"><Medal size={19} /> Puesto {posicion} de {ranking.length}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">Posición del equipo</p>
              <p className="mt-1 flex items-center gap-1 font-extrabold text-[var(--epm-teal)]"><Trophy size={19} /> Equipo {posicionEquipo} de {equipos.length}</p>
            </div>
          </div>
        </section>
        <section className="grid grid-cols-2 gap-3">
          <Link href="/desafios" className="tarjeta p-4">
            <span className="text-sm font-bold text-slate-500">Tu recorrido</span>
            <strong className="mt-2 block text-2xl text-[var(--epm-azul-profundo)]">{completados}/{totalPublicados}</strong>
            <span className="mt-1 flex items-center text-xs font-extrabold text-[var(--epm-azul)]">Ver desafíos <ChevronRight size={15} /></span>
          </Link>
          <Link href="/ranking" className="tarjeta p-4">
            <span className="text-sm font-bold text-slate-500">Tu equipo</span>
            <strong className="mt-2 block truncate text-lg text-[var(--epm-azul-profundo)]">{participante.grupo.nombre}</strong>
            <span className="mt-1 flex items-center text-xs font-extrabold text-[var(--epm-azul)]">Ver ranking <ChevronRight size={15} /></span>
          </Link>
        </section>
        <Link href="/escanear" className="boton-primario sticky bottom-24 z-30 w-full py-4 text-lg shadow-xl">
          <Camera size={24} /> Escanear QR
        </Link>
        <Link href="/recuerdos?subir=1" className="boton-secundario w-full"><ImagePlus size={20} /> Subir recuerdo</Link>
        <a href="/api/pasaporte" target="_blank" rel="noopener noreferrer" className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-[var(--epm-azul)] bg-white p-4 text-[var(--epm-azul-profundo)] shadow-soft">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-50 text-[var(--epm-azul)]"><Download /></span>
          <span className="min-w-0 flex-1"><strong className="block font-display text-lg">Ver mi pasaporte</strong><small className="text-slate-500">Abre el PDF con tu foto, QR y código de recuperación</small></span>
        </a>
        <a href="/api/agenda" target="_blank" rel="noopener noreferrer" className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-[var(--epm-teal)] bg-emerald-50 p-4 text-[var(--epm-azul-profundo)] shadow-soft">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--epm-teal)] text-white"><CalendarDays /></span>
          <span className="min-w-0 flex-1"><strong className="block font-display text-lg">Ver agenda</strong><small className="text-slate-600">Abre el PDF con los días, horarios y momentos del encuentro</small></span>
        </a>
        {configuracion.diplomaHabilitado ? (
          <a href="/api/diploma" target="_blank" rel="noopener noreferrer" className="flex min-h-16 items-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--epm-azul-profundo)] to-[var(--epm-teal)] p-4 text-white shadow-lg">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)]"><Award /></span>
            <span className="min-w-0 flex-1"><strong className="block font-display text-lg">Ver mi diploma</strong><small className="text-white/75">Se abrirá en PDF para que puedas guardarlo o imprimirlo</small></span>
            <ChevronRight />
          </a>
        ) : (
          <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-slate-600 shadow-soft">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-slate-500"><LockKeyhole /></span>
            <span className="min-w-0 flex-1"><strong className="block font-display text-lg text-[var(--epm-azul-profundo)]">Mi diploma del encuentro</strong><small className="text-slate-600">Estará disponible al finalizar el encuentro.</small></span>
          </div>
        )}
      </div>
    </>
  );
}
