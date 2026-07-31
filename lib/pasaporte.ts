import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import {
  PDFDocument,
  StandardFonts,
  appendBezierCurve,
  clip,
  closePath,
  endPath,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";
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
  fuenteRegular?: Uint8Array;
  fuenteSemibold?: Uint8Array;
};

const anchoPagina = 420;

function textoCentrado(texto: string, fuente: PDFFont, tamano: number) {
  return (anchoPagina - fuente.widthOfTextAtSize(texto, tamano)) / 2;
}

function tamanoQueCabe(texto: string, fuente: PDFFont, maximo: number, ancho: number, minimo = 9) {
  let tamano = maximo;
  while (tamano > minimo && fuente.widthOfTextAtSize(texto, tamano) > ancho) tamano -= 0.5;
  return tamano;
}

function lineas(texto: string, fuente: PDFFont, tamano: number, anchoMaximo: number) {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  const resultado: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (actual && fuente.widthOfTextAtSize(candidata, tamano) > anchoMaximo) {
      resultado.push(actual);
      actual = palabra;
    } else actual = candidata;
  }
  if (actual) resultado.push(actual);
  return resultado;
}

function cajaRedondeada(pagina: PDFPage, x: number, y: number, ancho: number, alto: number, radio: number, color: RGB, opacity = 1) {
  const r = Math.min(radio, ancho / 2, alto / 2);
  pagina.drawRectangle({ x: x + r, y, width: ancho - 2 * r, height: alto, color, opacity });
  pagina.drawRectangle({ x, y: y + r, width: ancho, height: alto - 2 * r, color, opacity });
  pagina.drawCircle({ x: x + r, y: y + r, size: r, color, opacity });
  pagina.drawCircle({ x: x + ancho - r, y: y + r, size: r, color, opacity });
  pagina.drawCircle({ x: x + r, y: y + alto - r, size: r, color, opacity });
  pagina.drawCircle({ x: x + ancho - r, y: y + alto - r, size: r, color, opacity });
}

function recortarCajaRedondeada(pagina: PDFPage, x: number, y: number, ancho: number, alto: number, radio: number) {
  const control = radio * 0.5522847498;
  pagina.pushOperators(
    pushGraphicsState(),
    moveTo(x + radio, y),
    lineTo(x + ancho - radio, y),
    appendBezierCurve(x + ancho - radio + control, y, x + ancho, y + radio - control, x + ancho, y + radio),
    lineTo(x + ancho, y + alto - radio),
    appendBezierCurve(x + ancho, y + alto - radio + control, x + ancho - radio + control, y + alto, x + ancho - radio, y + alto),
    lineTo(x + radio, y + alto),
    appendBezierCurve(x + radio - control, y + alto, x, y + alto - radio + control, x, y + alto - radio),
    lineTo(x, y + radio),
    appendBezierCurve(x, y + radio - control, x + radio - control, y, x + radio, y),
    closePath(),
    clip(),
    endPath(),
  );
}

function dibujarDegradado(pagina: PDFPage, x: number, y: number, ancho: number, alto: number) {
  const inicio = [0.043, 0.153, 0.255];
  const fin = [0.055, 0.486, 0.431];
  const pasos = 48;
  recortarCajaRedondeada(pagina, x, y, ancho, alto, 30);
  for (let indice = 0; indice < pasos; indice += 1) {
    const t = indice / (pasos - 1);
    pagina.drawRectangle({
      x: x + (ancho / pasos) * indice,
      y,
      width: ancho / pasos + 1,
      height: alto,
      color: rgb(
        inicio[0] + (fin[0] - inicio[0]) * t,
        inicio[1] + (fin[1] - inicio[1]) * t,
        inicio[2] + (fin[2] - inicio[2]) * t,
      ),
    });
  }
  pagina.pushOperators(popGraphicsState());
}

function dibujarFotoCircular(pagina: PDFPage, foto: PDFImage, centroX: number, centroY: number, radio: number) {
  const control = radio * 0.5522847498;
  pagina.pushOperators(
    pushGraphicsState(),
    moveTo(centroX + radio, centroY),
    appendBezierCurve(centroX + radio, centroY + control, centroX + control, centroY + radio, centroX, centroY + radio),
    appendBezierCurve(centroX - control, centroY + radio, centroX - radio, centroY + control, centroX - radio, centroY),
    appendBezierCurve(centroX - radio, centroY - control, centroX - control, centroY - radio, centroX, centroY - radio),
    appendBezierCurve(centroX + control, centroY - radio, centroX + radio, centroY - control, centroX + radio, centroY),
    closePath(),
    clip(),
    endPath(),
  );
  const diametro = radio * 2;
  const escala = Math.max(diametro / foto.width, diametro / foto.height);
  const ancho = foto.width * escala;
  const alto = foto.height * escala;
  pagina.drawImage(foto, { x: centroX - ancho / 2, y: centroY - alto / 2, width: ancho, height: alto });
  pagina.pushOperators(popGraphicsState());
  pagina.drawCircle({ x: centroX, y: centroY, size: radio, borderColor: rgb(1, 1, 1), borderWidth: 4 });
}

