import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { DIRECTIVA_EXPERIENCIA } from "@/lib/mensajes";

type DatosPasaporte = {
  nombre: string;
  empresa: string;
  equipo: string;
  evento: string;
  codigo: string;
  urlRecuperacion: string;
  logo?: Uint8Array;
  foto?: Uint8Array;
};

function textoCentrado(anchoPagina: number, texto: string, fuente: PDFFont, tamano: number) {
  return (anchoPagina - fuente.widthOfTextAtSize(texto, tamano)) / 2;
}

function tamanoQueCabe(texto: string, fuente: PDFFont, maximo: number, ancho: number, minimo = 12) {
  let tamano = maximo;
  while (tamano > minimo && fuente.widthOfTextAtSize(texto, tamano) > ancho) tamano -= 1;
  return tamano;
}

export async function generarPasaportePdf(datos: DatosPasaporte) {
  const documento = await PDFDocument.create();
  const pagina = documento.addPage([420, 595]);
  const normal = await documento.embedFont(StandardFonts.Helvetica);
  const negrita = await documento.embedFont(StandardFonts.HelveticaBold);
  const azul = rgb(0.043, 0.231, 0.376);
  const teal = rgb(0.055, 0.486, 0.431);
  const verde = rgb(0.463, 0.741, 0.118);
  const gris = rgb(0.34, 0.39, 0.43);

  pagina.drawRectangle({ x: 0, y: 0, width: 420, height: 595, color: azul });
  pagina.drawCircle({ x: 397, y: 570, size: 100, color: verde, opacity: 0.25 });
  pagina.drawCircle({ x: 20, y: 30, size: 82, color: teal, opacity: 0.35 });
  pagina.drawRectangle({ x: 22, y: 22, width: 376, height: 551, color: rgb(1, 1, 1), borderColor: verde, borderWidth: 2 });
  pagina.drawRectangle({ x: 22, y: 558, width: 376, height: 15, color: verde });

  if (datos.logo) {
    try {
      const logo = await documento.embedPng(datos.logo);
      const escala = Math.min(160 / logo.width, 38 / logo.height);
      const ancho = logo.width * escala;
      pagina.drawImage(logo, { x: (420 - ancho) / 2, y: 510, width: ancho, height: logo.height * escala });
    } catch {
      pagina.drawText("GRUPO EPM", { x: 155, y: 522, size: 17, font: negrita, color: azul });
    }
  } else {
    pagina.drawText("GRUPO EPM", { x: 155, y: 522, size: 17, font: negrita, color: azul });
  }

  const titulo = "PASAPORTE DEL ENCUENTRO";
  pagina.drawText(titulo, { x: textoCentrado(420, titulo, negrita, 19), y: 476, size: 19, font: negrita, color: teal });
  const tamanoEvento = tamanoQueCabe(datos.evento, negrita, 15, 330);
  pagina.drawText(datos.evento, { x: textoCentrado(420, datos.evento, negrita, tamanoEvento), y: 451, size: tamanoEvento, font: negrita, color: gris });

  pagina.drawRectangle({ x: 151, y: 312, width: 118, height: 118, color: rgb(0.94, 0.97, 0.98), borderColor: verde, borderWidth: 3 });
  if (datos.foto) {
    try {
      const foto = await documento.embedJpg(datos.foto);
      const escala = Math.min(108 / foto.width, 108 / foto.height);
      const ancho = foto.width * escala;
      const alto = foto.height * escala;
      pagina.drawImage(foto, { x: 210 - ancho / 2, y: 371 - alto / 2, width: ancho, height: alto });
    } catch {
      pagina.drawText("FOTO", { x: 190, y: 366, size: 13, font: negrita, color: gris });
    }
  } else {
    pagina.drawText("FOTO", { x: 190, y: 366, size: 13, font: negrita, color: gris });
  }

  const tamanoNombre = tamanoQueCabe(datos.nombre, negrita, 24, 340, 15);
  pagina.drawText(datos.nombre, { x: textoCentrado(420, datos.nombre, negrita, tamanoNombre), y: 280, size: tamanoNombre, font: negrita, color: azul });
  const afiliacion = `${datos.empresa}  ·  ${datos.equipo}`;
  const tamanoAfiliacion = tamanoQueCabe(afiliacion, normal, 13, 330, 10);
  pagina.drawText(afiliacion, { x: textoCentrado(420, afiliacion, normal, tamanoAfiliacion), y: 256, size: tamanoAfiliacion, font: normal, color: gris });

  pagina.drawRectangle({ x: 50, y: 214, width: 320, height: 34, color: teal, opacity: 0.08 });
  const corteDirectiva = DIRECTIVA_EXPERIENCIA.indexOf("transparencia");
  const directiva1 = DIRECTIVA_EXPERIENCIA.slice(0, corteDirectiva).trim();
  const directiva2 = DIRECTIVA_EXPERIENCIA.slice(corteDirectiva).trim();
  pagina.drawText(directiva1, { x: textoCentrado(420, directiva1, negrita, 8.5), y: 232, size: 8.5, font: negrita, color: azul });
  pagina.drawText(directiva2, { x: textoCentrado(420, directiva2, negrita, 8.5), y: 219, size: 8.5, font: negrita, color: teal });

  const qrBytes = await QRCode.toBuffer(datos.urlRecuperacion, {
    type: "png",
    width: 650,
    margin: 2,
    color: { dark: "#0B3B60", light: "#FFFFFF" },
    errorCorrectionLevel: "H",
  });
  const qr = await documento.embedPng(qrBytes);
  pagina.drawImage(qr, { x: 145, y: 78, width: 130, height: 130 });
  pagina.drawText("CÓDIGO DE RECUPERACIÓN", { x: 128, y: 64, size: 9, font: negrita, color: gris });
  pagina.drawText(datos.codigo, { x: textoCentrado(420, datos.codigo, negrita, 20), y: 40, size: 20, font: negrita, color: azul });
  pagina.drawText("Escanea este QR para recuperar tu perfil en otro dispositivo", { x: 82, y: 28, size: 8, font: normal, color: gris });

  return documento.save();
}
