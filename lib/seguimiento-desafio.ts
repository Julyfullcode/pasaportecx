import { db } from "@/lib/db";
import { etiquetaDiaDesafio } from "@/lib/dia-desafio";
import { fechaCierreDesafio } from "@/lib/duracion-desafio";

export type ParticipanteSeguimiento = {
  id: string;
  nombre: string;
  urlFoto: string;
  esStaff: boolean;
  respondio: boolean;
  estado: "APROBADO" | "PENDIENTE" | "RECHAZADO" | "SIN_RESPUESTA";
  puntosOtorgados: number;
  respondidoEn: string | null;
};

export type SeguimientoDesafio = {
  desafio: {
    id: string;
    titulo: string;
    estado: string;
    categoria: string;
    puntos: number;
    cierraEn: string | null;
    limiteCompletitudes: number | null;
  };
  resumen: {
    totalParticipantes: number;
    respondieron: number;
    pendientes: number;
    aprobadas: number;
    pendientesRevision: number;
    rechazadas: number;
    puntosOtorgados: number;
    porcentaje: number;
  };
  participantes: ParticipanteSeguimiento[];
};

export async function obtenerSeguimientoDesafio(id: string): Promise<SeguimientoDesafio | null> {
  const [desafio, personas] = await Promise.all([
    db.desafio.findUnique({ where: { id } }),
    db.participante.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        urlFoto: true,
        esStaff: true,
        completitudes: {
          where: { desafioId: id },
          orderBy: { completadoEn: "desc" },
          take: 1,
          select: {
            estado: true,
            puntosOtorgados: true,
            completadoEn: true,
          },
        },
      },
    }),
  ]);
  if (!desafio) return null;

  const participantes: ParticipanteSeguimiento[] = personas.map((persona) => {
    const respuesta = persona.completitudes[0];
    return {
      id: persona.id,
      nombre: persona.nombre,
      urlFoto: persona.urlFoto,
      esStaff: persona.esStaff,
      respondio: Boolean(respuesta),
      estado: respuesta?.estado ?? "SIN_RESPUESTA",
      puntosOtorgados: respuesta?.puntosOtorgados ?? 0,
      respondidoEn: respuesta?.completadoEn.toISOString() ?? null,
    };
  }).sort((a, b) => {
    if (a.respondio !== b.respondio) return a.respondio ? -1 : 1;
    if (a.respondidoEn && b.respondidoEn) return b.respondidoEn.localeCompare(a.respondidoEn);
    return a.nombre.localeCompare(b.nombre, "es");
  });

  const respondieron = participantes.filter((persona) => persona.respondio);
  const totalParticipantes = participantes.length;
  const cierre = desafio.estado === "PUBLICADO" ? fechaCierreDesafio(desafio) : null;
  return {
    desafio: {
      id: desafio.id,
      titulo: desafio.titulo,
      estado: desafio.estado,
      categoria: etiquetaDiaDesafio(desafio.dia),
      puntos: desafio.puntos,
      cierraEn: cierre?.toISOString() ?? null,
      limiteCompletitudes: desafio.limiteCompletitudes,
    },
    resumen: {
      totalParticipantes,
      respondieron: respondieron.length,
      pendientes: totalParticipantes - respondieron.length,
      aprobadas: respondieron.filter((persona) => persona.estado === "APROBADO").length,
      pendientesRevision: respondieron.filter((persona) => persona.estado === "PENDIENTE").length,
      rechazadas: respondieron.filter((persona) => persona.estado === "RECHAZADO").length,
      puntosOtorgados: respondieron.reduce((total, persona) => total + persona.puntosOtorgados, 0),
      porcentaje: totalParticipantes ? Math.round((respondieron.length / totalParticipantes) * 100) : 0,
    },
    participantes,
  };
}
