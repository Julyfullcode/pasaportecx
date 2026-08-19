import { esConfiguracionEncuestaMixta } from "@/lib/encuesta-mixta";

type RegistroEncuesta = {
  configuracion: unknown;
  respuesta: unknown;
};

export type ResumenSatisfaccion = {
  promedio: number | null;
  respuestas: number;
  sumaCalificaciones: number;
  comentarios: string[];
};

const PREGUNTA_SATISFACCION_GENERAL = "En general, ¿qué tan satisfecho(a) te encuentras con la jornada de hoy?";

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? valor as Record<string, unknown>
    : null;
}

function normalizarPregunta(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function esPreguntaSatisfaccionGeneral(texto: string) {
  return normalizarPregunta(texto) === normalizarPregunta(PREGUNTA_SATISFACCION_GENERAL);
}

function esPreguntaPositiva(texto: string) {
  return !/ajust|diferente|mejorar|cambiar|suger|por-ajustar/i.test(texto);
}

export function resumirSatisfaccion(registros: RegistroEncuesta[]): ResumenSatisfaccion {
  const calificaciones: number[] = [];
  const comentarios: string[] = [];

  for (const registro of registros) {
    const respuesta = objeto(registro.respuesta);
    if (!respuesta) continue;

    if (esConfiguracionEncuestaMixta(registro.configuracion)) {
      const respuestas = objeto(respuesta.respuestas) ?? {};
      const preguntaSatisfaccion = registro.configuracion.preguntas.find((pregunta) => (
        pregunta.tipo === "ESCALA_0_10" && esPreguntaSatisfaccionGeneral(pregunta.titulo)
      ));
      const calificacion = preguntaSatisfaccion ? respuestas[preguntaSatisfaccion.id] : undefined;
      if (typeof calificacion === "number" && Number.isInteger(calificacion) && calificacion >= 0 && calificacion <= 10) {
        calificaciones.push(calificacion);
      }

      for (const pregunta of registro.configuracion.preguntas) {
        if (pregunta.tipo !== "ABIERTA" || !esPreguntaPositiva(`${pregunta.id} ${pregunta.titulo}`)) continue;
        const comentario = respuestas[pregunta.id];
        if (typeof comentario === "string" && comentario.trim().length >= 12) comentarios.push(comentario.trim());
      }
      continue;
    }

    const configuracion = objeto(registro.configuracion);
    const pregunta = typeof configuracion?.pregunta === "string" ? configuracion.pregunta : "";
    const valor = respuesta.valor;
    if (esPreguntaSatisfaccionGeneral(pregunta) && typeof valor === "number" && Number.isInteger(valor) && valor >= 0 && valor <= 10) {
      calificaciones.push(valor);
    }
  }

  const sumaCalificaciones = calificaciones.reduce((total, calificacion) => total + calificacion, 0);
  const promedio = calificaciones.length ? sumaCalificaciones / calificaciones.length : null;

  return {
    promedio,
    respuestas: calificaciones.length,
    sumaCalificaciones,
    comentarios: [...new Set(comentarios)],
  };
}
