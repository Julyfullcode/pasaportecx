import { describe, expect, it } from "vitest";
import { analizarObjetosAlmacenamiento } from "@/lib/almacenamiento";

describe("análisis de almacenamiento", () => {
  it("solo marca como huérfanos archivos gestionados, antiguos y sin referencia", () => {
    const antigua = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const reciente = new Date();
    const reporte = analizarObjetosAlmacenamiento(
      [
        { nombre: "perfiles/usada.webp", bytes: 100, creadoEn: antigua },
        { nombre: "evidencias/huerfana.webp", bytes: 200, creadoEn: antigua },
        { nombre: "otra-carpeta/no-tocar.webp", bytes: 300, creadoEn: antigua },
        { nombre: "recuerdos/reciente.webp", bytes: 400, creadoEn: reciente },
      ],
      {
        participantes: [{ urlFoto: "/uploads/perfiles/usada.webp" }],
        recuerdos: [],
        completitudes: [],
        empresas: [],
        fotosAgenda: [],
        momentosAgenda: [],
        desafios: [],
      },
      2_000,
    );

    expect(reporte.bytesTotales).toBe(1_000);
    expect(reporte.porcentaje).toBe(50);
    expect(reporte.huerfanos).toEqual(["evidencias/huerfana.webp"]);
    expect(reporte.bytesHuerfanos).toBe(200);
  });
});
