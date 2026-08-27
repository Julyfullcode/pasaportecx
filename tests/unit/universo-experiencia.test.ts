import { describe, expect, it } from "vitest";
import {
  CONSTELACIONES_UNIVERSO,
  leerRespuestaUniverso,
  leerRespuestasUniverso,
  siguienteTarjetaUniverso,
  TARJETAS_UNIVERSO,
  tarjetaUniversoPara,
} from "@/lib/universo-experiencia";

describe("universo de la experiencia", () => {
  it("ofrece cinco constelaciones y un mazo diverso", () => {
    expect(CONSTELACIONES_UNIVERSO).toHaveLength(5);
    expect(TARJETAS_UNIVERSO).toHaveLength(20);
    expect(new Set(TARJETAS_UNIVERSO.map((tarjeta) => tarjeta.constelacionId))).toEqual(new Set(CONSTELACIONES_UNIVERSO.map((constelacion) => constelacion.id)));
    for (const constelacion of CONSTELACIONES_UNIVERSO) {
      expect(TARJETAS_UNIVERSO.filter((tarjeta) => tarjeta.constelacionId === constelacion.id)).toHaveLength(4);
    }
  });

  it("mantiene la tarjeta asignada para una misma persona", () => {
    const primera = tarjetaUniversoPara("actividad:participante-1");
    expect(tarjetaUniversoPara("actividad:participante-1")).toEqual(primera);
    expect(TARJETAS_UNIVERSO).toContainEqual(primera);
  });

  it("entrega todo el mazo sin repetir tarjetas entre rondas", () => {
    const mazo = TARJETAS_UNIVERSO.map((_, ronda) => tarjetaUniversoPara("actividad:participante-1", ronda));
    expect(new Set(mazo.map((tarjeta) => tarjeta.id)).size).toBe(TARJETAS_UNIVERSO.length);
  });

  it("no repite una tarjeta ya usada, incluso si viene del formato anterior", () => {
    const usada = tarjetaUniversoPara("formato-anterior", 1);
    expect(siguienteTarjetaUniverso("formato-anterior", [usada.id])?.id).not.toBe(usada.id);
    expect(siguienteTarjetaUniverso("formato-anterior", TARJETAS_UNIVERSO.map((tarjeta) => tarjeta.id))).toBeNull();
  });

  it("valida la tarjeta y una reflexión significativa", () => {
    const tarjeta = TARJETAS_UNIVERSO[0];
    expect(leerRespuestaUniverso({ tarjetaId: tarjeta.id, reflexion: "Voy a escuchar antes de proponer una solución." })).toEqual({ tarjetaId: tarjeta.id, reflexion: "Voy a escuchar antes de proponer una solución." });
    expect(leerRespuestaUniverso({ tarjetaId: "inventada", reflexion: "Una reflexión suficientemente larga." })).toBeNull();
    expect(leerRespuestaUniverso({ tarjetaId: tarjeta.id, reflexion: "Corta" })).toBeNull();
  });

  it("lee respuestas anteriores y el nuevo consolidado de misiones", () => {
    const primera = { tarjetaId: TARJETAS_UNIVERSO[0].id, reflexion: "Esta es una primera reflexión significativa." };
    const segunda = { tarjetaId: TARJETAS_UNIVERSO[1].id, reflexion: "Esta es una segunda reflexión significativa." };
    expect(leerRespuestasUniverso(primera)).toEqual([primera]);
    expect(leerRespuestasUniverso({ misiones: [primera, segunda] })).toEqual([primera, segunda]);
    expect(leerRespuestaUniverso({ misiones: [primera, segunda] })).toEqual(segunda);
  });
});
