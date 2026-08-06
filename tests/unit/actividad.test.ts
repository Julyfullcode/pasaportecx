import { describe, expect, it } from "vitest";
import {
  ACTIVIDAD_CONOCIMIENTO,
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
});
