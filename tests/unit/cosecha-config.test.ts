import { describe, expect, it } from "vitest";
import { CODIGO_DESAFIO_CIERRE, esDesafioCosecha, esRespuestasCosecha } from "@/lib/cosecha-config";

describe("respuestas del desafío de cierre", () => {
  it("reconoce el cierre por su código aunque la configuración esté equivocada", () => {
    expect(esDesafioCosecha(CODIGO_DESAFIO_CIERRE, {})).toBe(true);
    expect(esDesafioCosecha(CODIGO_DESAFIO_CIERRE, { formato: "texto" })).toBe(true);
  });

  it("rechaza completitudes heredadas que no contienen las tres reflexiones", () => {
    expect(esRespuestasCosecha({ seed: true })).toBe(false);
    expect(esRespuestasCosecha({ valor: "respuesta anterior" })).toBe(false);
  });

  it("acepta una cosecha con las tres reflexiones", () => {
    expect(esRespuestasCosecha({
      meLlevo: "Un aprendizaje",
      agradezco: "Al equipo",
      activo: "Una acción concreta",
    })).toBe(true);
  });
});
