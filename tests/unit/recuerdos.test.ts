import { describe, expect, it } from "vitest";
import { presentarRecuerdo, resumirReacciones } from "@/lib/recuerdos";

describe("reacciones de recuerdos", () => {
  const reacciones = [
    { participanteId: "luis", tipo: "CORAZON" },
    { participanteId: "ana", tipo: "RISA" },
  ];

  it("cuenta cada reacción y reconoce las del participante actual", () => {
    expect(resumirReacciones(reacciones, "ana")).toEqual({
      corazon: 1,
      risa: 1,
      total: 2,
      mias: ["RISA"],
    });
  });

  it("no expone la lista de participantes al presentar un recuerdo", () => {
    const resultado = presentarRecuerdo({ id: "foto-1", reacciones }, "luis");
    expect(resultado).toEqual({
      id: "foto-1",
      reacciones: { corazon: 1, risa: 1, total: 2, mias: ["CORAZON"] },
    });
  });
});
