import { describe, expect, it } from "vitest";
import {
  crearConfiguracionPuntualidad,
  evaluarPuntualidad,
  mensajePuntualidad,
} from "@/lib/puntualidad";

describe("desafíos de puntualidad", () => {
  const configuracion = crearConfiguracionPuntualidad("2026-08-04T14:00", 5);

  it("otorga puntos antes de la hora y dentro de la tolerancia", () => {
    expect(evaluarPuntualidad(configuracion, new Date("2026-08-04T18:55:00.000Z"))).toMatchObject({ obtuvoPuntos: true, minutosTarde: 0 });
    expect(evaluarPuntualidad(configuracion, new Date("2026-08-04T19:03:00.000Z"))).toMatchObject({ obtuvoPuntos: true, minutosTarde: 3 });
    expect(evaluarPuntualidad(configuracion, new Date("2026-08-04T19:05:00.000Z"))).toMatchObject({ obtuvoPuntos: true, minutosTarde: 5 });
    expect(evaluarPuntualidad(configuracion, new Date("2026-08-04T19:05:59.000Z"))).toMatchObject({ obtuvoPuntos: true, minutosTarde: 5 });
  });

  it("niega los puntos y explica los minutos de retraso al superar el límite", () => {
    const resultado = evaluarPuntualidad(configuracion, new Date("2026-08-04T19:07:00.000Z"));
    expect(resultado).toMatchObject({ obtuvoPuntos: false, minutosTarde: 7 });
    expect(mensajePuntualidad(resultado, 150)).toBe("Desafortunadamente, llegaste 7 minutos tarde y ya no aplican los 150 puntos de este desafío.");
    expect(evaluarPuntualidad(configuracion, new Date("2026-08-04T19:07:59.000Z"))).toMatchObject({ obtuvoPuntos: false, minutosTarde: 7 });
  });

  it("rechaza configuraciones incompletas o tolerancias fuera de rango", () => {
    expect(() => crearConfiguracionPuntualidad("", 5)).toThrow(/fecha, hora y tolerancia/);
    expect(() => crearConfiguracionPuntualidad("2026-08-04T14:00", -1)).toThrow(/fecha, hora y tolerancia/);
    expect(() => crearConfiguracionPuntualidad("2026-02-31T14:00", 5)).toThrow(/fecha, hora y tolerancia/);
  });
});
