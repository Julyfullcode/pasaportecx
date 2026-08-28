import { describe, expect, it } from "vitest";
import { calcularArquetipo, CONFIGURACION_UNIVERSO_BASE, leerConfiguracionUniverso, PLANETAS_ARQUETIPO, PREGUNTAS_TEST_UNIVERSO, RETOS_UNIVERSO_BASE, rutaSugerida } from "@/lib/universo-arquetipos";

describe("universo de arquetipos", () => {
  it("incluye cinco planetas, cinco preguntas y tres retos base por planeta", () => {
    expect(PLANETAS_ARQUETIPO).toHaveLength(5);
    expect(PREGUNTAS_TEST_UNIVERSO).toHaveLength(5);
    expect(RETOS_UNIVERSO_BASE).toHaveLength(15);
    for (const planeta of PLANETAS_ARQUETIPO) expect(RETOS_UNIVERSO_BASE.filter((reto) => reto.planetaId === planeta.id)).toHaveLength(3);
    expect(leerConfiguracionUniverso(CONFIGURACION_UNIVERSO_BASE)).not.toBeNull();
  });

  it("calcula el planeta con mayor cantidad de respuestas", () => {
    const respuestas = Object.fromEntries(PREGUNTAS_TEST_UNIVERSO.map((pregunta) => [pregunta.id, pregunta.opciones.find((opcion) => opcion.planetaId === "viaje")!.id]));
    const resultado = calcularArquetipo(respuestas);
    expect(resultado?.planetaId).toBe("viaje");
    expect(resultado?.puntajes.viaje).toBe(5);
  });

  it("rechaza tests incompletos y configuraciones con retos duplicados", () => {
    expect(calcularArquetipo({})).toBeNull();
    expect(leerConfiguracionUniverso({ ...CONFIGURACION_UNIVERSO_BASE, retos: [RETOS_UNIVERSO_BASE[0], RETOS_UNIVERSO_BASE[0]] })).toBeNull();
  });

  it("propone una ruta circular que comienza en el arquetipo", () => {
    const ruta = rutaSugerida("rol");
    expect(ruta[0].id).toBe("rol");
    expect(new Set(ruta.map((planeta) => planeta.id)).size).toBe(5);
  });
});