export async function generarPasaportePdf(datos: DatosPasaporte) {
  const documento = await PDFDocument.create();
  documento.registerFontkit(fontkit);
  documento.setTitle(`Pasaporte CX - ${datos.nombre}`);
  documento.setSubject(datos.evento);
  const pagina = documento.addPage([anchoPagina, 595]);
  const normal = datos.fuenteRegular
    ? await documento.embedFont(datos.fuenteRegular, { subset: true })
    : await documento.embedFont(StandardFonts.Helvetica);
  const negrita = datos.fuenteSemibold
    ? await documento.embedFont(datos.fuenteSemibold, { subset: true })
    : await documento.embedFont(StandardFonts.HelveticaBold);
  const azul = rgb(0.043, 0.153, 0.255);
  const teal = rgb(0.055, 0.486, 0.431);
  const verde = rgb(0.463, 0.741, 0.118);
  const gris = rgb(0.34, 0.39, 0.43);
  const blanco = rgb(1, 1, 1);
  const fondo = rgb(0.95, 0.975, 0.98);

  pagina.drawRectangle({ x: 0, y: 0, width: anchoPagina, height: 595, color: fondo });
  pagina.drawCircle({ x: 402, y: 574, size: 105, color: verde, opacity: 0.14 });
  pagina.drawCircle({ x: 15, y: 26, size: 82, color: teal, opacity: 0.1 });
  cajaRedondeada(pagina, 18, 18, 384, 559, 34, blanco);
  dibujarDegradado(pagina, 30, 350, 360, 215);
  pagina.drawCircle({ x: 360, y: 548, size: 64, color: verde, opacity: 0.19 });
  pagina.drawCircle({ x: 49, y: 371, size: 48, color: blanco, opacity: 0.08 });

  if (datos.logo) {
    try {
      const logo = await documento.embedPng(datos.logo);
      const escala = Math.min(132 / logo.width, 28 / logo.height);
      const ancho = logo.width * escala;
      pagina.drawImage(logo, { x: (anchoPagina - ancho) / 2, y: 527, width: ancho, height: logo.height * escala });
    } catch {
      pagina.drawText("Grupo EPM", { x: textoCentrado("Grupo EPM", negrita, 14), y: 535, size: 14, font: negrita, color: blanco });
    }
  }

  const titulo = "Pasaporte CX";
  pagina.drawText(titulo, { x: textoCentrado(titulo, negrita, 27), y: 487, size: 27, font: negrita, color: blanco });
  const lineasEvento = lineas(datos.evento, normal, 10.5, 300).slice(0, 2);
  lineasEvento.forEach((linea, indice) => pagina.drawText(linea, {
    x: textoCentrado(linea, normal, 10.5),
    y: 466 - indice * 14,
    size: 10.5,
    font: normal,
    color: blanco,
    opacity: 0.88,
  }));

  pagina.drawCircle({ x: 210, y: 372, size: 70, color: azul, opacity: 0.16 });
  pagina.drawCircle({ x: 210, y: 376, size: 67, color: blanco });
  if (datos.foto) {
    try {
      const foto = await documento.embedPng(datos.foto);
      dibujarFotoCircular(pagina, foto, 210, 376, 62);
    } catch {
      pagina.drawText("Tu foto", { x: textoCentrado("Tu foto", negrita, 12), y: 371, size: 12, font: negrita, color: teal });
    }
  } else {
    pagina.drawText("Tu foto", { x: textoCentrado("Tu foto", negrita, 12), y: 371, size: 12, font: negrita, color: teal });
  }

  const tamanoNombre = tamanoQueCabe(datos.nombre, negrita, 22, 330, 13);
  pagina.drawText(datos.nombre, { x: textoCentrado(datos.nombre, negrita, tamanoNombre), y: 287, size: tamanoNombre, font: negrita, color: azul });
  const afiliacion = `${datos.empresa}  ·  ${datos.equipo}`;
  const tamanoAfiliacion = tamanoQueCabe(afiliacion, normal, 11.5, 322, 8.5);
  pagina.drawText(afiliacion, { x: textoCentrado(afiliacion, normal, tamanoAfiliacion), y: 265, size: tamanoAfiliacion, font: normal, color: gris });

  cajaRedondeada(pagina, 42, 207, 336, 45, 18, rgb(0.91, 0.97, 0.94));
  const corteDirectiva = DIRECTIVA_EXPERIENCIA.indexOf("transparencia");
  const directiva1 = DIRECTIVA_EXPERIENCIA.slice(0, corteDirectiva).trim();
  const directiva2 = DIRECTIVA_EXPERIENCIA.slice(corteDirectiva).trim();
  pagina.drawText(directiva1, { x: textoCentrado(directiva1, negrita, 8.2), y: 230, size: 8.2, font: negrita, color: azul });
  pagina.drawText(directiva2, { x: textoCentrado(directiva2, negrita, 8.2), y: 216, size: 8.2, font: negrita, color: teal });

  const qrBytes = await QRCode.toBuffer(datos.urlRecuperacion, {
    type: "png",
    width: 650,
    margin: 2,
    color: { dark: "#0B3B60", light: "#FFFFFF" },
    errorCorrectionLevel: "H",
  });
  const qr = await documento.embedPng(qrBytes);
  cajaRedondeada(pagina, 143, 75, 134, 126, 24, blanco);
  pagina.drawImage(qr, { x: 157, y: 85, width: 106, height: 106 });
  pagina.drawText("Código de recuperación", { x: textoCentrado("Código de recuperación", normal, 8.5), y: 67, size: 8.5, font: normal, color: gris });
  pagina.drawText(datos.codigo, { x: textoCentrado(datos.codigo, negrita, 18), y: 43, size: 18, font: negrita, color: azul });
  const instruccion = "Escanea el QR para recuperar tu perfil";
  pagina.drawText(instruccion, { x: textoCentrado(instruccion, normal, 7.5), y: 30, size: 7.5, font: normal, color: gris });

  return documento.save();
}
