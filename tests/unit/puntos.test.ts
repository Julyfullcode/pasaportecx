import { describe, expect, it } from "vitest";
import { calcularTotalIndividual } from "@/lib/puntos";

describe("puntaje individual", () => {
  it("suma solo completitudes aprobadas y todos los ajustes", () => {
    expect(
      calcularTotalIndividual(
        [
          { puntosOtorgados: 100, estado: "APROBADO" },
          { puntosOtorgados: 250, estado: "PENDIENTE" },
          { puntosOtorgados: 80, estado: "APROBADO" },
          { puntosOtorgados: 60, estado: "RECHAZADO" },
        ],
        [{ puntos: 20 }, { puntos: -10 }],
        50,
      ),
    ).toBe(240);
  });

  it("conserva los puntos de registro aunque no existan otros movimientos", () => {
    expect(calcularTotalIndividual([], [], 125)).toBe(125);
  });

  it("suma una actividad completada solo una vez", () => {
    expect(calcularTotalIndividual([], [], 10, true, [{ puntosOtorgados: 40 }])).toBe(50);
  });

  it("un integrante Staff no participa en el esquema de puntos", () => {
    expect(
      calcularTotalIndividual(
        [{ puntosOtorgados: 100, estado: "APROBADO" }],
        [{ puntos: 50 }],
        25,
        false,
      ),
    ).toBe(0);
  });
});
