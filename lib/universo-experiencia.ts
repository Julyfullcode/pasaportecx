export const ACTIVIDAD_UNIVERSO_ID = "actividad-universo-experiencia";
export const TIPO_UNIVERSO_TARJETAS = "UNIVERSO_TARJETAS";
export const PREGUNTA_UNIVERSO_ID = "tarjeta-universo";

export type ConstelacionUniverso = {
  id: "cliente" | "viaje" | "rol" | "actuamos" | "medimos";
  numero: number;
  nombre: string;
  promesa: string;
  color: string;
  colorSecundario: string;
};

export type TarjetaUniverso = {
  id: string;
  constelacionId: ConstelacionUniverso["id"];
  titulo: string;
  mensaje: string;
  reto: string;
};

export type RespuestaUniverso = {
  tarjetaId: string;
  reflexion: string;
};

export const CONSTELACIONES_UNIVERSO: ConstelacionUniverso[] = [
  { id: "cliente", numero: 1, nombre: "Cliente", promesa: "Entendemos sus necesidades, expectativas y emociones.", color: "#00a88f", colorSecundario: "#13c6b1" },
  { id: "viaje", numero: 2, nombre: "El viaje", promesa: "Acompañamos cada momento para que sea fácil y claro.", color: "#087fc3", colorSecundario: "#39b8f2" },
  { id: "rol", numero: 3, nombre: "Nuestro rol", promesa: "Cada rol impacta la experiencia. Todos dejamos huella.", color: "#8f4bb4", colorSecundario: "#d86ad2" },
  { id: "actuamos", numero: 4, nombre: "Cómo actuamos", promesa: "Competencias y comportamientos que generan confianza.", color: "#f2a000", colorSecundario: "#ffd34e" },
  { id: "medimos", numero: 5, nombre: "Medimos y mejoramos", promesa: "Escuchamos, medimos y aprendemos para seguir creciendo.", color: "#65a832", colorSecundario: "#a8d83e" },
];

