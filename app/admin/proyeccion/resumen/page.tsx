import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PresentacionResumenEvento, type DatosResumenEvento } from "@/components/proyeccion/PresentacionResumenEvento";

export const dynamic = "force-dynamic";

export default async function ResumenEvento() {
  await requerirAdmin();

  const [
    configuracion,
    participantes,
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
  ] = await Promise.all([
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" }, select: { nombreEvento: true } }),
    db.participante.count({ where: { activo: true } }),
    db.participante.count({ where: { activo: true, esStaff: true } }),
    db.empresa.findMany({
      include: { _count: { select: { participantes: { where: { activo: true } } } } },
      orderBy: { orden: "asc" },
    }),
    db.desafio.count({ where: { estado: { not: "BORRADOR" } } }),
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
  ]);

  const empresasConParticipantes = empresas
    .filter((empresa) => empresa._count.participantes > 0)
    .map((empresa) => ({ nombre: empresa.nombre, participantes: empresa._count.participantes }));
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
      desafios,
      completitudes,
      participantesConDesafios: participantesConDesafios.length,
      actividades,
      participacionesActividad,
      resultadosJuego,
      recuerdos,
      reacciones,
      puntos: puntos._sum.puntosTotales ?? 0,
    },
    empresas: empresasConParticipantes,
    podio,
    fotos,
  };

  return <PresentacionResumenEvento datos={datos} />;
}
