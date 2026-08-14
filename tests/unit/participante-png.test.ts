import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { generarParticipantePng, nombreParticipanteSeguro } from "@/lib/participante-png";

const carpeta = join(process.cwd(), "uploads", "tests-participante");

afterEach(() => rm(carpeta, { recursive: true, force: true }));

describe("tarjetas PNG de participantes", () => {
  it("genera una tarjeta con foto, nombre y empresa", async () => {
    await mkdir(carpeta, { recursive: true });
    const foto = await sharp({ create: { width: 500, height: 700, channels: 3, background: "#ba8b72" } }).png().toBuffer();
    await writeFile(join(carpeta, "foto.png"), foto);
    const png = await generarParticipantePng({ nombre: "Maritza Johana Ruiz Pérez", empresa: "Aguas Regionales", urlFoto: "/uploads/tests-participante/foto.png" });
    const metadata = await sharp(png).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1000);
    expect(metadata.height).toBe(560);
    expect(nombreParticipanteSeguro("Maritza Johana Ruiz Pérez")).toBe("maritza-johana-ruiz-perez");
  }, 30_000);
});
