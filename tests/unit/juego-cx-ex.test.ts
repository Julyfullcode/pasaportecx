import { describe, expect, it } from "vitest";
import { BENEFICIOS_CX_EX, calcularJuegoCxEx, CAUSAS_CX_EX, CONEXIONES_CX_EX, respuestasJuegoCxExValidas, SOLUCIONES_CX_EX, VIAJE_CX_EX } from "@/lib/juego-cx-ex";

describe("juego CX–EX", () => {
  it("otorga exactamente 60 puntos a una solución completa correcta", () => {
    const resultado = calcularJuegoCxEx({
      viaje: VIAJE_CX_EX.map((item) => item.id),
      conexiones: CONEXIONES_CX_EX.map((item) => ({ cx: item.id, ex: item.id })),
      causas: CAUSAS_CX_EX.filter((item) => item.correcta).map((item) => item.id),
      solucion: SOLUCIONES_CX_EX.find((item) => item.correcta)!.id,
      beneficios: BENEFICIOS_CX_EX.filter((item) => item.correcta).map((item) => item.id),
    });
    expect(resultado.puntaje).toBe(60);
    expect(resultado.desglose).toEqual({ viaje: 10, conexiones: 10, causas: 15, solucion: 20, beneficios: 5 });
  });

  it("no entrega puntos por selecciones vacías o incorrectas", () => {
    const resultado = calcularJuegoCxEx({ viaje: [], conexiones: [], causas: ["c5", "c6", "c7", "c8"], solucion: "sA", beneficios: ["b3", "b4"] });
    expect(resultado.puntaje).toBe(0);
  });

  it("rechaza respuestas duplicadas que intenten alterar el puntaje", () => {
    expect(respuestasJuegoCxExValidas({ viaje: [], conexiones: [], causas: [], solucion: "", beneficios: ["b1", "b1"] })).toBe(false);
  });
});
