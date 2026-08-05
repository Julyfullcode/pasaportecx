import { describe, expect, it } from "vitest";
import { diasVisiblesEn, etiquetaDiaDesafio } from "@/lib/dia-desafio";

describe("día de los desafíos", () => {
  it("muestra el desafío transversal en ambos días", () => {
    expect(diasVisiblesEn(1)).toEqual([0, 1]);
    expect(diasVisiblesEn(2)).toEqual([0, 2]);
  });

  it("nombra el valor transversal sin mostrar Día 0", () => {
    expect(etiquetaDiaDesafio(0)).toBe("Todo el tiempo");
    expect(etiquetaDiaDesafio(2)).toBe("Día 2");
  });
});
