import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { etiquetaDiaDesafio } from "@/lib/dia-desafio";
import { esConfiguracionPuntualidad } from "@/lib/puntualidad";
import { crearExcel } from "@/lib/excel";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tipo: string }> },
) {
  await requerirAdmin();
  const { tipo } = await params;
  let filas: (string | number | null | undefined)[][];
  if (tipo === "participantes" || tipo === "ranking-individual") {
    const esRanking = tipo === "ranking-individual";
    const datos = await db.participante.findMany({
      where: esRanking ? { activo: true, esStaff: false } : undefined,
      orderBy: { puntosTotales: "desc" },
      include: { empresa: true, equipo: true, dependencia: true, correoAutorizado: true },
    });
    filas = [
      ["Posición", "Nombre", "Correo", "Empresa", "Dependencia", "Equipo", "Puntos", "Staff", "Tiene licencia", "Activo", "Registrado"],
      ...datos.map((p, i) => [i + 1, p.nombre, p.correoAutorizado?.correo, p.empresa.nombre, p.dependencia?.nombre ?? "", p.equipo?.nombre ?? "", p.puntosTotales, p.esStaff ? "Sí" : "No", p.tieneLicencia ? "Sí" : "No", p.activo ? "Sí" : "No", p.creadoEn.toISOString()]),
    ];
  } else if (tipo === "completitudes") {
    const datos = await db.completitud.findMany({ include: { participante: true, desafio: true }, orderBy: { completadoEn: "asc" } });
    filas = [["Participante", "Staff", "Desafío", "Tipo", "Día", "Estado", "Puntos", "Fecha"], ...datos.map((c) => [c.participante.nombre, c.participante.esStaff ? "Sí" : "No", c.desafio.titulo, esConfiguracionPuntualidad(c.desafio.configuracion) ? "PUNTUALIDAD" : c.desafio.tipo, etiquetaDiaDesafio(c.desafio.dia), c.estado, c.puntosOtorgados, c.completadoEn.toISOString()])];
  } else if (tipo === "encuestas") {
    const datos = await db.completitud.findMany({ where: { desafio: { tipo: "ENCUESTA" } }, include: { participante: true, desafio: true } });
    filas = [["Participante", "Staff", "Encuesta", "Respuesta", "Fecha"], ...datos.map((c) => [c.participante.nombre, c.participante.esStaff ? "Sí" : "No", c.desafio.titulo, JSON.stringify(c.respuesta), c.completadoEn.toISOString()])];
  } else if (tipo === "actividades") {
    const datos = await db.respuestaActividad.findMany({
      include: { participante: true, actividad: true },
      orderBy: { respondidoEn: "asc" },
    });
    filas = [
      ["Participante", "Staff", "Actividad", "Pregunta", "Respuesta", "Fecha"],
      ...datos.map((item) => [
        item.actividad.anonima ? "Anónimo" : item.participante.nombre,
        item.participante.esStaff ? "Sí" : "No",
        item.actividad.titulo,
        item.preguntaId,
        JSON.stringify(item.respuesta),
        item.respondidoEn.toISOString(),
      ]),
    ];
  } else if (tipo === "empresas") {
    const datos = await db.empresa.findMany({ include: { participantes: true }, orderBy: { orden: "asc" } });
    filas = [["Empresa", "Participantes", "Puntos totales"], ...datos.map((e) => [e.nombre, e.participantes.length, e.participantes.reduce((s, p) => s + p.puntosTotales, 0)])];
  } else {
    return Response.json({ error: "Reporte no encontrado" }, { status: 404 });
  }
  const nombresHoja: Record<string, string> = {
    participantes: "Participantes",
    "ranking-individual": "Ranking individual",
    completitudes: "Desafíos completados",
    encuestas: "Encuestas",
    actividades: "Actividades",
    empresas: "Empresas",
  };
  const archivo = await crearExcel(filas, nombresHoja[tipo] ?? "Reporte");
  return new Response(archivo, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-${tipo}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
