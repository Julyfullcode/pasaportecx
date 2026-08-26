import { describe, expect, test } from "vitest";
import { PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO } from "@/lib/encuesta-mixta";
import { resumirSatisfaccion } from "@/lib/resumen-satisfaccion";

describe("resumen de satisfacción para la presentación", () => {
  test("calcula el promedio y conserva comentarios positivos y oportunidades de mejora con su pregunta", () => {
    const configuracion = { formato: "mixta" as const, preguntas: PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO };
    const registro = (calificacion: number, valioso: string, ajuste: string) => ({
      configuracion,
      respuesta: {
        formato: "mixta",
        respuestas: {
          "satisfaccion-general": calificacion,
          "aspectos-jornada": Object.fromEntries(PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO[1].elementos.map((elemento) => [elemento.id, 9])),
          "mas-valioso": valioso,
          "por-ajustar": ajuste,
        },
      },
    });
    const resumen = resumirSatisfaccion([
      registro(10, "La conexión con personas de otras empresas.", "Más tiempo para conversar."),
      registro(9, "Los aprendizajes compartidos durante la jornada.", "Mejorar los horarios."),
      registro(8, "El trabajo colaborativo entre todos los equipos.", "Nada por ajustar."),
      registro(5, "La energía y disposición de los participantes.", "Cambiar el almuerzo."),
    ]);

    expect(resumen.promedio).toBe(8);
    expect(resumen).toMatchObject({ respuestas: 4, sumaCalificaciones: 32 });
    expect(resumen.comentarios).toHaveLength(8);
    expect(resumen.comentarios).toContainEqual({
      texto: "La conexión con personas de otras empresas.",
      pregunta: PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO[2].titulo,
      tono: "positivo",
    });
    expect(resumen.comentarios).toContainEqual({
      texto: "Mejorar los horarios.",
      pregunta: PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO[3].titulo,
      tono: "mejora",
    });
  });

  test("no usa otra pregunta de escala como reemplazo", () => {
    const configuracion = {
      formato: "mixta" as const,
      preguntas: [{ id: "otra-escala", tipo: "ESCALA_0_10" as const, titulo: "¿Recomendarías el encuentro?", descripcion: "", elementos: [] }],
    };
    expect(resumirSatisfaccion([{ configuracion, respuesta: { formato: "mixta", respuestas: { "otra-escala": 10 } } }])).toMatchObject({
      promedio: null,
      respuestas: 0,
      sumaCalificaciones: 0,
    });
  });
});
