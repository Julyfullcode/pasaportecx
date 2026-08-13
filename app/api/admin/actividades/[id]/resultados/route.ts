import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { crearExcel } from "@/lib/excel";
import { preguntasDe } from "@/lib/actividad";
import { TIPO_JUEGO_CX_EX } from "@/lib/juego-cx-ex";

function textoRespuesta(valor: unknown) {
  if (typeof valor === "string") return valor;
  if (valor && typeof valor === "object" && !Array.isArray(valor)) {
    return Object.entries(valor as Record<string, unknown>).map(([clave, respuesta]) => `${clave.toUpperCase()}: ${respuesta === true ? "Verdadero" : respuesta === false ? "Falso" : String(respuesta)}`).join(" | ");
  }
  return JSON.stringify(valor ?? "");
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requerirAdmin();
  const { id } = await params;
  const actividad = await db.actividad.findUnique({
    where: { id },
    include: {
      respuestas: {
        orderBy: { respondidoEn: "asc" },
        include: {
          participante: {
            include: {
              correoAutorizado: { select: { correo: true } },
              empresa: { select: { nombre: true } },
              dependencia: { select: { nombre: true } },
              equipo: { select: { nombre: true } },
            },
          },
        },
      },
      resultadosJuego: { orderBy: [{ puntaje: "desc" }, { segundos: "asc" }], include: { equipo: { select: { nombre: true } }, participante: { select: { nombre: true } } } },
    },
  });
  if (!actividad) return Response.json({ error: "Actividad no encontrada." }, { status: 404 });
  if (actividad.tipo === TIPO_JUEGO_CX_EX) {
    const filas = [["Posición", "Equipo", "Nombre creativo", "Puntaje", "Tiempo (segundos)", "Viaje", "Conexiones CX-EX", "Causas", "Solución", "Beneficios", "Reflexión", "Registró", "Fecha"], ...actividad.resultadosJuego.map((item, indice) => {
      const desglose = item.desglose as Record<string, number>;
      return [indice + 1, item.equipo.nombre, item.nombreEquipo ?? "", item.puntaje, item.segundos, desglose.viaje ?? 0, desglose.conexiones ?? 0, desglose.causas ?? 0, desglose.solucion ?? 0, desglose.beneficios ?? 0, item.reflexion, item.participante.nombre, item.actualizadoEn.toLocaleString("es-CO")];
    })];
    const archivo = await crearExcel(filas, "Clasificación");
    return new Response(archivo, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="resultados-juego-cx-ex.xlsx"`, "Cache-Control": "private, no-store" } });
  }
  const preguntas = preguntasDe(actividad.configuracion);
  const empresas = await db.empresa.findMany({ select: { id: true, nombre: true } });
  const nombreEmpresa = new Map(empresas.map((empresa) => [empresa.id, empresa.nombre]));
  const porParticipante = new Map<string, typeof actividad.respuestas>();
  for (const respuesta of actividad.respuestas) {
    const lista = porParticipante.get(respuesta.participanteId) ?? [];
    lista.push(respuesta);
    porParticipante.set(respuesta.participanteId, lista);
  }
  const encabezado = [
    "Número de evaluación",
    "ID del participante",
    "Participante",
    "Nombres",
    "Apellidos",
    "Correo",
    "Empresa del participante",
    "Dependencia",
    "Equipo",
    "Staff",
    "Tiene licencia",
    "Empresa evaluada",
    "Inicio de la evaluación",
    "Última respuesta",
    "Estado",
    "Preguntas respondidas",
    "Total de preguntas",
    ...preguntas.map((pregunta) => pregunta.titulo),
  ];
  const formatoFecha = (fecha: Date) => fecha.toLocaleString("es-CO", { timeZone: "America/Bogota" });
  const filas = [encabezado, ...Array.from(porParticipante.values()).map((respuestas, indice) => {
    const primera = respuestas[0];
    const participante = primera.participante;
    const empresaEvaluadaId = respuestas.find((respuesta) => respuesta.empresaEvaluadaId)?.empresaEvaluadaId ?? "";
    const fechas = respuestas.map((respuesta) => respuesta.respondidoEn.getTime());
    const respondidas = preguntas.filter((pregunta) => respuestas.some((respuesta) => respuesta.preguntaId === pregunta.id)).length;
    return [
      indice + 1,
      participante.id,
      participante.nombre,
      participante.nombres ?? "",
      participante.apellidos ?? "",
      participante.correoAutorizado?.correo ?? "",
      participante.empresa.nombre,
      participante.dependencia?.nombre ?? "",
      participante.equipo?.nombre ?? "",
      participante.esStaff,
      participante.tieneLicencia,
      nombreEmpresa.get(empresaEvaluadaId) ?? empresaEvaluadaId,
      formatoFecha(new Date(Math.min(...fechas))),
      formatoFecha(new Date(Math.max(...fechas))),
      respondidas === preguntas.length ? "Completa" : "Incompleta",
      respondidas,
      preguntas.length,
      ...preguntas.map((pregunta) => textoRespuesta(respuestas.find((respuesta) => respuesta.preguntaId === pregunta.id)?.respuesta)),
    ];
  })];
  const archivo = await crearExcel(filas, "Resultados");
  return new Response(archivo, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="resultados-${actividad.id}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
