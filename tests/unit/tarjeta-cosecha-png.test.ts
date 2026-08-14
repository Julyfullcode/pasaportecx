import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { generarTarjetaCosechaPng, nombreCosechaSeguro } from "@/lib/tarjeta-cosecha-png";

const carpeta = join(process.cwd(), "uploads", "tests-cosecha-png");

afterEach(() => rm(carpeta, { recursive: true, force: true }));

describe("tarjetas PNG del desafío de cierre", () => {
  it("genera una imagen vertical con la foto y las tres respuestas", async () => {
    await mkdir(carpeta, { recursive: true });
    await writeFile(
      join(carpeta, "foto.png"),
      await sharp({ create: { width: 500, height: 700, channels: 3, background: "#ba8b72" } }).png().toBuffer(),
    );

    const png = await generarTarjetaCosechaPng({
      nombre: "Ana Élida González",
      empresa: "ENSA",
      evento: "Encuentro de experiencia",
      respuestas: {
        meLlevo: "Una conversación que transforma.",
        agradezco: "La generosidad del equipo.",
        activo: "Escuchar antes de actuar.",
      },
      urlFoto: "/uploads/tests-cosecha-png/foto.png",
    });
    const metadata = await sharp(png).metadata();

    expect(metadata).toMatchObject({ format: "png", width: 1200, height: 1690 });
    expect(nombreCosechaSeguro("Ana Élida González")).toBe("ana-elida-gonzalez");
  }, 30_000);
});
