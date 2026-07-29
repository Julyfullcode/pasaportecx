import { describe, expect, it } from "vitest";
import { normalizarRespuesta, puntuarOpcionMultiple, validarRespuestaAbierta } from "@/lib/validacion";

describe("respuestas abiertas", () => {
  it("normaliza tildes, mayúsculas, puntuación y espacios", () => {
    expect(normalizarRespuesta("  ¡Experiência, Única!  ")).toBe("experiencia unica");
  });

  it("acepta variaciones normalizadas", () => {
    expect(validarRespuestaAbierta("  LA EXPERIÉNCIA!!! ", ["la experiencia"])).toBe(true);
  });
});

describe("opción múltiple", () => {
  const opciones = [
    { id: "a", texto: "A", correcta: true },
    { id: "b", texto: "B", correcta: false },
    { id: "c", texto: "C", correcta: true },
  ];
  it("aplica todo o nada", () => {
    expect(puntuarOpcionMultiple(["a", "c"], opciones, 100, false)).toBe(100);
    expect(puntuarOpcionMultiple(["a"], opciones, 100, false)).toBe(0);
  });
  it("aplica parcial proporcional y penaliza opciones incorrectas", () => {
    expect(puntuarOpcionMultiple(["a"], opciones, 100, true)).toBe(50);
    expect(puntuarOpcionMultiple(["a", "b"], opciones, 100, true)).toBe(0);
  });
});
