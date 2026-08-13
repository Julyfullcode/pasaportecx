import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { generarRecuerdoPng, nombrePngSeguro } from "@/lib/recuerdo-png";

const rutaFoto = join(process.cwd(), "uploads", "tests", "recuerdo-vertical.png");

afterEach(async () => {
  await import("node:fs/promises").then(({ rm }) => rm(join(process.cwd(), "uploads", "tests"), { recursive: true, force: true }));
});

describe("exportación PNG de recuerdos", () => {
  it("conserva el ancho real y agrega una franja compacta con datos", async () => {
    await mkdir(join(process.cwd(), "uploads", "tests"), { recursive: true });
    await writeFile(rutaFoto, await sharp({ create: { width: 720, height: 1080, channels: 3, background: "#4f8f7b" } }).png().toBuffer());
    const png = await generarRecuerdoPng({
      urlFoto: "/uploads/tests/recuerdo-vertical.png",
      comentario: "Medallo, ciudad bonita 🌸🌿🤩",
      autor: "Ana Elida González",
      empresa: "ENSA",
      corazones: 7,
      risas: 2,
    });
    const metadata = await sharp(png).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(720);
    expect(metadata.height).toBeGreaterThan(1080);
    expect(metadata.height).toBeLessThan(1380);
    expect(nombrePngSeguro("Ana Elida González")).toBe("ana-elida-gonzalez");
  }, 30_000);
});