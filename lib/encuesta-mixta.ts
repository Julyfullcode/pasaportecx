export const FORMATO_ENCUESTA_MIXTA = "mixta" as const;

export type TipoPreguntaEncuestaMixta = "ESCALA_0_10" | "MATRIZ_0_10" | "ABIERTA";

export type ElementoEncuestaMixta = {
  id: string;
  texto: string;
};

export type PreguntaEncuestaMixta = {
  id: string;
  tipo: TipoPreguntaEncuestaMixta;
  titulo: string;
  descripcion: string;
  elementos: ElementoEncuestaMixta[];
};

export type ConfiguracionEncuestaMixta = {
  formato: typeof FORMATO_ENCUESTA_MIXTA;
  preguntas: PreguntaEncuestaMixta[];
};

export class EncuestaMixtaInvalidaError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "EncuestaMixtaInvalidaError";
  }
}

function texto(valor: unknown, maximo: number) {
  return typeof valor === "string" ? valor.trim().slice(0, maximo) : "";
}

function idSeguro(valor: unknown, prefijo: string, indice: number) {
  const limpio = texto(valor, 80).replace(/[^a-zA-Z0-9_-]/g, "");
  return limpio || `${prefijo}-${indice + 1}`;
}

export function normalizarPreguntasEncuestaMixta(valor: unknown): PreguntaEncuestaMixta[] {
  if (!Array.isArray(valor) || valor.length < 1 || valor.length > 30) {
    throw new EncuestaMixtaInvalidaError("Agrega entre 1 y 30 preguntas a la encuesta mixta.");
  }
  const ids = new Set<string>();
  return valor.map((entrada, indice) => {
    if (!entrada || typeof entrada !== "object") {
      throw new EncuestaMixtaInvalidaError(`Revisa la pregunta ${indice + 1}.`);
    }
    const origen = entrada as Record<string, unknown>;
    const tipo = origen.tipo;
    if (tipo !== "ESCALA_0_10" && tipo !== "MATRIZ_0_10" && tipo !== "ABIERTA") {
      throw new EncuestaMixtaInvalidaError(`Selecciona un tipo válido para la pregunta ${indice + 1}.`);
    }
    let id = idSeguro(origen.id, "pregunta", indice);
    if (ids.has(id)) id = `${id}-${indice + 1}`;
    ids.add(id);
    const titulo = texto(origen.titulo, 240);
    if (titulo.length < 3) {
      throw new EncuestaMixtaInvalidaError(`Escribe la pregunta ${indice + 1}.`);
    }
    const elementosOrigen = Array.isArray(origen.elementos) ? origen.elementos : [];
    const elementos = tipo === "MATRIZ_0_10"
      ? elementosOrigen.map((elemento, elementoIndice) => {
        const datos: Record<string, unknown> = elemento && typeof elemento === "object" ? elemento as Record<string, unknown> : { texto: elemento };
        return {
          id: idSeguro(datos.id, `${id}-elemento`, elementoIndice),
          texto: texto(datos.texto, 180),
        };
      }).filter((elemento) => elemento.texto.length > 0)
      : [];
    if (tipo === "MATRIZ_0_10" && (elementos.length < 1 || elementos.length > 20)) {
      throw new EncuestaMixtaInvalidaError(`Agrega entre 1 y 20 elementos a la pregunta ${indice + 1}.`);
    }
    return { id, tipo, titulo, descripcion: texto(origen.descripcion, 600), elementos };
  });
}

export function configuracionEncuestaMixtaDesdeJson(valor: string): ConfiguracionEncuestaMixta {
  try {
    return { formato: FORMATO_ENCUESTA_MIXTA, preguntas: normalizarPreguntasEncuestaMixta(JSON.parse(valor)) };
  } catch (error) {
    if (error instanceof EncuestaMixtaInvalidaError) throw error;
    throw new EncuestaMixtaInvalidaError("No pudimos leer las preguntas de la encuesta mixta.");
  }
}

export function esConfiguracionEncuestaMixta(valor: unknown): valor is ConfiguracionEncuestaMixta {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return false;
  const config = valor as Record<string, unknown>;
  if (config.formato !== FORMATO_ENCUESTA_MIXTA) return false;
  try {
    normalizarPreguntasEncuestaMixta(config.preguntas);
    return true;
  } catch {
    return false;
  }
}

export function respuestasEncuestaMixtaDesdeFormulario(
  configuracion: ConfiguracionEncuestaMixta,
  formulario: FormData,
) {
  const respuestas: Record<string, string | number | Record<string, number>> = {};
  for (const pregunta of configuracion.preguntas) {
    if (pregunta.tipo === "ABIERTA") {
      const valor = String(formulario.get(`mixta:${pregunta.id}`) ?? "").trim();
      if (!valor) throw new EncuestaMixtaInvalidaError(`Responde: ${pregunta.titulo}`);
      respuestas[pregunta.id] = valor.slice(0, 1200);
      continue;
    }
    if (pregunta.tipo === "ESCALA_0_10") {
      respuestas[pregunta.id] = escalaValida(formulario.get(`mixta:${pregunta.id}`), pregunta.titulo);
      continue;
    }
    respuestas[pregunta.id] = Object.fromEntries(
      pregunta.elementos.map((elemento) => [
        elemento.id,
        escalaValida(formulario.get(`mixta:${pregunta.id}:${elemento.id}`), `${pregunta.titulo}: ${elemento.texto}`),
      ]),
    );
  }
  return respuestas;
}

function escalaValida(valor: FormDataEntryValue | null, etiqueta: string) {
  const numero = Number(valor);
  if (valor === null || !Number.isInteger(numero) || numero < 0 || numero > 10) {
    throw new EncuestaMixtaInvalidaError(`Selecciona una calificación de 0 a 10 para: ${etiqueta}`);
  }
  return numero;
}

export const PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO: PreguntaEncuestaMixta[] = [
  {
    id: "satisfaccion-general",
    tipo: "ESCALA_0_10",
    titulo: "En general, ¿qué tan satisfecho(a) te encuentras con la jornada de hoy?",
    descripcion: "0 nada satisfecho; 10 muy satisfecho",
    elementos: [],
  },
  {
    id: "aspectos-jornada",
    tipo: "MATRIZ_0_10",
    titulo: "¿Cómo calificas tu satisfacción con los siguientes aspectos de la jornada?",
    descripcion: "0 nada satisfecho; 10 muy satisfecho",
    elementos: [
      "Contenidos abordados",
      "Metodología y dinámica",
      "Facilitadores y conducción de las actividades",
      "Oportunidades de interacción y conexión con otros participantes",
      "Organización y logística",
    ].map((textoElemento, indice) => ({ id: `aspecto-${indice + 1}`, texto: textoElemento })),
  },
  {
    id: "mas-valioso",
    tipo: "ABIERTA",
    titulo: "De lo vivido hoy, ¿qué fue lo más valioso para ti?",
    descripcion: "",
    elementos: [],
  },
  {
    id: "por-ajustar",
    tipo: "ABIERTA",
    titulo: "¿Qué deberíamos ajustar o hacer diferente en próximos encuentros?",
    descripcion: "",
    elementos: [],
  },
];
