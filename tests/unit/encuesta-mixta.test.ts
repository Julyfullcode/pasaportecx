import { describe, expect, it } from "vitest";
import {
  configuracionEncuestaMixtaDesdeJson,
  EncuestaMixtaInvalidaError,
  PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO,
  respuestasEncuestaMixtaDesdeFormulario,
} from "@/lib/encuesta-mixta";

describe("encuesta de satisfacción mixta", () => {
  it("normaliza escalas, matrices y preguntas abiertas", () => {
    const configuracion = configuracionEncuestaMixtaDesdeJson(JSON.stringify(PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO));
    expect(configuracion.formato).toBe("mixta");
    expect(configuracion.preguntas.map((pregunta) => pregunta.tipo)).toEqual([
      "ESCALA_0_10",
      "MATRIZ_0_10",
      "ABIERTA",
      "ABIERTA",
    ]);
    expect(configuracion.preguntas[1].elementos).toHaveLength(5);
  });

  it("valida y estructura todas las respuestas", () => {
    const configuracion = configuracionEncuestaMixtaDesdeJson(JSON.stringify(PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO));
    const formulario = new FormData();
    formulario.set("mixta:satisfaccion-general", "9");
    configuracion.preguntas[1].elementos.forEach((elemento, indice) => {
      formulario.set(`mixta:aspectos-jornada:${elemento.id}`, String(10 - indice));
    });
    formulario.set("mixta:mas-valioso", "Las conversaciones con otras personas.");
    formulario.set("mixta:por-ajustar", "Más tiempo para compartir.");
    expect(respuestasEncuestaMixtaDesdeFormulario(configuracion, formulario)).toMatchObject({
      "satisfaccion-general": 9,
      "aspectos-jornada": { "aspecto-1": 10, "aspecto-5": 6 },
      "mas-valioso": "Las conversaciones con otras personas.",
      "por-ajustar": "Más tiempo para compartir.",
    });
  });

  it("rechaza escalas incompletas o fuera del rango 0 a 10", () => {
    const configuracion = configuracionEncuestaMixtaDesdeJson(JSON.stringify(PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO));
    const formulario = new FormData();
    formulario.set("mixta:satisfaccion-general", "11");
    expect(() => respuestasEncuestaMixtaDesdeFormulario(configuracion, formulario)).toThrow(EncuestaMixtaInvalidaError);
  });
});
