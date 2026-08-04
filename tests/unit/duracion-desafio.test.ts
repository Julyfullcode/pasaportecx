import { describe, expect, it } from "vitest";
import {
  estadoTemporalDesafio,
  fechaCierreDesafio,
  fechaHoraColombiaComoFecha,
  fechaParaInputColombia,
} from "@/lib/duracion-desafio";

const base = {
  disponibleDesde: null,
  disponibleHasta: null,
  creadoEn: new Date("2026-08-05T14:00:00Z"),
};

describe("duración de desafíos", () => {
  it("calcula el cierre en minutos desde la publicación", () => {
    const desafio = {
      ...base,
      duracionMinutos: 15,
      publicadoEn: new Date("2026-08-05T15:00:00Z"),
    };
    expect(fechaCierreDesafio(desafio)?.toISOString()).toBe("2026-08-05T15:15:00.000Z");
    expect(estadoTemporalDesafio(desafio, new Date("2026-08-05T15:14:59Z"))).toBe("DISPONIBLE");
    expect(estadoTemporalDesafio(desafio, new Date("2026-08-05T15:15:00Z"))).toBe("FINALIZADO");
  });

  it("respeta una fecha y hora fija de cierre", () => {
    const desafio = {
      ...base,
      duracionMinutos: null,
      publicadoEn: new Date("2026-08-05T14:00:00Z"),
      disponibleHasta: new Date("2026-08-05T18:30:00Z"),
    };
    expect(fechaCierreDesafio(desafio)?.toISOString()).toBe("2026-08-05T18:30:00.000Z");
  });

  it("convierte la hora administrativa de Colombia sin depender de Vercel", () => {
    const fecha = fechaHoraColombiaComoFecha("2026-08-05T14:30");
    expect(fecha.toISOString()).toBe("2026-08-05T19:30:00.000Z");
    expect(fechaParaInputColombia(fecha)).toBe("2026-08-05T14:30");
  });
});
