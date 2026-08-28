import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID = "actividad-universo-arquetipos";
export const TIPO_UNIVERSO_ARQUETIPOS = "UNIVERSO_ARQUETIPOS";
export const RESPUESTA_TEST_UNIVERSO_ID = "universo-test-arquetipo";

export type PlanetaId = "cliente" | "viaje" | "rol" | "actuamos" | "medimos";

export type PlanetaArquetipo = {
  id: PlanetaId;
  numero: number;
  nombre: string;
  arquetipo: string;
  tema: string;
  lema: string;
  descripcion: string;
  color: string;
  colorProfundo: string;
};

export type RetoUniverso = {
  id: string;
  planetaId: PlanetaId;
  titulo: string;
  consigna: string;
  puntos: number;
  orden: number;
  activo: boolean;
};

export type PreguntaTestUniverso = {
  id: string;
  texto: string;
  opciones: { id: string; texto: string; planetaId: PlanetaId }[];
};

export type ConfiguracionUniversoArquetipos = {
  version: 1;
  planetas: PlanetaArquetipo[];
  preguntasTest: PreguntaTestUniverso[];
  retos: RetoUniverso[];
};

export const PLANETAS_ARQUETIPO: PlanetaArquetipo[] = [
  { id: "cliente", numero: 1, nombre: "El Cliente", arquetipo: "El Explorador Empático", tema: "Escucha y comprensión", lema: "Entendemos sus necesidades, expectativas y emociones.", descripcion: "Lees las señales humanas antes de buscar respuestas. Tu curiosidad convierte necesidades y emociones en decisiones con sentido.", color: "#3FD6A8", colorProfundo: "#087D75" },
  { id: "viaje", numero: 2, nombre: "El Viaje", arquetipo: "El Navegante", tema: "Fluidez y acompañamiento", lema: "Acompañamos cada momento para que sea fácil y claro.", descripcion: "Conectas momentos, anticipas fricciones y ayudas a que las personas sepan dónde están, qué sigue y quién las acompaña.", color: "#6FB6FF", colorProfundo: "#176BA6" },
  { id: "rol", numero: 3, nombre: "Nuestro Rol", arquetipo: "El Conector", tema: "Impacto colectivo", lema: "Cada rol impacta la experiencia. Todos dejamos huella.", descripcion: "Ves los puentes entre áreas y personas. Reconoces que cada decisión interna termina viajando hasta la experiencia del cliente.", color: "#C77BFF", colorProfundo: "#7442A0" },
  { id: "actuamos", numero: 4, nombre: "Cómo Actuamos", arquetipo: "El Activador de Confianza", tema: "Comportamientos que inspiran", lema: "Comportamientos y competencias que generan confianza.", descripcion: "Transformas intención en acciones visibles. La claridad, la empatía y la coherencia son tu manera de construir confianza.", color: "#FFC15E", colorProfundo: "#B66B12" },
  { id: "medimos", numero: 5, nombre: "Medimos y Mejoramos", arquetipo: "El Astrónomo del Aprendizaje", tema: "Señales y evolución", lema: "Escuchamos, medimos y aprendemos para seguir creciendo.", descripcion: "Encuentras patrones donde otros ven datos aislados. Conviertes señales en preguntas, aprendizajes y ciclos concretos de mejora.", color: "#B7E05A", colorProfundo: "#5C8725" },
];

const OPCIONES = {
  cliente: "Escuchar primero para comprender qué necesita y siente la persona.",
  viaje: "Reconstruir el recorrido para encontrar dónde se perdió la claridad.",
  rol: "Conectar a quienes pueden resolver juntos la situación.",
  actuamos: "Dar un paso concreto y comunicarlo con transparencia.",
  medimos: "Revisar señales y datos para entender si es un patrón.",
} satisfies Record<PlanetaId, string>;

const ordenes: PlanetaId[][] = [
  ["cliente", "viaje", "rol", "actuamos", "medimos"],
  ["viaje", "actuamos", "cliente", "medimos", "rol"],
  ["rol", "medimos", "actuamos", "cliente", "viaje"],
  ["actuamos", "cliente", "medimos", "viaje", "rol"],
  ["medimos", "rol", "viaje", "actuamos", "cliente"],
];

