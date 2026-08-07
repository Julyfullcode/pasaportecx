import { describe, expect, it } from "vitest";
import { ACTIVIDAD_WHATSAPP } from "@/lib/actividad";
import { analizarRespuestasActividad } from "@/lib/analisis-actividad";

describe("análisis de actividad abierta", () => {
  it("resume cobertura, temas, fricciones y oportunidades sin identificar personas", () => {
    const respuestas = [
      { participanteId: "persona-1", empresaEvaluadaId: "empresa-1", preguntaId: "aspectos-positivos", respuesta: "La navegación fue clara y rápida" },
      { participanteId: "persona-1", empresaEvaluadaId: "empresa-1", preguntaId: "fricciones", respuesta: "La respuesta automática fue confusa y repetitiva" },
      { participanteId: "persona-1", empresaEvaluadaId: "empresa-1", preguntaId: "oportunidad-mejora", respuesta: "Mejoraría la claridad de las opciones" },
      { participanteId: "persona-2", empresaEvaluadaId: "empresa-2", preguntaId: "fricciones", respuesta: "Las opciones fueron confusas" },
    ];
    const resultado = analizarRespuestasActividad(ACTIVIDAD_WHATSAPP.configuracion.preguntas, respuestas);
    expect(resultado.total).toBe(2);
    expect(resultado.empresas).toBe(2);
    expect(resultado.fricciones).toHaveLength(2);
    expect(resultado.oportunidades).toHaveLength(1);
    expect(resultado.conclusion).not.toContain("persona-1");
  });
});
