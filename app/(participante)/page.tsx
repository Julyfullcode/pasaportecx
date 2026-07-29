import Link from "next/link";
import { Camera, ChevronRight, ImagePlus, Medal, Sparkles, Trophy } from "lucide-react";
import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { obtenerRankingEquipos } from "@/lib/equipos";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { MarcaHeader } from "@/components/ui/MarcaHeader";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const participante = await requerirParticipante("/");
  const [ranking, equipos, completados, totalPublicados] = await Promise.all([
    db.participante.findMany({
      where: { activo: true },
      orderBy: [{ puntosTotales: "desc" }, { creadoEn: "asc" }],
      select: { id: true },
    }),
    obtenerRankingEquipos(),
    db.completitud.count({ where: { participanteId: participante.id } }),
    db.desafio.count({ where: { estado: "PUBLICADO", esSecreto: false } }),
  ]);
  const posicion = ranking.findIndex((p) => p.id === participante.id) + 1;
  const posicionEquipo = equipos.findIndex((e) => e.id === participante.grupoId) + 1;
  return (
    <>
      <MarcaHeader tituloVerde="Hola," tituloClaro={participante.nombre.split(" ")[0]} compacto>
        <div className="mt-5 flex items-center gap-3">
          <FotoCircular src={participante.urlFoto} alt={`Foto de ${participante.nombre}`} className="h-20 w-20" />
          <div>
            <p className="font-bold">{participante.empresa.nombre}</p>
            <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-extrabold">
              <span className="h-3 w-3 rounded-full" style={{ background: participante.grupo.colorHex }} />
              {participante.grupo.nombre}
            </span>
          </div>
        </div>
      </MarcaHeader>
      <div className="contenedor -mt-7 space-y-4">
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
      </div>
    </>
  );
}
