import { describe, expect, it } from "vitest";
import {
  configuracionPuntualidadDesafio,
  configuracionPuntualidadDesdeValor,
  crearConfiguracionPuntualidad,
  evaluarPuntualidad,
  mensajePuntualidad,
} from "@/lib/puntualidad";
import { crearTokenQrPuntualidad, datosQrPuntualidad, validarTokenQrPuntualidad } from "@/lib/puntualidad-qr";

describe("desafíos de puntualidad", () => {
  const configuracion = crearConfiguracionPuntualidad("2026-08-04T14:00", 5);

  it("solo permite registrar dentro de los cinco minutos anteriores y posteriores", () => {
    expect(evaluarPuntualidad(configuracion, new Date("2026-08-04T18:54:59.000Z"))).toMatchObject({ estadoVentana: "ANTES", obtuvoPuntos: false, minutosAntes: 6 });
    expect(evaluarPuntualidad(configuracion, new Date("2026-08-04T18:55:00.000Z"))).toMatchObject({ estadoVentana: "DENTRO", obtuvoPuntos: true, minutosAntes: 5 });
    expect(evaluarPuntualidad(configuracion, new Date("2026-08-04T19:03:00.000Z"))).toMatchObject({ estadoVentana: "DENTRO", obtuvoPuntos: true, minutosTarde: 3 });
    expect(evaluarPuntualidad(configuracion, new Date("2026-08-04T19:05:00.000Z"))).toMatchObject({ estadoVentana: "DENTRO", obtuvoPuntos: true, minutosTarde: 5 });
    expect(evaluarPuntualidad(configuracion, new Date("2026-08-04T19:05:01.000Z"))).toMatchObject({ estadoVentana: "DESPUES", obtuvoPuntos: false, minutosTarde: 6 });
  });

  it("niega los puntos y explica los minutos de retraso al superar el límite", () => {
    const resultado = evaluarPuntualidad(configuracion, new Date("2026-08-04T19:07:00.000Z"));
    expect(resultado).toMatchObject({ obtuvoPuntos: false, minutosTarde: 7 });
    expect(mensajePuntualidad(resultado, 150)).toBe("Desafortunadamente, llegaste 7 minutos tarde. El registro cerró 5 minutos después de la hora y ya no aplican los 150 puntos de este desafío.");
  });

  it("rechaza configuraciones incompletas o tolerancias fuera de rango", () => {
    expect(() => crearConfiguracionPuntualidad("", 5)).toThrow(/fecha, hora y tolerancia/);
    expect(() => crearConfiguracionPuntualidad("2026-08-04T14:00", -1)).toThrow(/fecha, hora y tolerancia/);
    expect(() => crearConfiguracionPuntualidad("2026-02-31T14:00", 5)).toThrow(/fecha, hora y tolerancia/);
  });

  it("recupera configuraciones antiguas sin perder la hora ni la tolerancia", () => {
    expect(configuracionPuntualidadDesdeValor({
      tipo: "puntualidad",
      fechaHoraObjetivo: "2026-08-04T14:00:00",
      toleranciaMinutos: "5",
    })).toEqual(configuracion);
    expect(configuracionPuntualidadDesdeValor(JSON.stringify({
      puntualidad: { fechaHora: "2026-08-04T14:00", minutosTolerancia: 5 },
    }))).toEqual(configuracion);
  });

  it("recupera la configuración desde una completitud si una edición reemplazó la configuración del desafío", () => {
    expect(configuracionPuntualidadDesafio({}, [
      { respuesta: { ...configuracion, estadoVentana: "DENTRO", obtuvoPuntos: true, minutosAntes: 0, minutosTarde: 1 } },
    ])).toEqual(configuracion);
  });
});

describe("QR dinámico de puntualidad", () => {
  const codigo = "llegada-segura";
  const inicio = new Date("2026-08-10T15:00:00.000Z");

  it("firma el desafío y renueva la URL cada 15 segundos", () => {
    const primero = crearTokenQrPuntualidad(codigo, inicio);
    const segundo = crearTokenQrPuntualidad(codigo, new Date(inicio.getTime() + 15_000));
    expect(primero).not.toBe(segundo);
    expect(datosQrPuntualidad(codigo, "https://pasaportecx.vercel.app", inicio).url).toContain(encodeURIComponent(primero));
  });

  it("acepta el QR vigente y rechaza alteraciones, otros desafíos y capturas antiguas", () => {
    const token = crearTokenQrPuntualidad(codigo, inicio);
    expect(validarTokenQrPuntualidad(codigo, token, new Date(inicio.getTime() + 14_000))).toBe(true);
    expect(validarTokenQrPuntualidad("otro-desafio", token, new Date(inicio.getTime() + 14_000))).toBe(false);
    expect(validarTokenQrPuntualidad(codigo, `${token.slice(0, -1)}x`, new Date(inicio.getTime() + 14_000))).toBe(false);
    expect(validarTokenQrPuntualidad(codigo, token, new Date(inicio.getTime() + 21_000))).toBe(false);
  });
});
