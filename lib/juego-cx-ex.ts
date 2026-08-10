export const ACTIVIDAD_JUEGO_CX_EX_ID = "actividad-juego-pago-cx-ex";
export const TIPO_JUEGO_CX_EX = "JUEGO_CX_EX";
export const DURACION_JUEGO_CX_EX = 20 * 60;

export const VIAJE_CX_EX = [
  { id: "j1", texto: "El cliente elige el canal digital e inicia el pago." },
  { id: "j2", texto: "El banco confirma el débito del dinero." },
  { id: "j3", texto: "El portal mantiene la factura pendiente o no confirma la aplicación." },
  { id: "j4", texto: "El cliente contacta a la empresa y envía el comprobante." },
  { id: "j5", texto: "Mientras espera, continúa recibiendo mensajes de cobro." },
];

export const CONEXIONES_CX_EX = [
  { id: "p1", cx: "El dinero salió, pero la factura continúa pendiente.", ex: "El asesor no ve la confirmación del pago en el sistema comercial." },
  { id: "p2", cx: "El cliente debe enviar el soporte y repetir su historia.", ex: "Los canales de atención no comparten historial ni documentos." },
  { id: "p3", cx: "El cliente recibe mensajes de cobro aunque ya pagó.", ex: "La conciliación y actualización del estado se ejecutan con demora." },
  { id: "p4", cx: "Nadie puede darle una fecha clara de solución.", ex: "No existe trazabilidad visible ni un responsable único del caso." },
];

export const CAUSAS_CX_EX = [
  { id: "c1", correcta: true, texto: "La pasarela de pago y el sistema de facturación se actualizan de forma asincrónica o desconectada." },
  { id: "c2", correcta: true, texto: "La conciliación no genera alertas automáticas cuando una transacción queda en excepción." },
  { id: "c3", correcta: true, texto: "El empleado no dispone de una trazabilidad única de la transacción y sus estados." },
  { id: "c4", correcta: true, texto: "No existe un dueño claro ni un tiempo de solución definido para pagos no aplicados." },
  { id: "c5", correcta: false, texto: "El cliente no tiene suficiente interés en utilizar canales digitales." },
  { id: "c6", correcta: false, texto: "El color del botón de pago no es suficientemente llamativo." },
  { id: "c7", correcta: false, texto: "El problema se explica principalmente por falta de empatía del asesor." },
  { id: "c8", correcta: false, texto: "La empresa ofrece demasiados medios de pago." },
];

export const SOLUCIONES_CX_EX = [
  { id: "sA", correcta: false, letra: "A", texto: "Enviar un mensaje más amable, solicitar el comprobante y pedir al cliente esperar 72 horas." },
  { id: "sB", correcta: false, letra: "B", texto: "Capacitar a los asesores para manejar mejor clientes molestos por pagos no reflejados." },
  { id: "sC", correcta: false, letra: "C", texto: "Crear un buzón manual exclusivo para recibir comprobantes y revisarlos por orden de llegada." },
  { id: "sD", correcta: true, letra: "D", texto: "Integrar la trazabilidad del pago, activar alertas de excepción, suspender provisionalmente el cobro y asignar responsable con tiempo de solución." },
];

export const BENEFICIOS_CX_EX = [
  { id: "b1", correcta: true, texto: "El cliente conoce el estado del pago, evita cobros improcedentes y recibe una fecha clara de solución." },
  { id: "b2", correcta: true, texto: "El empleado consulta una única trazabilidad, sabe qué acción ejecutar y quién responde por el caso." },
  { id: "b3", correcta: false, texto: "El cliente debe diligenciar un formulario adicional para demostrar que realizó el pago." },
  { id: "b4", correcta: false, texto: "El empleado dispone de un nuevo guion, aunque los sistemas y el flujo continúen iguales." },
];

export type RespuestasJuegoCxEx = {
  viaje: string[];
  conexiones: { cx: string; ex: string }[];
  causas: string[];
  solucion: string;
  beneficios: string[];
};

export function calcularJuegoCxEx(respuestas: RespuestasJuegoCxEx) {
  const aciertosViaje = VIAJE_CX_EX.reduce((total, item, indice) => total + (respuestas.viaje[indice] === item.id ? 1 : 0), 0);
  const conexionesValidas = new Map(CONEXIONES_CX_EX.map((item) => [item.id, item.id]));
  const aciertosConexiones = respuestas.conexiones.filter((item) => conexionesValidas.get(item.cx) === item.ex).length;
  const causasValidas = new Set(CAUSAS_CX_EX.filter((item) => item.correcta).map((item) => item.id));
  const causasSeleccionadas = [...new Set(respuestas.causas)].filter((id) => CAUSAS_CX_EX.some((item) => item.id === id));
  const causasCorrectas = causasSeleccionadas.filter((id) => causasValidas.has(id)).length;
  const causasIncorrectas = causasSeleccionadas.length - causasCorrectas;
  const desglose = {
    viaje: Math.round(aciertosViaje / VIAJE_CX_EX.length * 10),
    conexiones: Math.round(aciertosConexiones / CONEXIONES_CX_EX.length * 10),
    causas: Math.max(0, Math.round(causasCorrectas * 3.75 - causasIncorrectas * 1.5)),
    solucion: SOLUCIONES_CX_EX.some((item) => item.id === respuestas.solucion && item.correcta) ? 20 : 0,
    beneficios: Math.round([...new Set(respuestas.beneficios)].filter((id) => BENEFICIOS_CX_EX.some((item) => item.id === id && item.correcta)).length / 2 * 5),
  };
  return { desglose, puntaje: Object.values(desglose).reduce((total, valor) => total + valor, 0) };
}

export function respuestasJuegoCxExValidas(valor: unknown): valor is RespuestasJuegoCxEx {
  if (!valor || typeof valor !== "object") return false;
  const item = valor as Record<string, unknown>;
  return Array.isArray(item.viaje) && item.viaje.length <= VIAJE_CX_EX.length && new Set(item.viaje).size === item.viaje.length && item.viaje.every((id) => typeof id === "string")
    && Array.isArray(item.conexiones) && item.conexiones.length <= CONEXIONES_CX_EX.length && item.conexiones.every((par) => Boolean(par) && typeof par === "object" && typeof (par as Record<string, unknown>).cx === "string" && typeof (par as Record<string, unknown>).ex === "string")
    && new Set(item.conexiones.map((par) => (par as Record<string, unknown>).cx)).size === item.conexiones.length
    && new Set(item.conexiones.map((par) => (par as Record<string, unknown>).ex)).size === item.conexiones.length
    && Array.isArray(item.causas) && item.causas.length <= 4 && new Set(item.causas).size === item.causas.length && item.causas.every((id) => typeof id === "string")
    && typeof item.solucion === "string"
    && Array.isArray(item.beneficios) && item.beneficios.length <= 2 && new Set(item.beneficios).size === item.beneficios.length && item.beneficios.every((id) => typeof id === "string");
}
