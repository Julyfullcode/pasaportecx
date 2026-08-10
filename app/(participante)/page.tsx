import Link from "next/link";
import { Award, CalendarDays, Camera, ChevronRight, Download, ImagePlus, LockKeyhole, Medal, ShieldCheck, Sparkles, Sprout } from "lucide-react";
import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { FotoPerfilEditable } from "@/components/participante/FotoPerfilEditable";
import { EditarPerfil } from "@/components/participante/EditarPerfil";
import { MarcaHeader } from "@/components/ui/MarcaHeader";
import { CODIGO_DESAFIO_CIERRE, esRespuestasCosecha } from "@/lib/cosecha-config";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const participante = await requerirParticipante("/");
  const [ranking, completados, totalPublicados, configuracion, cosechaCompletada, empresas] = await Promise.all([
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
  ]);
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
          <p className="text-sm font-extrabold uppercase tracking-wider text-slate-500">{participante.esStaff ? "Perfil Staff" : "Tu puntaje total"}</p>
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
        <a href={`/api/pasaporte?v=${encodeURIComponent(`${participante.id}-${participante.urlFoto}-${participante.nombre}-${participante.empresaId}`)}#view=Fit`} target="_blank" rel="noopener noreferrer" className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-[var(--epm-azul)] bg-white p-4 text-[var(--epm-azul-profundo)] shadow-soft">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-50 text-[var(--epm-azul)]"><Download /></span>
          <span className="min-w-0 flex-1"><strong className="block font-display text-lg">Ver mi pasaporte</strong><small className="text-slate-500">Abre el PDF con tu foto, QR y código de recuperación</small></span>
        </a>
        {tieneCosecha && (
          <a href={`/api/cosecha?v=${encodeURIComponent(cosechaCompletada!.id)}#view=Fit`} target="_blank" rel="noopener noreferrer" className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-[var(--epm-verde)] bg-gradient-to-r from-lime-50 to-emerald-50 p-4 text-[var(--epm-azul-profundo)] shadow-soft">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)]"><Sprout /></span>
            <span className="min-w-0 flex-1"><strong className="block font-display text-lg">Mi tarjeta de cierre</strong><small className="text-slate-600">Abre tu cosecha, gratitud y acción en PDF</small></span>
          </a>
        )}
        <a href="/api/agenda" target="_blank" rel="noopener noreferrer" className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-[var(--epm-teal)] bg-emerald-50 p-4 text-[var(--epm-azul-profundo)] shadow-soft">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--epm-teal)] text-white"><CalendarDays /></span>
          <span className="min-w-0 flex-1"><strong className="block font-display text-lg">Ver agenda</strong><small className="text-slate-600">Abre el PDF con los días, horarios y momentos del encuentro</small></span>
        </a>
        {configuracion.diplomaHabilitado ? (
          <a href="/api/certificado" target="_blank" rel="noopener noreferrer" className="flex min-h-16 items-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--epm-azul-profundo)] to-[var(--epm-teal)] p-4 text-white shadow-lg">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)]"><Award /></span>
            <span className="min-w-0 flex-1"><strong className="block font-display text-lg">Ver mi certificado</strong><small className="text-white/75">Se abrirá en PDF para que puedas guardarlo o imprimirlo</small></span>
            <ChevronRight />
          </a>
        ) : (
          <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-slate-600 shadow-soft">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-slate-500"><LockKeyhole /></span>
            <span className="min-w-0 flex-1"><strong className="block font-display text-lg text-[var(--epm-azul-profundo)]">Mi certificado del encuentro</strong><small className="text-slate-600">Estará disponible al finalizar el encuentro.</small></span>
          </div>
        )}
      </div>
    </>
  );
}
