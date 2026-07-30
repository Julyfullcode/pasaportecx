import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

type DatosDiploma = {
  nombre: string;
  empresa: string;
  equipo: string;
  evento: string;
  fecha: Date;
  logo?: Uint8Array;
};

function textoCentrado(pagina: PDFPage, texto: string, y: number, tamano: number, fuente: PDFFont, color = rgb(0.043, 0.231, 0.376)) {
  const ancho = fuente.widthOfTextAtSize(texto, tamano);
  pagina.drawText(texto, { x: (pagina.getWidth() - ancho) / 2, y, size: tamano, font: fuente, color });
}

function tamanoQueCabe(texto: string, fuente: PDFFont, maximo: number, ancho: number) {
  let tamano = maximo;
  while (tamano > 20 && fuente.widthOfTextAtSize(texto, tamano) > ancho) tamano -= 1;
  return tamano;
}

export async function generarDiplomaPdf(datos: DatosDiploma) {
  const documento = await PDFDocument.create();
  const pagina = documento.addPage([841.89, 595.28]);
  const normal = await documento.embedFont(StandardFonts.Helvetica);
  const negrita = await documento.embedFont(StandardFonts.HelveticaBold);
  const azul = rgb(0.043, 0.231, 0.376);
  const teal = rgb(0.055, 0.486, 0.431);
  const verde = rgb(0.463, 0.741, 0.118);
  const gris = rgb(0.34, 0.39, 0.43);

  pagina.drawRectangle({ x: 0, y: 0, width: 841.89, height: 595.28, color: rgb(1, 1, 1) });
  pagina.drawRectangle({ x: 0, y: 535, width: 841.89, height: 60, color: azul });
  pagina.drawRectangle({ x: 0, y: 0, width: 841.89, height: 36, color: teal });
  pagina.drawRectangle({ x: 17, y: 17, width: 807.89, height: 561.28, borderColor: verde, borderWidth: 2 });
  pagina.drawCircle({ x: 790, y: 548, size: 92, color: verde, opacity: 0.22 });
  pagina.drawCircle({ x: 61, y: 54, size: 78, color: teal, opacity: 0.13 });

  if (datos.logo) {
    try {
      const logo = await documento.embedPng(datos.logo);
      const escala = Math.min(174 / logo.width, 40 / logo.height);
      pagina.drawImage(logo, { x: 43, y: 545, width: logo.width * escala, height: logo.height * escala });
    } catch {
      pagina.drawText("GRUPO EPM", { x: 43, y: 554, size: 17, font: negrita, color: rgb(1, 1, 1) });
    }
  } else {
    pagina.drawText("GRUPO EPM", { x: 43, y: 554, size: 17, font: negrita, color: rgb(1, 1, 1) });
  }

  textoCentrado(pagina, "DIPLOMA DE PARTICIPACIÓN", 474, 25, negrita, teal);
  pagina.drawRectangle({ x: 316, y: 458, width: 210, height: 4, color: verde });
  textoCentrado(pagina, "Grupo EPM reconoce a", 415, 15, normal, gris);
  textoCentrado(pagina, datos.nombre, 354, tamanoQueCabe(datos.nombre, negrita, 42, 690), negrita, azul);
  textoCentrado(pagina, "por su participación activa y entusiasta en", 315, 15, normal, gris);
  textoCentrado(pagina, datos.evento, 273, tamanoQueCabe(datos.evento, negrita, 27, 680), negrita, teal);
  textoCentrado(pagina, "y por contribuir con su energía a una experiencia que deja huella.", 232, 14, normal, gris);
  textoCentrado(pagina, `${datos.empresa}  ·  ${datos.equipo}`, 187, 14, negrita, azul);

  const fecha = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" }).format(datos.fecha);
  pagina.drawLine({ start: { x: 305, y: 128 }, end: { x: 537, y: 128 }, thickness: 1, color: rgb(0.75, 0.79, 0.82) });
  textoCentrado(pagina, fecha, 106, 12, normal, gris);
  textoCentrado(pagina, "Un recuerdo de tu participación en el Encuentro de Experiencia", 62, 12, negrita, azul);
  pagina.drawText("Vicepresidencia Experiencia Usuario-Cliente", { x: 43, y: 13, size: 10, font: normal, color: rgb(1, 1, 1) });

  return documento.save();
}
