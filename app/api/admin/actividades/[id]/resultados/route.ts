import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { crearExcel } from "@/lib/excel";
import { preguntasDe } from "@/lib/actividad";

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
        include: { participante: { include: { correoAutorizado: true } } },
      },
    },
  });
  if (!actividad) return Response.json({ error: "Actividad no encontrada." }, { status: 404 });
  const preguntas = preguntasDe(actividad.configuracion);
  const empresas = await db.empresa.findMany({ select: { id: true, nombre: true } });
  const nombreEmpresa = new Map(empresas.map((empresa) => [empresa.id, empresa.nombre]));
  const porParticipante = new Map<string, typeof actividad.respuestas>();
  for (const respuesta of actividad.respuestas) {
    const lista = porParticipante.get(respuesta.participanteId) ?? [];
    lista.push(respuesta);
    porParticipante.set(respuesta.participanteId, lista);
  }
  const encabezado = actividad.anonima
    ? ["Respuesta", "Empresa evaluada", ...preguntas.map((pregunta) => pregunta.titulo)]
    : ["Participante", "Correo", "Empresa evaluada", ...preguntas.map((pregunta) => pregunta.titulo)];
  const filas = [encabezado, ...Array.from(porParticipante.values()).map((respuestas, indice) => {
    const primera = respuestas[0];
    const identidad = actividad.anonima
      ? [`Respuesta ${indice + 1}`]
      : [primera.participante.nombre, primera.participante.correoAutorizado?.correo ?? ""];
    return [
      ...identidad,
      nombreEmpresa.get(primera.empresaEvaluadaId ?? "") ?? "",
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
