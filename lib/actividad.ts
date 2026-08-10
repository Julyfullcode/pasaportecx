import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

export const ACTIVIDAD_CONOCIMIENTO_ID = "actividad-conocimiento-indicadores-mejora";
export const ACTIVIDAD_WHATSAPP_ID = "actividad-evaluacion-canal-whatsapp";
export const INVITACION_ACTIVIDAD_CONOCIMIENTO =
  "Te invitamos a recorrer cinco momentos para conectar la voz de clientes y empleados con las decisiones que transforman la experiencia. Responde y al finalizar cada pregunta descubrirás una idea clave para conversar en equipo.";

export type OpcionActividad = { id: string; texto: string };
export type AfirmacionActividad = { id: string; texto: string; correcta: boolean };

export type PreguntaActividad = {
  id: string;
  titulo: string;
  contexto: string;
  tipo: "OPCION_UNICA" | "VERDADERO_FALSO" | "RESPUESTA_ABIERTA";
  opciones?: OpcionActividad[];
  afirmaciones?: AfirmacionActividad[];
  respuestaCorrecta?: string | string[];
  insight: string;
};

export type ConfiguracionActividad = { preguntas: PreguntaActividad[] };

export const ACTIVIDAD_CONOCIMIENTO = {
  titulo: "Conocer, medir, conectar y actuar",
  invitacion: INVITACION_ACTIVIDAD_CONOCIMIENTO,
  cierre:
    "No medimos para tener un indicador. Escuchamos y medimos para comprender; comprendemos para conectar; conectamos para actuar; y actuamos para que la experiencia realmente evolucione.",
  configuracion: {
    preguntas: [
      {
        id: "conocer-clientes",
        titulo: "¿Cómo conocemos mejor a nuestros clientes?",
        contexto:
          "Queremos comprender mejor qué están viviendo nuestros clientes y usuarios. En el proceso aparecen tres señales: durante una atención, un cliente comenta espontáneamente algo que le resultó difícil; después de una gestión, la empresa envía una encuesta; y un estudio sectorial identifica nuevas expectativas frente a la facilidad y oportunidad del servicio. Si tuvieras que organizar estas señales según de dónde viene la información, ¿cuál opción escogerías?",
        tipo: "OPCION_UNICA" as const,
        opciones: [
          { id: "a", texto: "Escucha espontánea; escucha solicitada; y escucha del entorno." },
          { id: "b", texto: "Escucha relacional, escucha transaccional y escucha sectorial." },
          { id: "c", texto: "La señal 1 es escucha espontánea; la 2 es una medición y no una fuente de escucha; la 3 es escucha externa." },
          { id: "d", texto: "Retroalimentación operativa; escucha solicitada; y monitoreo de mercado." },
        ],
        respuestaCorrecta: "a",
        insight:
          "Conocer al cliente no consiste en encontrar una única fuente correcta. Consiste en conectar fuentes que muestran partes distintas de una misma realidad.",
      },
      {
        id: "conocer-empleados",
        titulo: "¿Y cómo conocemos mejor a nuestros empleados?",
        contexto:
          "Queremos comprender cómo las personas perciben, viven y sienten su relación con la organización a lo largo del viaje del empleado, qué facilita su trabajo, dónde encuentran fricciones y cómo cambia su experiencia. ¿Cuál aproximación permitiría comprenderla de manera más integral?",
        tipo: "OPCION_UNICA" as const,
        opciones: [
          { id: "a", texto: "Medir recomendación (eNPS) y experiencia general (IEX), utilizando esos resultados como lectura principal." },
          { id: "b", texto: "Combinar mediciones generales y de etapas específicas del viaje con conversaciones y análisis por perfiles." },
          { id: "c", texto: "Segmentar primero por perfiles y etapas del viaje, concentrándose en las diferencias antes de integrar otras fuentes." },
        ],
        respuestaCorrecta: "b",
        insight:
          "El cliente ayuda a comprender cómo se vive la experiencia hacia afuera. El empleado ayuda a comprender qué ocurre hacia adentro para hacerla posible. Conectar ambas miradas genera mejores preguntas de investigación.",
      },
      {
        id: "medir-clientes",
        titulo: "¿Qué necesitamos medir para comprender la experiencia del cliente?",
        contexto: "Marca intuitivamente si consideras verdadera o falsa cada afirmación.",
        tipo: "VERDADERO_FALSO" as const,
        afirmaciones: [
          { id: "a", texto: "Para fortalecer la relación con los clientes, es relevante conocer qué tan satisfechos están con la empresa y qué tan dispuestos estarían a recomendarla.", correcta: true },
          { id: "b", texto: "También es importante monitorear cómo viven los clientes algunas interacciones o transacciones clave de la organización.", correcta: true },
          { id: "c", texto: "Si queremos saber cómo fue una interacción específica, podemos utilizar la medición general de la relación del cliente con la empresa.", correcta: false },
          { id: "d", texto: "No deberíamos medir la experiencia en la atención de quejas o reclamos porque el cliente ya viene molesto y calificará mal.", correcta: false },
        ],
        insight:
          "Un resultado bajo no es una razón para dejar de medir; puede ser la señal que necesitamos para mejorar. La medición relacional muestra cómo evoluciona la relación, mientras la transaccional identifica qué momentos concretos la fortalecen o deterioran.",
      },
      {
        id: "medir-empleados",
        titulo: "¿Qué deberíamos medir para comprender mejor la experiencia del empleado?",
        contexto: "Ahora pensemos en las mediciones del empleado.",
        tipo: "VERDADERO_FALSO" as const,
        afirmaciones: [
          { id: "a", texto: "Un eNPS alto permite concluir que la experiencia general del empleado con la organización también es positiva.", correcta: false },
          { id: "b", texto: "La medición del eNPS permite conocer la satisfacción general del empleado con la empresa.", correcta: false },
          { id: "c", texto: "Puede ser relevante medir cómo vive el empleado etapas específicas de su experiencia, especialmente las que impactan su trabajo cotidiano.", correcta: true },
          { id: "d", texto: "Relacionar indicadores de empleados con datos de procesos y clientes puede revelar conexiones útiles para decidir dónde intervenir.", correcta: true },
        ],
        insight:
          "CX y EX no son la misma experiencia, pero tampoco ocurren aisladas. Correlacionar señales puede revelar relaciones relevantes; una correlación orienta la investigación, no demuestra automáticamente causalidad.",
      },
      {
        id: "actuar",
        titulo: "Ya conocemos y medimos. ¿Qué hacemos con esta información?",
        contexto:
          "La empresa identifica un patrón: algunas gestiones resultan difíciles y requieren varios contactos; resolverlas exige consultar diferentes fuentes, coordinar áreas o escalar decisiones; y las mediciones confirman que no es un caso aislado. ¿Qué debería hacer ahora?",
        tipo: "OPCION_UNICA" as const,
        opciones: [
          { id: "a", texto: "Seguir midiendo algunos meses para tener mayor certeza antes de actuar." },
          { id: "b", texto: "Contactar únicamente a los clientes con las peores evaluaciones." },
          { id: "c", texto: "Atender las experiencias afectadas mientras se trabaja sobre las causas que están generando el patrón." },
          { id: "d", texto: "Concentrarse en mejorar el indicador; si sube, asumir que el problema fue solucionado." },
        ],
        respuestaCorrecta: "c",
        insight:
          "Conocer no genera valor por sí solo. El conocimiento adquiere sentido cuando activa decisiones, acciones, aprendizaje y verificación de impacto.",
      },
    ],
  } satisfies ConfiguracionActividad,
};

