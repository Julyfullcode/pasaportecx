import { describe, expect, it } from "vitest";
import { esConfiguracionMatricula, respuestaMatricula } from "@/lib/matricula";

describe("desafío de matrícula", () => {
  const configuracion = {
    formato: "matricula",
    opciones: [
      { id: "a", texto: "Alternativa A", urlImagen: "/uploads/matriculas/a.webp" },
      { id: "b", texto: "Alternativa B", urlImagen: "/uploads/matriculas/b.webp" },
    ],
  };

  it("exige exactamente dos alternativas con texto e imagen", () => {
    expect(esConfiguracionMatricula(configuracion)).toBe(true);
    expect(esConfiguracionMatricula({ ...configuracion, opciones: configuracion.opciones.slice(0, 1) })).toBe(false);
  });

  it("recupera únicamente una elección válida", () => {
    expect(respuestaMatricula({ opcionId: "b" })).toBe("b");
    expect(respuestaMatricula({ opcionId: "c" })).toBeNull();
  });
});
