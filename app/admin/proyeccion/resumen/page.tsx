import { db } from "@/lib/db";
import { PresentacionResumenEvento, type DatosResumenEvento } from "@/components/proyeccion/PresentacionResumenEvento";
import { resumirSatisfaccion } from "@/lib/resumen-satisfaccion";
import { tieneAccesoResumen } from "@/lib/acceso-resumen";
import { ingresarPresentacionResumen } from "./actions";
import { LogoBlanco } from "@/components/marca/Logo";
import { TexturaArcos } from "@/components/marca/TexturaArcos";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ResumenEvento({ searchParams }: { searchParams: Promise<{ error?: string; lienzo?: string }> }) {
  const parametros = await searchParams;
  if (!(await tieneAccesoResumen())) {
    return <main className="marca-gradiente relative grid min-h-screen place-items-center overflow-hidden p-6 text-white"><TexturaArcos /><div className="relative z-10 w-full max-w-lg rounded-[2.5rem] border border-white/20 bg-[var(--epm-azul-profundo)]/70 p-[clamp(28px,4vw,48px)] text-center shadow-2xl backdrop-blur-xl"><LogoBlanco className="mx-auto h-14 w-auto" /><p className="mt-8 font-extrabold uppercase tracking-[.22em] text-[var(--epm-verde)]">Presentación final</p><h1 className="mt-3 font-display text-[clamp(34px,5vw,52px)] font-extrabold leading-tight">El evento en cifras y recuerdos</h1><p className="mt-4 text-white/65">Ingresa el código compartido para ver la presentación.</p><form action={ingresarPresentacionResumen} className="mt-8"><label htmlFor="codigo-resumen" className="sr-only">Código de acceso</label><input id="codigo-resumen" name="codigo" type="password" autoComplete="off" autoFocus required placeholder="Código de acceso" className="h-14 w-full rounded-2xl border border-white/20 bg-white/10 px-5 text-center text-lg font-bold text-white outline-none placeholder:text-white/40 focus:border-[var(--epm-verde)]" />{parametros.error === "codigo" && <p role="alert" className="mt-3 font-bold text-rose-200">El código no es correcto. Inténtalo de nuevo.</p>}<button type="submit" className="mt-5 h-14 w-full rounded-full bg-[var(--epm-verde)] px-6 font-extrabold text-[var(--epm-azul-profundo)] shadow-xl transition hover:scale-[1.02]">Ingresar a la presentación</button></form></div></main>;
  }

  if (parametros.lienzo !== "1") redirect("/admin/proyeccion/resumen/presentacion");

  const [
    configuracion,
    participantes,
    personasRegistradas,
    staff,
    empresas,
    desafios,
    completitudes,
    participantesConDesafios,
    actividades,
    participacionesActividad,
    resultadosJuego,
    recuerdos,
    reacciones,
    puntos,
    podio,
    fotosRecuerdos,
    fotosAgenda,
    respuestasEncuestas,
  ] = await Promise.all([
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" }, select: { nombreEvento: true } }),
    db.participante.count({ where: { activo: true } }),
    db.participante.findMany({
      where: { activo: true },
      orderBy: { creadoEn: "asc" },
      select: { id: true, nombre: true, urlFoto: true, empresa: { select: { nombre: true } } },
    }),
    db.participante.count({ where: { activo: true, esStaff: true } }),
    db.empresa.findMany({
      include: { _count: { select: { participantes: { where: { activo: true } } } } },
      orderBy: { orden: "asc" },
    }),
    db.desafio.findMany({
      where: { estado: { not: "BORRADOR" } },
      orderBy: [{ dia: "asc" }, { orden: "asc" }],
      select: { id: true, titulo: true, descripcion: true, urlImagen: true, tipo: true },
    }),
    db.completitud.count({ where: { estado: "APROBADO" } }),
    db.completitud.findMany({
      where: { estado: "APROBADO" },
      distinct: ["participanteId"],
      select: { participanteId: true },
    }),
    db.actividad.count({ where: { estado: { not: "BORRADOR" } } }),
    db.participacionActividad.count(),
    db.resultadoJuegoActividad.count(),
    db.recuerdo.count({ where: { visible: true, pendiente: false, reportado: false } }),
    db.reaccionRecuerdo.count(),
    db.participante.aggregate({ where: { activo: true, esStaff: false }, _sum: { puntosTotales: true } }),
    db.participante.findMany({
      where: { activo: true, esStaff: false },
      orderBy: [{ puntosTotales: "desc" }, { creadoEn: "asc" }],
      take: 3,
      select: { id: true, nombre: true, urlFoto: true, puntosTotales: true, empresa: { select: { nombre: true } } },
    }),
    db.recuerdo.findMany({
      where: { visible: true, pendiente: false, reportado: false },
      orderBy: [{ reacciones: { _count: "desc" } }, { creadoEn: "asc" }],
      select: {
        id: true,
        urlFoto: true,
        descripcion: true,
        participante: { select: { nombre: true } },
        _count: { select: { reacciones: true } },
      },
    }),
    db.fotoDiaAgenda.findMany({
      orderBy: [{ dia: { orden: "asc" } }, { orden: "asc" }],
      select: { id: true, urlFoto: true, dia: { select: { nombre: true } } },
    }),
    db.completitud.findMany({
      where: { estado: "APROBADO", desafio: { tipo: "ENCUESTA" } },
      orderBy: { completadoEn: "asc" },
      select: { respuesta: true, desafio: { select: { configuracion: true } } },
    }),
  ]);

  const empresasConParticipantes = empresas
    .filter((empresa) => empresa._count.participantes > 0)
    .map((empresa) => ({ nombre: empresa.nombre, urlLogo: empresa.urlLogo, participantes: empresa._count.participantes }));
  const fotos = [
    ...fotosRecuerdos.map((foto) => ({
      id: `recuerdo-${foto.id}`,
      url: foto.urlFoto,
      texto: foto.descripcion,
      autoria: foto.participante.nombre,
      reacciones: foto._count.reacciones,
    })),
    ...fotosAgenda.map((foto) => ({
      id: `agenda-${foto.id}`,
      url: foto.urlFoto,
      texto: foto.dia.nombre,
      autoria: "Agenda del evento",
      reacciones: 0,
    })),
  ].filter((foto, indice, todas) => todas.findIndex((item) => item.url === foto.url) === indice);

  const datos: DatosResumenEvento = {
    nombreEvento: configuracion.nombreEvento,
    cifras: {
      participantes,
      staff,
      empresas: empresasConParticipantes.length,
      desafios: desafios.length,
      completitudes,
      participantesConDesafios: participantesConDesafios.length,
      actividades,
      participacionesActividad,
      resultadosJuego,
      recuerdos,
      reacciones,
      puntos: puntos._sum.puntosTotales ?? 0,
    },
    personas: personasRegistradas,
    desafios,
    empresas: empresasConParticipantes,
    podio,
    fotos,
    satisfaccion: resumirSatisfaccion(respuestasEncuestas.map((registro) => ({
      configuracion: registro.desafio.configuracion,
      respuesta: registro.respuesta,
    }))),
  };

  return <PresentacionResumenEvento datos={datos} />;
}