export const ACTIVIDAD_WHATSAPP = {
  titulo: "Evaluación del canal WhatsApp",
  invitacion:
    "Te invitamos a recorrer el canal de WhatsApp de una de las empresas del Grupo EPM y registrar lo que encuentres. Tus respuestas serán anónimas y nos ayudarán a reconocer fortalezas, fricciones y oportunidades de mejora.",
  cierre:
    "Gracias por compartir tu evaluación. Cada observación nos ayuda a comprender mejor la experiencia y a convertir los hallazgos en oportunidades concretas de mejora.",
  configuracion: {
    preguntas: [
      {
        id: "recorrido-realizado",
        titulo: "¿Qué recorrido o consulta realizaste en el canal de WhatsApp?",
        contexto: "Describe brevemente qué intentaste hacer y hasta dónde pudiste avanzar.",
        tipo: "RESPUESTA_ABIERTA" as const,
        insight: "Comprender el recorrido permite interpretar cada hallazgo dentro del momento real en que ocurrió.",
      },
      {
        id: "aspectos-positivos",
        titulo: "¿Qué funcionó bien durante la experiencia?",
        contexto: "Cuéntanos qué te pareció claro, fácil, útil o agradable.",
        tipo: "RESPUESTA_ABIERTA" as const,
        insight: "Reconocer lo que funciona bien ayuda a proteger y replicar las fortalezas del canal.",
      },
      {
        id: "fricciones",
        titulo: "¿Qué dificultades o fricciones encontraste?",
        contexto: "Describe cualquier momento confuso, lento, repetitivo o que te impidió continuar.",
        tipo: "RESPUESTA_ABIERTA" as const,
        insight: "Las fricciones muestran dónde concentrar la investigación y priorizar mejoras.",
      },
      {
        id: "oportunidad-mejora",
        titulo: "¿Qué mejorarías del canal de WhatsApp?",
        contexto: "Propón cambios que harían la experiencia más clara, ágil o resolutiva.",
        tipo: "RESPUESTA_ABIERTA" as const,
        insight: "Las propuestas convierten la observación en una primera hipótesis de acción.",
      },
    ],
  } satisfies ConfiguracionActividad,
};

