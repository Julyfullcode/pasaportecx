import { describe, expect, it } from "vitest";
import {
  CONSTELACIONES_UNIVERSO,
  leerRespuestaUniverso,
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

  it("valida la tarjeta y una reflexión significativa", () => {
    const tarjeta = TARJETAS_UNIVERSO[0];
    expect(leerRespuestaUniverso({ tarjetaId: tarjeta.id, reflexion: "Voy a escuchar antes de proponer una solución." })).toEqual({ tarjetaId: tarjeta.id, reflexion: "Voy a escuchar antes de proponer una solución." });
    expect(leerRespuestaUniverso({ tarjetaId: "inventada", reflexion: "Una reflexión suficientemente larga." })).toBeNull();
    expect(leerRespuestaUniverso({ tarjetaId: tarjeta.id, reflexion: "Corta" })).toBeNull();
  });
});
