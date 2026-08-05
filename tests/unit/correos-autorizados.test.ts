import { describe, expect, it } from "vitest";
import { clasificarCorreos, correoElectronicoSchema, normalizarCorreo } from "@/lib/correos-autorizados";

describe("correos autorizados", () => {
  it("normaliza mayúsculas y espacios", () => {
    expect(normalizarCorreo("  Persona@EPM.COM.CO ")).toBe("persona@epm.com.co");
    expect(correoElectronicoSchema.parse(" Persona@EPM.COM.CO ")).toBe("persona@epm.com.co");
  });

  it("separa listas, elimina duplicados e identifica inválidos", () => {
    expect(clasificarCorreos("uno@epm.com, DOS@epm.com; uno@epm.com\nincorrecto")).toEqual({
      validos: ["uno@epm.com", "dos@epm.com"],
      invalidos: ["incorrecto"],
    });
  });
});