function textoValido(valor: unknown, maximo = 5000) {
  return typeof valor === "string" && valor.trim().length > 0 && valor.length <= maximo;
}

export function leerConfiguracionActividad(valor: unknown): ConfiguracionActividad | null {
  if (!valor || typeof valor !== "object" || !("preguntas" in valor) || !Array.isArray(valor.preguntas)) return null;
  if (valor.preguntas.length < 1 || valor.preguntas.length > 20) return null;
  const ids = new Set<string>();
  for (const pregunta of valor.preguntas) {
    if (!pregunta || typeof pregunta !== "object") return null;
    const item = pregunta as Record<string, unknown>;
    if (!textoValido(item.id, 80) || ids.has(item.id as string) || !textoValido(item.titulo) || !textoValido(item.contexto) || !textoValido(item.insight)) return null;
    ids.add(item.id as string);
    if (item.tipo === "OPCION_UNICA") {
      if (!Array.isArray(item.opciones) || item.opciones.length < 2 || item.opciones.length > 10) return null;
      if (item.opciones.some((opcion) => !opcion || typeof opcion !== "object" || !textoValido((opcion as Record<string, unknown>).id, 20) || !textoValido((opcion as Record<string, unknown>).texto))) return null;
    } else if (item.tipo === "VERDADERO_FALSO") {
      if (!Array.isArray(item.afirmaciones) || item.afirmaciones.length < 1 || item.afirmaciones.length > 12) return null;
      if (item.afirmaciones.some((afirmacion) => !afirmacion || typeof afirmacion !== "object" || !textoValido((afirmacion as Record<string, unknown>).id, 20) || !textoValido((afirmacion as Record<string, unknown>).texto) || typeof (afirmacion as Record<string, unknown>).correcta !== "boolean")) return null;
    } else if (item.tipo !== "RESPUESTA_ABIERTA") return null;
  }
  return valor as ConfiguracionActividad;
}

export async function asegurarActividadConocimiento() {
  const actividad = await db.actividad.upsert({
    where: { id: ACTIVIDAD_CONOCIMIENTO_ID },
    update: {},
    create: {
      id: ACTIVIDAD_CONOCIMIENTO_ID,
      codigoAcceso: randomUUID().replace(/-/g, ""),
      titulo: ACTIVIDAD_CONOCIMIENTO.titulo,
      invitacion: ACTIVIDAD_CONOCIMIENTO.invitacion,
      cierre: ACTIVIDAD_CONOCIMIENTO.cierre,
      configuracion: ACTIVIDAD_CONOCIMIENTO.configuracion as unknown as Prisma.InputJsonValue,
    },
  });
  if (actividad.codigoAcceso) return actividad;
  return db.actividad.update({ where: { id: actividad.id }, data: { codigoAcceso: randomUUID().replace(/-/g, "") } });
}

export async function asegurarActividadWhatsapp() {
  const actividad = await db.actividad.upsert({
    where: { id: ACTIVIDAD_WHATSAPP_ID },
    update: {},
    create: {
      id: ACTIVIDAD_WHATSAPP_ID,
      tipo: "EVALUACION_WHATSAPP",
      codigoAcceso: randomUUID().replace(/-/g, ""),
      anonima: true,
      requiereEmpresa: true,
      titulo: ACTIVIDAD_WHATSAPP.titulo,
      invitacion: ACTIVIDAD_WHATSAPP.invitacion,
      cierre: ACTIVIDAD_WHATSAPP.cierre,
      configuracion: ACTIVIDAD_WHATSAPP.configuracion as unknown as Prisma.InputJsonValue,
    },
  });
  if (actividad.codigoAcceso) return actividad;
  return db.actividad.update({ where: { id: actividad.id }, data: { codigoAcceso: randomUUID().replace(/-/g, "") } });
}

