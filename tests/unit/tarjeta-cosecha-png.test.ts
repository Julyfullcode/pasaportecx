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
        agradezco: "La generosidad del equipo. 🙌🏽✨💚",
        activo: "Escuchar antes de actuar.",
      },
      urlFoto: "/uploads/tests-cosecha-png/foto.png",
    });
    const metadata = await sharp(png).metadata();

    expect(metadata).toMatchObject({ format: "png", width: 1200, height: 1500 });
    expect(nombreCosechaSeguro("Ana Élida González")).toBe("ana-elida-gonzalez");
  }, 30_000);

  it("acomoda nombres y respuestas extensas sin exceder el lienzo", async () => {
    const png = await generarTarjetaCosechaPng({
      nombre: "María Fernanda Gómez González de la Comunidad",
      empresa: "Empresa de Servicios y Comunicaciones Regionales",
      evento: "Encuentro experiencia y comunicaciones",
      respuestas: {
        meLlevo: "Unión, trabajo en equipo y sinergia para construir soluciones sostenibles que conecten las necesidades de las personas con decisiones claras y oportunas.",
        agradezco: "Agradezco el enorme esfuerzo de unirnos como áreas, compartir experiencias, escuchar perspectivas diferentes y encontrar oportunidades concretas para seguir mejorando.",
        activo: "Planes de trabajo en conjunto, conversaciones frecuentes y compromisos verificables que conviertan los aprendizajes de este encuentro en acciones visibles para todos.",
      },
    });

    expect(await sharp(png).metadata()).toMatchObject({ format: "png", width: 1200, height: 1500 });
  }, 30_000);
});
