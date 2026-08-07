import type { PreguntaActividad } from "@/lib/actividad";

type RespuestaAnalisis = {
  participanteId: string;
  preguntaId: string;
  empresaEvaluadaId: string | null;
  respuesta: unknown;
};

const palabrasVacias = new Set([
  "para", "como", "pero", "porque", "cuando", "donde", "desde", "hasta", "sobre", "entre", "esta", "este", "esto", "estas", "estos", "tiene", "tener", "todo", "toda", "todos", "todas", "muy", "mas", "más", "con", "sin", "por", "que", "una", "uno", "unos", "unas", "del", "las", "los", "fue", "son", "se", "lo", "la", "el", "en", "de", "y", "o", "al", "un", "es", "no", "si", "ya", "mi", "su", "sus", "me", "bien", "canal", "whatsapp",
]);

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function recortar(texto: string, maximo = 240) {
  const limpio = texto.trim().replace(/\s+/g, " ");
  return limpio.length <= maximo ? limpio : `${limpio.slice(0, maximo - 1).trim()}…`;
}

function respuestaTexto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function muestraPorPregunta(preguntas: PreguntaActividad[], respuestas: RespuestaAnalisis[], expresion: RegExp) {
  const pregunta = preguntas.find((item) => expresion.test(normalizar(`${item.id} ${item.titulo}`)));
  if (!pregunta) return [];
  return respuestas.filter((item) => item.preguntaId === pregunta.id).map((item) => respuestaTexto(item.respuesta)).filter(Boolean).sort((a, b) => b.length - a.length).slice(0, 2).map((item) => recortar(item));
}

export function analizarRespuestasActividad(preguntas: PreguntaActividad[], respuestas: RespuestaAnalisis[]) {
  const participantes = new Set(respuestas.map((item) => item.participanteId));
  const empresas = new Set(respuestas.map((item) => item.empresaEvaluadaId).filter(Boolean));
  const frecuencia = new Map<string, number>();
  for (const respuesta of respuestas) {
    const palabras = new Set(normalizar(respuestaTexto(respuesta.respuesta)).match(/[a-zñ]{4,}/g) ?? []);
    for (const palabra of palabras) if (!palabrasVacias.has(palabra)) frecuencia.set(palabra, (frecuencia.get(palabra) ?? 0) + 1);
  }
  const temas = Array.from(frecuencia.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([palabra]) => palabra);
  const fortalezas = muestraPorPregunta(preguntas, respuestas, /positivo|funciono|fortaleza/);
  const fricciones = muestraPorPregunta(preguntas, respuestas, /friccion|dificultad|problema/);
  const oportunidades = muestraPorPregunta(preguntas, respuestas, /mejora|oportunidad/);
  const total = participantes.size;
  const conclusion = total === 0
    ? "Aún no hay respuestas suficientes para construir una conclusión."
    : `Se consolidaron ${total} ${total === 1 ? "evaluación" : "evaluaciones"} de ${empresas.size} ${empresas.size === 1 ? "empresa" : "empresas"}. ${temas.length ? `Los temas con mayor recurrencia son ${temas.slice(0, 4).join(", ")}. ` : ""}${fricciones.length ? "Las respuestas muestran fricciones concretas que conviene priorizar y contrastar con los recorridos realizados. " : ""}${oportunidades.length ? "También se identificaron propuestas que pueden convertirse en hipótesis de mejora del canal." : "La siguiente conversación debería profundizar en las causas y oportunidades señaladas."}`;
  return { total, empresas: empresas.size, temas, fortalezas, fricciones, oportunidades, conclusion };
}
