import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generarTarjetaCosechaPdf } from "@/lib/tarjeta-cosecha";

describe("PDF del desafío de cierre", () => {
  it("genera la tarjeta en formato horizontal", async () => {
    const bytes = await generarTarjetaCosechaPdf({
      nombre: "Ana González",
      empresa: "EPM",
      evento: "Encuentro de experiencia",
      respuestas: {
        meLlevo: "Una conversación que transforma.",
        agradezco: "La generosidad del equipo.",
        activo: "Escuchar antes de actuar.",
      },
    });
    const documento = await PDFDocument.load(bytes);
    const pagina = documento.getPage(0);

    expect(pagina.getSize()).toEqual({ width: 595, height: 420 });
    expect(pagina.getWidth()).toBeGreaterThan(pagina.getHeight());
  });
});
