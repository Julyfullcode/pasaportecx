import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, Sparkles } from "lucide-react";
import Link from "next/link";
import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { ResolverDesafio } from "@/components/participante/ResolverDesafio";
import { esDesafioCosecha, esRespuestasCosecha, FORMATO_COSECHA } from "@/lib/cosecha-config";
import { CurvaMarca } from "@/components/marca/CurvaMarca";
import { TexturaArcos } from "@/components/marca/TexturaArcos";
import { LogoBlanco } from "@/components/marca/Logo";
import { etiquetaDiaDesafio } from "@/lib/dia-desafio";
import { estadoTemporalDesafio, fechaCierreDesafio } from "@/lib/duracion-desafio";
import {
  esConfiguracionPuntualidad,
  mensajePuntualidad,
  resultadoPuntualidadDesdeRespuesta,
  type ResultadoPuntualidad,
} from "@/lib/puntualidad";
import { esConfiguracionMatricula, respuestaMatricula } from "@/lib/matricula";

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
      completitudes: { where: { participanteId: participante.id }, take: 1 },
    },
  });
  if (!desafio) notFound();
  const esCosecha = esDesafioCosecha(desafio.codigoQr, desafio.configuracion);
  const configuracion = desafio.configuracion as Record<string, unknown>;
  const esPuntualidad = esConfiguracionPuntualidad(configuracion);
  const completitud = desafio.completitudes[0];
  const esMatricula = esConfiguracionMatricula(configuracion);
  const estaCompletado = Boolean(
    completitud && !esMatricula && (!esCosecha || esRespuestasCosecha(completitud.respuesta)),
  );
  const estadoTemporal = estadoTemporalDesafio(desafio);
  const fechaCierre = fechaCierreDesafio(desafio);
  return (
    <div>
      <header className="marca-gradiente relative overflow-hidden px-4 pb-28 pt-5 text-white md:pb-32">
        <TexturaArcos />
        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-5">
            <Link href="/desafios" className="inline-flex items-center gap-2 font-extrabold"><ArrowLeft size={20} /> Desafíos</Link>
            <LogoBlanco className="h-7 w-auto shrink-0 md:h-8" />
          </div>
          <div className="mt-8 text-sm font-extrabold text-white/85">{etiquetaDiaDesafio(desafio.dia)}</div>
          <h1 className="mt-2 text-3xl font-extrabold">{desafio.titulo}</h1>
          <p className="mt-3 max-w-xl text-white/85">{desafio.descripcion}</p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-extrabold"><Sparkles className="text-[var(--epm-verde)]" /> {participante.esStaff ? "Participación Staff" : `${desafio.puntos} puntos`}</span>
        </div>
        <CurvaMarca />
      </header>
      <section className="relative z-20 mx-auto -mt-4 max-w-2xl px-4">
        {estaCompletado && completitud ? (
          <div className="tarjeta p-6 text-center">
            <CheckExistente
              estado={completitud.estado}
              puntos={completitud.puntosOtorgados}
              puntosDesafio={desafio.puntos}
              esCosecha={esCosecha}
              completitudId={completitud.id}
              esStaff={participante.esStaff}
              puntualidad={resultadoPuntualidadDesdeRespuesta(completitud.respuesta)}
            />
          </div>
        ) : desafio.estado !== "PUBLICADO" || estadoTemporal !== "DISPONIBLE" ? (
          <div className="tarjeta p-6 text-center">
            <Clock3 className="mx-auto text-amber-600" size={38} />
            <h2 className="mt-3 text-xl font-extrabold">{estadoTemporal === "FINALIZADO" ? "Este desafío ya finalizó" : "Este desafío aún no está disponible"}</h2>
            <p className="mt-2 text-slate-600">{estadoTemporal === "FINALIZADO" ? "La duración configurada terminó y ya no se reciben respuestas." : "La organización lo publicará cuando sea el momento."}</p>
          </div>
        ) : (
          <ResolverDesafio
            codigo={desafio.codigoQr}
            tipo={esCosecha ? "ENCUESTA" : esPuntualidad ? "PUNTUALIDAD" : desafio.tipo}
            puntos={participante.esStaff ? 0 : desafio.puntos}
            configuracion={(esCosecha ? { ...configuracion, formato: FORMATO_COSECHA } : configuracion) as never}
            respuestaInicial={esMatricula ? respuestaMatricula(completitud?.respuesta) : null}
          />
        )}
        {!estaCompletado && fechaCierre && estadoTemporal === "DISPONIBLE" && (
          <p className="mt-3 text-center text-xs font-bold text-slate-500">Disponible hasta {fechaCierre.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" })}</p>
        )}
      </section>
    </div>
  );
}

function CheckExistente({
  estado,
  puntos,
  puntosDesafio,
  esCosecha,
  completitudId,
  esStaff,
  puntualidad,
}: {
  estado: string;
  puntos: number;
  puntosDesafio: number;
  esCosecha: boolean;
  completitudId: string;
  esStaff: boolean;
  puntualidad: ResultadoPuntualidad | null;
}) {
  const llegadaTarde = Boolean(puntualidad && !puntualidad.obtuvoPuntos);
  return (
    <>
      <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${llegadaTarde ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-[var(--epm-verde-medio)]"}`}>{llegadaTarde ? "!" : "✓"}</div>
      <h2 className="mt-3 text-xl font-extrabold">{llegadaTarde ? "Llegaste después del tiempo límite" : "Ya completaste este desafío"}</h2>
      <p className="mt-2 text-slate-600">{esStaff ? "Tu participación quedó registrada. Como integrante Staff, no participas en el esquema de puntos." : puntualidad ? mensajePuntualidad(puntualidad, puntosDesafio) : estado === "PENDIENTE" ? "Tu evidencia sigue pendiente de revisión." : `Ganaste ${puntos} puntos.`}</p>
      {esCosecha && <a href={`/api/cosecha?v=${encodeURIComponent(completitudId)}#view=Fit`} target="_blank" rel="noopener noreferrer" className="boton-secundario mt-5 w-full">Ver mi tarjeta de cierre</a>}
    </>
  );
}
