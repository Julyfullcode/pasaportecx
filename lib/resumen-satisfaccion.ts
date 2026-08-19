import { esConfiguracionEncuestaMixta } from "@/lib/encuesta-mixta";

type RegistroEncuesta = {
  configuracion: unknown;
  respuesta: unknown;
};

export type ResumenSatisfaccion = {
  nps: number | null;
  respuestasNps: number;
  promotores: number;
  pasivos: number;
  detractores: number;
  comentarios: string[];
};

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? valor as Record<string, unknown>
    : null;
}

function esPreguntaNps(texto: string) {
  return /recomend|\bnps\b/i.test(texto);
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
      const escalas = registro.configuracion.preguntas.filter((pregunta) => pregunta.tipo === "ESCALA_0_10");
      const preguntaNps = escalas.find((pregunta) => esPreguntaNps(`${pregunta.id} ${pregunta.titulo}`))
        ?? escalas.find((pregunta) => /satisfacci/i.test(`${pregunta.id} ${pregunta.titulo}`))
        ?? escalas[0];
      const calificacion = preguntaNps ? respuestas[preguntaNps.id] : undefined;
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
    if (esPreguntaNps(pregunta) && typeof valor === "number" && Number.isInteger(valor) && valor >= 0 && valor <= 10) {
      calificaciones.push(valor);
    }
  }

  const promotores = calificaciones.filter((valor) => valor >= 9).length;
  const pasivos = calificaciones.filter((valor) => valor >= 7 && valor <= 8).length;
  const detractores = calificaciones.filter((valor) => valor <= 6).length;
  const nps = calificaciones.length
    ? Math.round(((promotores - detractores) / calificaciones.length) * 100)
    : null;

  return {
    nps,
    respuestasNps: calificaciones.length,
    promotores,
    pasivos,
    detractores,
    comentarios: [...new Set(comentarios)].slice(0, 12),
  };
}
