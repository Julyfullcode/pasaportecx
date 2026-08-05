import { describe, expect, it } from "vitest";
import { etiquetaDiaDesafio } from "@/lib/dia-desafio";

describe("día de los desafíos", () => {
  it("nombra los permanentes sin mostrar Día 0", () => {
    expect(etiquetaDiaDesafio(0)).toBe("Permanente");
    expect(etiquetaDiaDesafio(1)).toBe("Día 1");
    expect(etiquetaDiaDesafio(2)).toBe("Día 2");
  });
});
