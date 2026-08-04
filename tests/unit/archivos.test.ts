import { describe, expect, it } from "vitest";
import { ImagenInvalidaError, normalizarImagen } from "@/lib/imagenes-servidor";

const pngValido = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("validación de archivos de imagen", () => {
  it("decodifica y reescribe una imagen real como WebP", async () => {
    const resultado = await normalizarImagen(pngValido);
    expect(resultado.extension).toBe("webp");
    expect(Buffer.from(resultado.datos).subarray(8, 12).toString("ascii")).toBe("WEBP");
  });

  it("rechaza bytes arbitrarios aunque se declaren como imagen", async () => {
    await expect(normalizarImagen(Buffer.from("contenido falso"))).rejects.toBeInstanceOf(ImagenInvalidaError);
  });
});