export async function asegurarActividadesBase() {
  return Promise.all([asegurarActividadConocimiento(), asegurarActividadWhatsapp()]);
}

export function preguntasDe(valor: unknown) {
  return leerConfiguracionActividad(valor)?.preguntas ?? [];
}

export function idsRespuestasCorrectas(pregunta: PreguntaActividad) {
  if (pregunta.tipo !== "OPCION_UNICA") return [];
  const valores = Array.isArray(pregunta.respuestaCorrecta)
    ? pregunta.respuestaCorrecta
    : pregunta.respuestaCorrecta ? [pregunta.respuestaCorrecta] : [];
  const validas = new Set((pregunta.opciones ?? []).map((opcion) => opcion.id));
  return [...new Set(valores.filter((id) => validas.has(id)))];
}

export function descripcionRespuestaCorrecta(pregunta: PreguntaActividad) {
  if (pregunta.tipo === "OPCION_UNICA") {
    const ids = idsRespuestasCorrectas(pregunta);
    return ids.map((id) => {
      const opcion = pregunta.opciones?.find((item) => item.id === id);
      return opcion ? `${id.toUpperCase()}. ${opcion.texto}` : id.toUpperCase();
    }).join(" · ");
  }
  if (pregunta.tipo === "VERDADERO_FALSO") {
    return (pregunta.afirmaciones ?? [])
      .map((afirmacion) => `${afirmacion.id.toUpperCase()}. ${afirmacion.correcta ? "Verdadero" : "Falso"}`)
      .join(" · ");
  }
  return "";
}

export function evaluarRespuestaActividad(pregunta: PreguntaActividad, respuesta: unknown) {
  const descripcion = descripcionRespuestaCorrecta(pregunta);
  if (!descripcion) return null;
  let esCorrecta = false;
  let cantidadCorrectas = 1;
  if (pregunta.tipo === "OPCION_UNICA") {
    const correctas = idsRespuestasCorrectas(pregunta);
    const seleccionadas = Array.isArray(respuesta)
      ? respuesta.filter((item): item is string => typeof item === "string")
      : typeof respuesta === "string" ? [respuesta] : [];
    cantidadCorrectas = correctas.length;
    esCorrecta = seleccionadas.length === correctas.length
      && correctas.every((id) => seleccionadas.includes(id));
  } else if (pregunta.tipo === "VERDADERO_FALSO" && respuesta && typeof respuesta === "object" && !Array.isArray(respuesta)) {
    const mapa = respuesta as Record<string, unknown>;
    cantidadCorrectas = pregunta.afirmaciones?.length ?? 1;
    esCorrecta = Boolean(pregunta.afirmaciones?.every((afirmacion) => mapa[afirmacion.id] === afirmacion.correcta));
  }
  return {
    esCorrecta,
    respuestaCorrecta: descripcion,
    mensaje: esCorrecta
      ? "¡Acertaste! Tu respuesta es correcta."
      : `Esta vez no acertaste, ${cantidadCorrectas > 1 ? "las respuestas correctas son" : "la respuesta correcta es"} ${descripcion}.`,
  };
}

export function respuestaActividadValida(pregunta: PreguntaActividad, respuesta: unknown) {
  if (pregunta.tipo === "OPCION_UNICA") {
    const idsValidos = new Set((pregunta.opciones ?? []).map((opcion) => opcion.id));
    const seleccionMultiple = idsRespuestasCorrectas(pregunta).length > 1;
    if (seleccionMultiple) {
      return Array.isArray(respuesta)
        && respuesta.length > 0
        && new Set(respuesta).size === respuesta.length
        && respuesta.every((id) => typeof id === "string" && idsValidos.has(id));
    }
    return typeof respuesta === "string" && idsValidos.has(respuesta);
  }
  if (pregunta.tipo === "RESPUESTA_ABIERTA") {
    return typeof respuesta === "string" && respuesta.trim().length >= 2 && respuesta.length <= 4000;
  }
  if (!respuesta || typeof respuesta !== "object" || Array.isArray(respuesta)) return false;
  const mapa = respuesta as Record<string, unknown>;
  return Boolean(pregunta.afirmaciones?.every((afirmacion) => typeof mapa[afirmacion.id] === "boolean"));
}
