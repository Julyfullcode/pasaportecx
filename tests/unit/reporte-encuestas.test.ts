import { describe, expect, it } from "vitest";
import { PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO } from "@/lib/encuesta-mixta";
import { detallarRespuestasEncuesta } from "@/lib/reporte-encuestas";

const configuracionMixta = {
  formato: "mixta" as const,
  preguntas: PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO,
};

describe("reporte completo de encuestas", () => {
  it("separa escalas, cada elemento de matriz y respuestas abiertas", () => {
    const matriz = Object.fromEntries(
      PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO[1].elementos.map((elemento, indice) => [elemento.id, 10 - indice]),
    );
    const detalles = detallarRespuestasEncuesta(configuracionMixta, {
      formato: "mixta",
      respuestas: {
        "satisfaccion-general": 9,
        "aspectos-jornada": matriz,
        "mas-valioso": "Las conversaciones entre áreas.",
        "por-ajustar": "Más tiempo para el cierre.",
      },
    });

    expect(detalles).toHaveLength(8);
    expect(detalles).toContainEqual(expect.objectContaining({
      pregunta: PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO[0].titulo,
      respuesta: 9,
    }));
    for (const [indice, elemento] of PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO[1].elementos.entries()) {
      expect(detalles).toContainEqual(expect.objectContaining({ elemento: elemento.texto, respuesta: 10 - indice }));
    }
    expect(detalles).toContainEqual(expect.objectContaining({ respuesta: "Las conversaciones entre áreas." }));
    expect(detalles).toContainEqual(expect.objectContaining({ respuesta: "Más tiempo para el cierre." }));
  });

  it("expande las tres respuestas del cierre y traduce la opción de matrícula", () => {
    const cosecha = detallarRespuestasEncuesta({ formato: "cosecha" }, {
      meLlevo: "Un aprendizaje",
      agradezco: "La conversación",
      activo: "Una acción",
    });
    expect(cosecha.map((detalle) => detalle.respuesta)).toEqual(["Un aprendizaje", "La conversación", "Una acción"]);

    const matricula = detallarRespuestasEncuesta({
      formato: "matricula",
      opciones: [
        { id: "a", texto: "Alternativa uno", urlImagen: "/uno.png" },
        { id: "b", texto: "Alternativa dos", urlImagen: "/dos.png" },
      ],
    }, { opcionId: "b" });
    expect(matricula).toEqual([expect.objectContaining({ elemento: "Opción B", respuesta: "Alternativa dos" })]);
  });
});