export const TARJETAS_UNIVERSO: TarjetaUniverso[] = [
  { id: "cliente-escuchar", constelacionId: "cliente", titulo: "Escucha antes de asumir", mensaje: "Cada cliente trae una historia, una necesidad y una emoción distintas. La mejor experiencia comienza con curiosidad genuina.", reto: "Piensa en una conversación reciente: ¿qué pregunta podrías haber hecho para comprender mejor?" },
  { id: "cliente-emocion", constelacionId: "cliente", titulo: "La emoción también es información", mensaje: "Lo que una persona siente durante una interacción influye tanto como el resultado que obtiene.", reto: "¿Qué emoción quieres que quede en el cliente después de interactuar contigo?" },
  { id: "cliente-expectativa", constelacionId: "cliente", titulo: "Haz visible la expectativa", mensaje: "Una expectativa no conversada puede convertirse en una promesa incumplida. Aclarar también es cuidar.", reto: "Identifica una expectativa que hoy podrías confirmar antes de actuar." },
  { id: "cliente-con", constelacionId: "cliente", titulo: "Diseña con las personas", mensaje: "Las soluciones ganan sentido cuando incorporan la voz de quienes vivirán la experiencia.", reto: "¿A quién podrías invitar a validar una solución antes de darla por terminada?" },

  { id: "viaje-huella", constelacionId: "viaje", titulo: "Cada momento deja huella", mensaje: "La experiencia no es un único contacto: es la suma de momentos conectados que construyen una percepción.", reto: "¿En qué momento del viaje puedes generar hoy una huella más positiva?" },
  { id: "viaje-esfuerzo", constelacionId: "viaje", titulo: "Reduce el esfuerzo invisible", mensaje: "Repetir información, esperar sin claridad o cambiar de canal consume confianza aunque el trámite termine bien.", reto: "Nombra un esfuerzo del cliente que tu equipo podría eliminar o reducir." },
  { id: "viaje-silencio", constelacionId: "viaje", titulo: "Los silencios también cuentan", mensaje: "Cuando no pasa nada, el cliente también está viviendo algo. La falta de información llena el espacio con incertidumbre.", reto: "¿Dónde podrías anticiparte con una actualización clara y oportuna?" },
  { id: "viaje-cierre", constelacionId: "viaje", titulo: "Cierra el ciclo", mensaje: "Una solución se siente completa cuando la persona entiende qué pasó, qué sigue y quién la acompañará.", reto: "¿Qué conversación pendiente podrías cerrar de manera más clara?" },

  { id: "rol-orbita", constelacionId: "rol", titulo: "Tu decisión entra en órbita", mensaje: "Aunque no atiendas directamente a un cliente, tus decisiones viajan por el sistema y llegan hasta su experiencia.", reto: "¿Qué decisión de tu rol impacta hoy a alguien que quizá nunca conocerás?" },
  { id: "rol-invisible", constelacionId: "rol", titulo: "Ningún rol es invisible", mensaje: "La experiencia visible se sostiene en procesos, datos, herramientas y personas que trabajan detrás de escena.", reto: "Reconoce a otro rol cuyo aporte hace posible tu trabajo y cuéntale por qué." },
  { id: "rol-conectar", constelacionId: "rol", titulo: "Conecta las áreas", mensaje: "El cliente vive una sola experiencia, incluso cuando internamente participan muchos equipos.", reto: "¿Qué frontera interna podrías ayudar a convertir en un puente?" },
  { id: "rol-siguiente", constelacionId: "rol", titulo: "Hazte cargo del siguiente paso", mensaje: "La confianza crece cuando alguien orienta el camino, incluso si la solución depende de otra persona.", reto: "¿Cómo puedes acompañar mejor el siguiente paso sin soltar al cliente?" },

  { id: "actuamos-claridad", constelacionId: "actuamos", titulo: "La claridad genera confianza", mensaje: "Hablar de forma sencilla no reduce el rigor: aumenta la posibilidad de comprender y decidir.", reto: "Elige un mensaje complejo de tu trabajo y conviértelo en una explicación simple." },
  { id: "actuamos-humano", constelacionId: "actuamos", titulo: "Humano antes que perfecto", mensaje: "Escuchar, reconocer y explicar con honestidad puede transformar una situación difícil incluso antes de resolverla.", reto: "¿Qué gesto humano puedes sumar a una interacción que hoy se siente automática?" },
  { id: "actuamos-friccion", constelacionId: "actuamos", titulo: "Convierte la fricción en guía", mensaje: "Una dificultad repetida no es solo un problema: es una señal que orienta dónde aprender y rediseñar.", reto: "¿Qué fricción frecuente merece convertirse en una conversación de mejora?" },
  { id: "actuamos-simple", constelacionId: "actuamos", titulo: "Haz simple lo importante", mensaje: "La facilidad se construye eliminando pasos que no agregan valor y haciendo evidente lo que sí importa.", reto: "¿Qué paso podrías simplificar sin perder calidad ni cuidado?" },

  { id: "medimos-inicio", constelacionId: "medimos", titulo: "Escuchar es el inicio", mensaje: "Una medición abre una conversación. Su valor aparece cuando ayuda a comprender, decidir y actuar.", reto: "¿Qué señal estás recibiendo y todavía no has convertido en una acción?" },
  { id: "medimos-contexto", constelacionId: "medimos", titulo: "Un dato necesita contexto", mensaje: "Los números muestran qué ocurre; las conversaciones y los recorridos ayudan a comprender por qué.", reto: "¿Qué pregunta cualitativa enriquecería un indicador que revisas con frecuencia?" },
  { id: "medimos-ciclos", constelacionId: "medimos", titulo: "Aprende en ciclos cortos", mensaje: "Mejorar no siempre exige una gran transformación. Probar, escuchar y ajustar también mueve el sistema.", reto: "¿Qué cambio pequeño podrías probar esta semana y cómo sabrías si funcionó?" },
  { id: "medimos-decidir", constelacionId: "medimos", titulo: "Mide para decidir", mensaje: "Un indicador no es la meta; es una brújula para priorizar experiencias y verificar si las acciones generan valor.", reto: "¿Qué decisión concreta debería habilitar la próxima medición de tu equipo?" },
];

export function constelacionDeTarjeta(tarjeta: TarjetaUniverso) {
  return CONSTELACIONES_UNIVERSO.find((constelacion) => constelacion.id === tarjeta.constelacionId) ?? CONSTELACIONES_UNIVERSO[0];
}

export function tarjetaUniversoPorId(id: string) {
  return TARJETAS_UNIVERSO.find((tarjeta) => tarjeta.id === id) ?? null;
}

export function tarjetaUniversoPara(semilla: string) {
  let hash = 2_166_136_261;
  for (let indice = 0; indice < semilla.length; indice += 1) {
    hash ^= semilla.charCodeAt(indice);
    hash = Math.imul(hash, 16_777_619);
  }
  return TARJETAS_UNIVERSO[(hash >>> 0) % TARJETAS_UNIVERSO.length];
}

export function leerRespuestaUniverso(valor: unknown): RespuestaUniverso | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const respuesta = valor as Record<string, unknown>;
  if (typeof respuesta.tarjetaId !== "string" || !tarjetaUniversoPorId(respuesta.tarjetaId)) return null;
  if (typeof respuesta.reflexion !== "string" || respuesta.reflexion.trim().length < 8 || respuesta.reflexion.length > 500) return null;
  return { tarjetaId: respuesta.tarjetaId, reflexion: respuesta.reflexion.trim() };
}
