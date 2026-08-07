import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { crearExcel } from "@/lib/excel";

describe("exportación Excel", () => {
  it("genera un archivo XLSX válido con encabezados y respuestas", async () => {
    const archivo = await crearExcel([["Empresa", "Respuesta"], ["EPM", "La atención fue clara"]]);
    const zip = await JSZip.loadAsync(archivo);
    expect(zip.file("xl/workbook.xml")).not.toBeNull();
    const hoja = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    expect(hoja).toContain("Empresa");
    expect(hoja).toContain("La atención fue clara");
  });
});
