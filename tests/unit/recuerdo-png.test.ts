import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { generarRecuerdoPng, nombrePngSeguro } from "@/lib/recuerdo-png";

describe("exportación PNG de recuerdos", () => {
  it("genera una imagen PNG con la franja inferior", async () => {
    const png = await generarRecuerdoPng({
      urlFoto: "",
      comentario: "Un gran momento para conectar y compartir durante el encuentro.",
      autor: "Ana Elida González",
      empresa: "ENSA",
      corazones: 7,
      risas: 2,
    });
    const metadata = await sharp(png).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(1280);
    expect(nombrePngSeguro("Ana Elida González")).toBe("ana-elida-gonzalez");
  }, 30_000);
});