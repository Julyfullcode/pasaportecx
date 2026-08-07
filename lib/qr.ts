import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export function urlDesafio(codigo: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/d/${codigo}`;
}

export async function qrPng(codigo: string) {
  return qrPngUrl(urlDesafio(codigo));
}

export async function qrPngUrl(url: string) {
  return QRCode.toBuffer(url, {
    type: "png",
    width: 900,
    margin: 2,
    color: { dark: "#0B3B60", light: "#FFFFFF" },
    errorCorrectionLevel: "H",
  });
}

export async function qrPdf(
  desafio: { codigoQr: string; titulo: string; puntos: number },
) {
  const documento = await PDFDocument.create();
  const pagina = documento.addPage([595, 842]);
  const fuente = await documento.embedFont(StandardFonts.Helvetica);
  const negrita = await documento.embedFont(StandardFonts.HelveticaBold);
  pagina.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: rgb(0.043, 0.231, 0.376) });
  pagina.drawText("GRUPO EPM · PASAPORTE", { x: 42, y: 792, size: 22, font: negrita, color: rgb(1, 1, 1) });
  const png = await documento.embedPng(await qrPng(desafio.codigoQr));
  pagina.drawImage(png, { x: 100, y: 260, width: 395, height: 395 });
  pagina.drawText(desafio.titulo.slice(0, 55), { x: 55, y: 205, size: 24, font: negrita, color: rgb(0.043, 0.231, 0.376) });
  pagina.drawText(`${desafio.puntos} puntos`, { x: 55, y: 167, size: 20, font: fuente, color: rgb(0.18, 0.62, 0.36) });
  pagina.drawRectangle({ x: 0, y: 0, width: 595, height: 72, color: rgb(0.055, 0.486, 0.431) });
  pagina.drawText("Vicepresidencia Experiencia Usuario-Cliente", { x: 55, y: 31, size: 12, font: fuente, color: rgb(1, 1, 1) });
  return documento.save();
}

export function crearCodigoQr(titulo: string) {
  const base = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `${base || "reto"}-${crypto.randomUUID().slice(0, 6)}`;
}
