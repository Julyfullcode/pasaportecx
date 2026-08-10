import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generarPasaportePdf } from "@/lib/pasaporte";

describe("PDF del encuentro", () => {
  it("usa el nuevo título e incorpora enlaces Wallet cuando están configurados", async () => {
    const bytes = await generarPasaportePdf({
      nombre: "Persona de prueba",
      empresa: "Grupo EPM",
      evento: "Encuentro experiencia y comunicaciones",
      codigo: "ABC123",
      urlRecuperacion: "https://pasaportecx.vercel.app/recuperar/ABC123",
      urlAplicacion: "https://pasaportecx.vercel.app/",
      appleWalletUrl: "https://wallet.example/apple/ABC123",
      googleWalletUrl: "https://wallet.example/google/ABC123",
    });
    const documento = await PDFDocument.load(bytes);
    expect(documento.getTitle()).toBe("Encuentro experiencia y comunicaciones - Persona de prueba");
    expect(documento.getPages()).toHaveLength(1);
    expect(bytes.byteLength).toBeGreaterThan(2_000);
  });
});
