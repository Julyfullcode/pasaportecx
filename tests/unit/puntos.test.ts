import { describe, expect, it } from "vitest";
import { calcularPuntajeEquipo, calcularTotalIndividual } from "@/lib/puntos";

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
      ),
    ).toBe(190);
  });
});

describe("puntaje de equipos", () => {
  const integrantes = [
    { puntosTotales: 100, activo: true },
    { puntosTotales: 300, activo: true },
    { puntosTotales: 900, activo: false },
  ];

  it("calcula suma usando solo integrantes activos", () => {
    expect(calcularPuntajeEquipo(integrantes, "SUMA")).toBe(400);
  });

  it("calcula promedio usando solo integrantes activos", () => {
    expect(calcularPuntajeEquipo(integrantes, "PROMEDIO")).toBe(200);
  });

  it("recalcula ambos equipos al mover una persona", () => {
    const equipoA = [{ puntosTotales: 100, activo: true }, { puntosTotales: 300, activo: true }];
    const equipoB = [{ puntosTotales: 200, activo: true }];
    expect(calcularPuntajeEquipo(equipoA, "PROMEDIO")).toBe(200);
    expect(calcularPuntajeEquipo(equipoB, "PROMEDIO")).toBe(200);
    const personaMovida = equipoA.pop()!;
    equipoB.push(personaMovida);
    expect(calcularPuntajeEquipo(equipoA, "PROMEDIO")).toBe(100);
    expect(calcularPuntajeEquipo(equipoB, "PROMEDIO")).toBe(250);
  });
});