const textosPreguntas = [
  "Cuando una experiencia no sale como esperabas, ¿cuál es tu primer impulso?",
  "¿Qué aporte disfrutas hacer cuando un equipo enfrenta un reto?",
  "¿Qué señal te dice que una experiencia está bien diseñada?",
  "Frente a una oportunidad de mejora, ¿qué acción te representa más?",
  "¿Qué frase describe mejor la huella que quieres dejar?",
];

export const PREGUNTAS_TEST_UNIVERSO: PreguntaTestUniverso[] = textosPreguntas.map((texto, indice) => ({
  id: `test-${indice + 1}`,
  texto,
  opciones: ordenes[indice].map((planetaId, posicion) => ({ id: `${indice + 1}-${posicion + 1}`, texto: indice === 0 ? OPCIONES[planetaId] : [
    `Hacer visible la perspectiva de ${planetaId === "cliente" ? "las personas" : planetaId === "viaje" ? "todo el recorrido" : planetaId === "rol" ? "cada equipo" : planetaId === "actuamos" ? "los comportamientos" : "los aprendizajes"}.`,
    `Que ${planetaId === "cliente" ? "la persona se sienta comprendida" : planetaId === "viaje" ? "cada paso sea fácil y claro" : planetaId === "rol" ? "las áreas actúen como un solo equipo" : planetaId === "actuamos" ? "lo que prometemos se note en cómo actuamos" : "cada señal se convierta en mejora"}.`,
    `Convertir ${planetaId === "cliente" ? "una necesidad en una conversación" : planetaId === "viaje" ? "una fricción en un camino simple" : planetaId === "rol" ? "una frontera en un puente" : planetaId === "actuamos" ? "una intención en un gesto confiable" : "un dato en una decisión"}.`,
    `${planetaId === "cliente" ? "Comprender antes de asumir" : planetaId === "viaje" ? "Acompañar de principio a fin" : planetaId === "rol" ? "Conectar para multiplicar" : planetaId === "actuamos" ? "Inspirar confianza con cada acción" : "Aprender para evolucionar"}.`,
  ][indice - 1], planetaId })),
}));

const consignas: Record<PlanetaId, [string, string, string]> = {
  cliente: ["Piensa en una conversación reciente. ¿Qué pregunta habría permitido comprender mejor la necesidad o emoción de la persona?", "Describe una expectativa de cliente que hoy deberíamos hacer visible antes de actuar.", "¿Qué gesto concreto haría que un cliente se sienta genuinamente escuchado por tu equipo?"],
  viaje: ["Identifica un momento del recorrido donde el cliente hace un esfuerzo innecesario. ¿Cómo lo reducirías?", "¿En qué silencio del viaje podríamos anticiparnos con información clara y oportuna?", "Elige un cierre de proceso frecuente. ¿Cómo harías evidente qué pasó, qué sigue y quién acompaña?"],
  rol: ["¿Qué decisión de tu rol impacta al cliente aunque nunca tengas contacto directo con él?", "Reconoce una frontera entre áreas que podrías convertir en un puente. ¿Cuál sería el primer paso?", "¿Qué rol poco visible hace posible una buena experiencia y cómo podrías fortalecer esa conexión?"],
  actuamos: ["Elige un mensaje complejo de tu trabajo y explica cómo lo convertirías en una conversación sencilla y humana.", "¿Qué comportamiento concreto puede generar más confianza en una interacción difícil?", "Describe una acción pequeña que haga coherente lo que prometemos con lo que realmente vive el cliente."],
  medimos: ["¿Qué señal estás recibiendo y todavía no has convertido en una acción de mejora?", "Elige un indicador que uses. ¿Qué pregunta cualitativa ayudaría a comprender mejor lo que está ocurriendo?", "¿Qué cambio pequeño podrías probar esta semana y cómo sabrías si funcionó?"],
};

export const RETOS_UNIVERSO_BASE: RetoUniverso[] = PLANETAS_ARQUETIPO.flatMap((planeta) => consignas[planeta.id].map((consigna, indice) => ({ id: `${planeta.id}-${indice + 1}`, planetaId: planeta.id, titulo: `Señal ${indice + 1}`, consigna, puntos: 20, orden: indice + 1, activo: true })));

export const CONFIGURACION_UNIVERSO_BASE: ConfiguracionUniversoArquetipos = { version: 1, planetas: PLANETAS_ARQUETIPO, preguntasTest: PREGUNTAS_TEST_UNIVERSO, retos: RETOS_UNIVERSO_BASE };

