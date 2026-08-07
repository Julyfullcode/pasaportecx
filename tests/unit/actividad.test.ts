import { describe, expect, it } from "vitest";
import {
  ACTIVIDAD_CONOCIMIENTO,
  ACTIVIDAD_WHATSAPP,
  leerConfiguracionActividad,
  preguntasDe,
  respuestaActividadValida,
} from "@/lib/actividad";

describe("actividad moderada", () => {
  it("incluye los cinco momentos del ejercicio", () => {
    expect(preguntasDe(ACTIVIDAD_CONOCIMIENTO.configuracion)).toHaveLength(5);
  });

  it("rechaza configuraciones incompletas", () => {
    expect(leerConfiguracionActividad({ preguntas: [] })).toBeNull();
  });

  it("exige respuesta para todas las afirmaciones de verdadero o falso", () => {
    const pregunta = ACTIVIDAD_CONOCIMIENTO.configuracion.preguntas[2];
    expect(respuestaActividadValida(pregunta, { a: true })).toBe(false);
    expect(respuestaActividadValida(pregunta, { a: true, b: true, c: false, d: false })).toBe(true);
  });

  it("solo acepta opciones configuradas", () => {
    const pregunta = ACTIVIDAD_CONOCIMIENTO.configuracion.preguntas[0];
    expect(respuestaActividadValida(pregunta, "a")).toBe(true);
    expect(respuestaActividadValida(pregunta, "opcion-inventada")).toBe(false);
  });

  it("configura la evaluación de WhatsApp únicamente con respuestas abiertas", () => {
    const preguntas = preguntasDe(ACTIVIDAD_WHATSAPP.configuracion);
    expect(preguntas).toHaveLength(4);
    expect(preguntas.every((pregunta) => pregunta.tipo === "RESPUESTA_ABIERTA")).toBe(true);
    expect(respuestaActividadValida(preguntas[0], "Hallazgo detallado del canal")).toBe(true);
    expect(respuestaActividadValida(preguntas[0], "")).toBe(false);
  });
});
