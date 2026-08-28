import Link from "next/link";
import { Award, CalendarDays, Camera, ChevronRight, Download, ImagePlus, LockKeyhole, Medal, Orbit, ShieldCheck, Sparkles, Sprout } from "lucide-react";
import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { FotoPerfilEditable } from "@/components/participante/FotoPerfilEditable";
import { EditarPerfil } from "@/components/participante/EditarPerfil";
import { MarcaHeader } from "@/components/ui/MarcaHeader";
import { CODIGO_DESAFIO_CIERRE, esRespuestasCosecha } from "@/lib/cosecha-config";
import { asegurarActividadUniversoArquetipos, leerResultadoTestUniverso, PLANETAS_ARQUETIPO, RESPUESTA_TEST_UNIVERSO_ID } from "@/lib/universo-arquetipos";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const participante = await requerirParticipante("/");
  const actividadUniverso = await asegurarActividadUniversoArquetipos();
  const [ranking, completados, totalPublicados, configuracion, cosechaCompletada, empresas, respuestaUniverso] = await Promise.all([
    db.participante.findMany({
      where: { activo: true, esStaff: false },
      orderBy: [{ puntosTotales: "desc" }, { creadoEn: "asc" }],
      select: { id: true },
    }),
    db.completitud.count({ where: { participanteId: participante.id } }),
    db.desafio.count({ where: { estado: "PUBLICADO", esSecreto: false } }),
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" }, select: { diplomaHabilitado: true } }),
    db.completitud.findFirst({
      where: { participanteId: participante.id, desafio: { codigoQr: CODIGO_DESAFIO_CIERRE } },
      select: { id: true, respuesta: true },
    }),
    db.empresa.findMany({
      where: { OR: [{ activa: true }, { id: participante.empresaId }] },
      orderBy: { orden: "asc" },
      select: { id: true, nombre: true },
    }),
    db.respuestaActividad.findUnique({ where: { actividadId_participanteId_preguntaId: { actividadId: actividadUniverso.id, participanteId: participante.id, preguntaId: RESPUESTA_TEST_UNIVERSO_ID } }, select: { respuesta: true } }),
  ]);
  const arquetipoUniverso = leerResultadoTestUniverso(respuestaUniverso?.respuesta);
  const planetaUniverso = arquetipoUniverso ? PLANETAS_ARQUETIPO.find((planeta) => planeta.id === arquetipoUniverso.planetaId) : null;
  const tieneCosecha = esRespuestasCosecha(cosechaCompletada?.respuesta);
  const completadosValidos = completados - (cosechaCompletada && !tieneCosecha ? 1 : 0);
  const posicion = participante.esStaff ? null : ranking.findIndex((p) => p.id === participante.id) + 1;
  const partesNombre = participante.nombre.trim().split(/\s+/);
  const corteNombre = partesNombre.length >= 4 ? 2 : 1;
  const nombres = participante.nombres?.trim() || partesNombre.slice(0, corteNombre).join(" ");
  const apellidos = participante.apellidos?.trim() || partesNombre.slice(corteNombre).join(" ");
  return (
    <>
      <MarcaHeader tituloVerde="Hola," tituloClaro={participante.nombre.split(" ")[0]} compacto lateral>
        <div className="flex max-w-[60vw] items-center justify-end gap-2 text-right">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white/85 sm:text-sm">{participante.empresa.nombre}</p>
          </div>
          <FotoPerfilEditable src={participante.urlFoto} nombre={participante.nombre} />
        </div>
      </MarcaHeader>
      <div className="contenedor relative z-20 -mt-3 space-y-4">
        <section className="tarjeta overflow-hidden p-5">
          <p className="text-sm font-extrabold tracking-wide text-slate-500">{participante.esStaff ? "Perfil Staff" : "Tu puntaje total"}</p>
          <div className="mt-1 flex items-end justify-between">
            {participante.esStaff
              ? <p className="max-w-sm text-lg font-extrabold text-[var(--epm-azul-profundo)]">Participas en todas las actividades sin competir por puntos ni premios.</p>
              : <p className="font-display text-6xl font-extrabold leading-none text-[var(--epm-azul-profundo)]">{participante.puntosTotales.toLocaleString("es-CO")}</p>}
            {participante.esStaff ? <ShieldCheck className="text-[var(--epm-teal)]" size={40} /> : <Sparkles className="text-[var(--epm-verde)]" size={36} />}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs font-bold text-slate-500">{participante.esStaff ? "Esquema de puntos" : "Posición individual"}</p>
              <p className="mt-1 flex items-center gap-1 font-extrabold text-[var(--epm-azul)]">{participante.esStaff ? <><ShieldCheck size={19} /> Sin participación en ranking</> : <><Medal size={19} /> Puesto {posicion} de {ranking.length}</>}</p>
            </div>
          </div>
        </section>
        <EditarPerfil nombres={nombres} apellidos={apellidos} empresaId={participante.empresaId} empresas={empresas} />
        {actividadUniverso.estado === "PUBLICADA" && <Link href={planetaUniverso ? "/universo" : "/universo/test"} className="group relative block min-h-44 overflow-hidden rounded-[1.8rem] border border-white/15 bg-[linear-gradient(135deg,#071a38,#005E7D_58%,#00A650)] p-6 text-white shadow-xl"><span className="absolute -right-14 -top-20 h-64 w-64 rounded-full border-[38px] border-lime-300/10" /><span className="absolute right-8 top-8 h-20 w-20 rounded-full bg-[radial-gradient(circle_at_30%_25%,#fff,#C3E05A_12%,#005E7D_64%,#071a38)] shadow-[0_0_38px_rgba(195,224,90,.38)]" /><div className="relative max-w-[78%]"><span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.18em] text-lime-300"><Orbit size={17} /> Nueva actividad</span><h2 className="mt-3 font-display text-2xl font-extrabold text-white">El Universo de la Experiencia</h2><p className="mt-2 text-sm leading-relaxed text-white/72">Encuentra tu planeta y descubre cuál es tu aporte a la experiencia del cliente.</p><span className="mt-4 inline-flex items-center gap-1 font-extrabold text-lime-200">{planetaUniverso ? "Entrar al mapa estelar" : "Descubrir qué planeta soy"} <ChevronRight className="transition group-hover:translate-x-1" size={18} /></span></div></Link>}
        {planetaUniverso && <Link href="/universo/tarjeta" className="tarjeta flex items-center gap-4 p-4"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-[#071a38]" style={{ background: planetaUniverso.color, boxShadow: `0 0 22px ${planetaUniverso.color}66` }}><Sparkles /></span><span className="min-w-0 flex-1"><small className="font-extrabold uppercase tracking-wider text-slate-500">Mi arquetipo</small><strong className="block truncate text-lg text-[var(--epm-azul-profundo)]">{planetaUniverso.arquetipo}</strong><span className="text-sm text-slate-500">Ver y descargar mi tarjeta</span></span><ChevronRight className="text-[var(--epm-azul)]" /></Link>}
        <section className="grid grid-cols-2 gap-3">
          <Link href="/desafios" className="tarjeta p-4">
            <span className="text-sm font-bold text-slate-500">Tu recorrido</span>
            <strong className="mt-2 block text-2xl text-[var(--epm-azul-profundo)]">{completadosValidos}/{totalPublicados}</strong>
            <span className="mt-1 flex items-center text-xs font-extrabold text-[var(--epm-azul)]">Ver desafíos <ChevronRight size={15} /></span>
          </Link>
          <Link href="/ranking" className="tarjeta p-4">
            <span className="text-sm font-bold text-slate-500">Tu posición</span>
            <strong className="mt-2 block truncate text-lg text-[var(--epm-azul-profundo)]">{participante.esStaff ? "Perfil Staff" : `Puesto ${posicion}`}</strong>
            <span className="mt-1 flex items-center text-xs font-extrabold text-[var(--epm-azul)]">Ver ranking <ChevronRight size={15} /></span>
          </Link>
        </section>
        <Link href="/escanear" className="boton-primario sticky bottom-24 z-30 w-full py-4 text-lg shadow-xl">
          <Camera size={24} /> Escanear QR
        </Link>
        <Link href="/recuerdos?subir=1" className="boton-secundario w-full"><ImagePlus size={20} /> Subir recuerdo</Link>
        <a href={`/api/pasaporte?v=${encodeURIComponent(`${participante.id}-${participante.urlFoto}-${participante.nombre}-${participante.empresaId}`)}#view=Fit`} target="_blank" rel="noopener noreferrer" className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-[1.6rem] border border-white/25 bg-gradient-to-r from-[var(--epm-azul-profundo)] via-[var(--epm-azul)] to-[var(--epm-teal)] p-5 text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl">
          <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/30 transition group-hover:scale-105"><Download size={28} /></span>
          <span className="relative z-10 min-w-0 flex-1"><strong className="block font-display text-xl text-white">Ver mi pasaporte</strong><small className="mt-1 block text-white/80">Abre el PDF con tu foto, QR y código de recuperación</small></span><span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 transition group-hover:translate-x-1"><ChevronRight /></span>
        </a>
        {tieneCosecha && (
          <a href={`/api/cosecha?v=${encodeURIComponent(cosechaCompletada!.id)}#view=Fit`} target="_blank" rel="noopener noreferrer" className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-[var(--epm-verde)] bg-gradient-to-r from-lime-50 to-emerald-50 p-4 text-[var(--epm-azul-profundo)] shadow-soft">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)]"><Sprout /></span>
            <span className="min-w-0 flex-1"><strong className="block font-display text-lg">Mi tarjeta de cierre</strong><small className="text-slate-600">Abre tu cosecha, gratitud y acción en PDF</small></span>
          </a>
        )}
        <a href="/api/agenda" target="_blank" rel="noopener noreferrer" className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-[1.6rem] border border-white/30 bg-gradient-to-r from-[var(--epm-teal)] via-[#16956f] to-[var(--epm-verde-medio)] p-5 text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl">
          <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/30 transition group-hover:scale-105"><CalendarDays size={28} /></span>
          <span className="relative z-10 min-w-0 flex-1"><strong className="block font-display text-xl text-white">Ver agenda</strong><small className="mt-1 block text-white/85">Abre el PDF con los días, horarios y momentos del encuentro</small></span><span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 transition group-hover:translate-x-1"><ChevronRight /></span>
        </a>
        {configuracion.diplomaHabilitado ? (
          <a href="/api/certificado" target="_blank" rel="noopener noreferrer" className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-[1.6rem] border border-white/25 bg-gradient-to-r from-[var(--epm-azul-profundo)] via-[var(--epm-teal)] to-[var(--epm-verde-medio)] p-5 text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl">
            <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)] ring-1 ring-white/40 transition group-hover:scale-105"><Award size={28} /></span>
            <span className="relative z-10 min-w-0 flex-1"><strong className="block font-display text-xl">Ver mi certificado</strong><small className="mt-1 block text-white/80">Se abrirá en PDF para que puedas guardarlo o imprimirlo</small></span>
            <ChevronRight />
          </a>
        ) : (
          <div className="flex min-h-24 items-center gap-4 rounded-[1.6rem] border border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 p-5 text-slate-600 shadow-soft">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-slate-500 ring-1 ring-slate-200"><LockKeyhole size={27} /></span>
            <span className="min-w-0 flex-1"><strong className="block font-display text-xl text-[var(--epm-azul-profundo)]">Mi certificado del encuentro</strong><small className="mt-1 block text-slate-600">Estará disponible al finalizar el encuentro.</small></span>
          </div>
        )}
      </div>
    </>
  );
}
