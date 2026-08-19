import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { etiquetaDiaDesafio } from "@/lib/dia-desafio";
import { esConfiguracionPuntualidad } from "@/lib/puntualidad";
import { crearExcel } from "@/lib/excel";
import { detallarRespuestasEncuesta } from "@/lib/reporte-encuestas";
import { preguntasDe } from "@/lib/actividad";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tipo: string }> },
) {
  await requerirAdmin();
  const { tipo } = await params;
  let filas: (string | number | boolean | null | undefined)[][];
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
    const datos = await db.completitud.findMany({
      where: { desafio: { tipo: "ENCUESTA" } },
      include: { participante: true, desafio: true },
      orderBy: [{ desafio: { dia: "asc" } }, { completadoEn: "asc" }],
    });
    filas = [
      ["Participante", "Staff", "Encuesta", "Día de referencia", "Pregunta", "Descripción o contexto", "Elemento evaluado", "Respuesta", "Puntos", "Estado", "Fecha"],
      ...datos.flatMap((completitud) => detallarRespuestasEncuesta(completitud.desafio.configuracion, completitud.respuesta).map((detalle) => [
        completitud.participante.nombre,
        completitud.participante.esStaff ? "Sí" : "No",
        completitud.desafio.titulo,
        etiquetaDiaDesafio(completitud.desafio.dia),
        detalle.pregunta,
        detalle.descripcion,
        detalle.elemento,
        detalle.respuesta,
        completitud.puntosOtorgados,
        completitud.estado,
        completitud.completadoEn.toISOString(),
      ])),
    ];
  } else if (tipo === "actividades") {
    const [datos, empresas] = await Promise.all([
      db.respuestaActividad.findMany({
        include: {
          participante: {
            include: {
              correoAutorizado: { select: { correo: true } },
              empresa: { select: { nombre: true } },
              dependencia: { select: { nombre: true } },
              equipo: { select: { nombre: true } },
            },
          },
          actividad: true,
        },
        orderBy: { respondidoEn: "asc" },
      }),
      db.empresa.findMany({ select: { id: true, nombre: true } }),
    ]);
    const empresaPorId = new Map(empresas.map((empresa) => [empresa.id, empresa.nombre]));
    filas = [
      ["ID del participante", "Participante", "Nombres", "Apellidos", "Correo", "Empresa del participante", "Dependencia", "Equipo", "Staff", "Tiene licencia", "Actividad", "Tipo de actividad", "Empresa evaluada", "Pregunta", "Descripción o contexto", "Respuesta", "Fecha"],
      ...datos.map((item) => {
        const pregunta = preguntasDe(item.actividad.configuracion).find((opcion) => opcion.id === item.preguntaId);
        return [
          item.participante.id,
          item.participante.nombre,
          item.participante.nombres ?? "",
          item.participante.apellidos ?? "",
          item.participante.correoAutorizado?.correo ?? "",
          item.participante.empresa.nombre,
          item.participante.dependencia?.nombre ?? "",
          item.participante.equipo?.nombre ?? "",
          item.participante.esStaff,
          item.participante.tieneLicencia,
          item.actividad.titulo,
          item.actividad.tipo,
          empresaPorId.get(item.empresaEvaluadaId ?? "") ?? item.empresaEvaluadaId ?? "",
          pregunta?.titulo ?? item.preguntaId,
          pregunta?.contexto ?? "",
          typeof item.respuesta === "string" ? item.respuesta : JSON.stringify(item.respuesta),
          item.respondidoEn.toLocaleString("es-CO", { timeZone: "America/Bogota" }),
        ];
      }),
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
