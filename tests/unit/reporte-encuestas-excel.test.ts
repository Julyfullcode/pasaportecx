import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  requerirAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requerirAdmin: mocks.requerirAdmin }));
vi.mock("@/lib/db", () => ({
  db: { completitud: { findMany: mocks.findMany } },
}));

import { GET } from "@/app/api/reportes/[tipo]/route";

function completitudEncuesta(dia: number, titulo: string, fecha: string) {
  return {
    participante: { nombre: `Participante ${dia}`, esStaff: false },
    desafio: { titulo, dia, configuracion: { formato: "cosecha" } },
    respuesta: {
      meLlevo: `Aprendizaje ${dia}`,
      agradezco: `Agradecimiento ${dia}`,
      activo: `Acción ${dia}`,
    },
    puntosOtorgados: 10,
    estado: "APROBADO",
    completadoEn: new Date(fecha),
  };
}

describe("Excel de encuestas de satisfacción", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.requerirAdmin.mockReset();
  });

  it("identifica las respuestas del día 1 y del día 2", async () => {
    mocks.findMany.mockResolvedValue([
      completitudEncuesta(1, "Satisfacción día 1", "2026-08-18T20:00:00.000Z"),
      completitudEncuesta(2, "Satisfacción día 2", "2026-08-19T20:00:00.000Z"),
    ]);

    const respuesta = await GET(new Request("http://localhost/api/reportes/encuestas"), {
      params: Promise.resolve({ tipo: "encuestas" }),
    });
    const zip = await JSZip.loadAsync(await respuesta.arrayBuffer());
    const hoja = await zip.file("xl/worksheets/sheet1.xml")!.async("string");

    expect(respuesta.status).toBe(200);
    expect(hoja).toContain("Día de referencia");
    expect(hoja).toContain("Satisfacción día 1");
    expect(hoja).toContain("Día 1");
    expect(hoja).toContain("Satisfacción día 2");
    expect(hoja).toContain("Día 2");
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ desafio: { dia: "asc" } }, { completadoEn: "asc" }],
    }));
  });
});