export function leerConfiguracionUniverso(valor: unknown): ConfiguracionUniversoArquetipos | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const item = valor as Partial<ConfiguracionUniversoArquetipos>;
  if (item.version !== 1 || !Array.isArray(item.planetas) || !Array.isArray(item.preguntasTest) || !Array.isArray(item.retos)) return null;
  if (item.planetas.length !== 5 || item.preguntasTest.length !== 5 || item.retos.length > 60) return null;
  const idsPlaneta = new Set(PLANETAS_ARQUETIPO.map((planeta) => planeta.id));
  const idsReto = new Set<string>();
  if (item.retos.some((reto) => !reto || typeof reto.id !== "string" || idsReto.has(reto.id) || !idsPlaneta.has(reto.planetaId) || typeof reto.titulo !== "string" || !reto.titulo.trim() || typeof reto.consigna !== "string" || reto.consigna.trim().length < 10 || !Number.isInteger(reto.puntos) || reto.puntos < 0 || reto.puntos > 1000 || !Number.isInteger(reto.orden) || typeof reto.activo !== "boolean" || !idsReto.add(reto.id))) return null;
  return item as ConfiguracionUniversoArquetipos;
}

export function calcularArquetipo(respuestas: Record<string, string>) {
  const puntajes = Object.fromEntries(PLANETAS_ARQUETIPO.map((planeta) => [planeta.id, 0])) as Record<PlanetaId, number>;
  for (const pregunta of PREGUNTAS_TEST_UNIVERSO) {
    const opcion = pregunta.opciones.find((item) => item.id === respuestas[pregunta.id]);
    if (!opcion) return null;
    puntajes[opcion.planetaId] += 1;
  }
  const planeta = PLANETAS_ARQUETIPO.reduce((mejor, actual) => puntajes[actual.id] > puntajes[mejor.id] ? actual : mejor);
  return { planetaId: planeta.id, puntajes };
}

export type ResultadoTestUniverso = { planetaId: PlanetaId; puntajes: Record<PlanetaId, number>; respuestas: Record<string, string> };

export function leerResultadoTestUniverso(valor: unknown): ResultadoTestUniverso | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const item = valor as Record<string, unknown>;
  if (!esPlanetaId(item.planetaId) || !item.puntajes || typeof item.puntajes !== "object" || !item.respuestas || typeof item.respuestas !== "object") return null;
  return item as ResultadoTestUniverso;
}

export function leerRespuestaRetoUniverso(valor: unknown): { texto: string; planetaId: PlanetaId; retoTitulo: string } | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const item = valor as Record<string, unknown>;
  if (typeof item.texto !== "string" || item.texto.trim().length < 12 || !esPlanetaId(item.planetaId) || typeof item.retoTitulo !== "string") return null;
  return { texto: item.texto.trim(), planetaId: item.planetaId, retoTitulo: item.retoTitulo };
}

export function rutaSugerida(planetaId: PlanetaId) {
  const indice = PLANETAS_ARQUETIPO.findIndex((planeta) => planeta.id === planetaId);
  return [...PLANETAS_ARQUETIPO.slice(indice), ...PLANETAS_ARQUETIPO.slice(0, indice)];
}

export async function asegurarActividadUniversoArquetipos() {
  const actividad = await db.actividad.upsert({
    where: { id: ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID },
    update: {},
    create: {
      id: ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID,
      tipo: TIPO_UNIVERSO_ARQUETIPOS,
      codigoAcceso: randomUUID().replace(/-/g, ""),
      estado: "PUBLICADA",
      titulo: "El Universo de la Experiencia",
      invitacion: "Encuentra tu planeta y descubre cuál es tu aporte a la experiencia del cliente.",
      cierre: "Tu aporte ya hace parte de nuestra galaxia colectiva.",
      configuracion: CONFIGURACION_UNIVERSO_BASE as unknown as Prisma.InputJsonValue,
    },
  });
  if (actividad.codigoAcceso) return actividad;
  return db.actividad.update({ where: { id: actividad.id }, data: { codigoAcceso: randomUUID().replace(/-/g, "") } });
}

export function esPlanetaId(valor: unknown): valor is PlanetaId {
  return typeof valor === "string" && PLANETAS_ARQUETIPO.some((planeta) => planeta.id === valor);
}
