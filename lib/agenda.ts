import {
  PDFDocument,
  StandardFonts,
  appendBezierCurve,
  clip,
  closePath,
  endPath,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

type MomentoAgendaPdf = {
  horaInicio: string;
  horaFin: string;
  nombre: string;
  descripcion: string;
  fotoExpositor?: Uint8Array;
};

type DiaAgendaPdf = {
  nombre: string;
  momentos: MomentoAgendaPdf[];
};

type DatosAgenda = {
  evento: string;
  dias: DiaAgendaPdf[];
  logo?: Uint8Array;
};

const azul = rgb(0.043, 0.231, 0.376);
const teal = rgb(0.055, 0.486, 0.431);
const verde = rgb(0.463, 0.741, 0.118);
const gris = rgb(0.34, 0.39, 0.43);
const fondo = rgb(0.956, 0.973, 0.98);

function seguro(texto: string) {
  return texto.normalize("NFC").replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "").replace(/\s+/g, " ").trim();
}

function lineas(texto: string, fuente: PDFFont, tamano: number, anchoMaximo: number) {
  const palabras = seguro(texto).split(" " ).filter(Boolean);
  const resultado: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (actual && fuente.widthOfTextAtSize(candidata, tamano) > anchoMaximo) {
      resultado.push(actual);
      actual = palabra;
    } else {
      actual = candidata;
    }
  }
  if (actual) resultado.push(actual);
  return resultado.length ? resultado : [""];
}

function tamanoQueCabe(texto: string, fuente: PDFFont, maximo: number, ancho: number, minimo = 11) {
  let tamano = maximo;
  while (tamano > minimo && fuente.widthOfTextAtSize(seguro(texto), tamano) > ancho) tamano -= 1;
  return tamano;
}

async function incrustarFoto(documento: PDFDocument, datos?: Uint8Array) {
  if (!datos) return undefined;
  try { return await documento.embedJpg(datos); } catch {
    try { return await documento.embedPng(datos); } catch { return undefined; }
  }
}

function dibujarFotoCircular(pagina: PDFPage, foto: PDFImage, centroX: number, centroY: number, radio: number) {
  const kappa = 0.5522847498;
  const control = radio * kappa;
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
  pagina.drawCircle({ x: centroX, y: centroY, size: radio, borderColor: verde, borderWidth: 2 });
}

function dibujarEncabezado(pagina: PDFPage, logo: PDFImage | undefined, evento: string, dia: string, continuacion: boolean, normal: PDFFont, negrita: PDFFont) {
  pagina.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: fondo });
  pagina.drawRectangle({ x: 0, y: 716, width: 595, height: 126, color: azul });
  pagina.drawRectangle({ x: 0, y: 708, width: 595, height: 8, color: verde });
  pagina.drawCircle({ x: 554, y: 814, size: 82, color: verde, opacity: 0.25 });
  pagina.drawCircle({ x: 43, y: 729, size: 58, color: teal, opacity: 0.35 });
  if (logo) {
    const escala = Math.min(150 / logo.width, 34 / logo.height);
    pagina.drawRectangle({ x: 38, y: 787, width: 166, height: 42, color: rgb(1, 1, 1), opacity: 0.96 });
    pagina.drawImage(logo, { x: 46, y: 791, width: logo.width * escala, height: logo.height * escala });
  }
  const titulo = "AGENDA DEL ENCUENTRO";
  pagina.drawText(titulo, { x: 38, y: 754, size: 24, font: negrita, color: rgb(1, 1, 1) });
  const tamanoEvento = tamanoQueCabe(evento, normal, 13, 500);
  pagina.drawText(seguro(evento), { x: 39, y: 733, size: tamanoEvento, font: normal, color: rgb(1, 1, 1), opacity: 0.82 });
  pagina.drawRectangle({ x: 38, y: 660, width: 519, height: 34, color: teal });
  const etiqueta = continuacion ? `${seguro(dia)}  ·  CONTINUACIÓN` : seguro(dia);
  pagina.drawText(etiqueta, { x: 53, y: 671, size: tamanoQueCabe(etiqueta, negrita, 14, 485), font: negrita, color: rgb(1, 1, 1) });
}

export async function generarAgendaPdf(datos: DatosAgenda) {
  const documento = await PDFDocument.create();
  const normal = await documento.embedFont(StandardFonts.Helvetica);
  const negrita = await documento.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | undefined;
  if (datos.logo) {
    try { logo = await documento.embedPng(datos.logo); } catch { logo = undefined; }
  }

  function nuevaPagina(dia: string, continuacion = false) {
    const pagina = documento.addPage([595, 842]);
    dibujarEncabezado(pagina, logo, datos.evento, dia, continuacion, normal, negrita);
    return pagina;
  }

  if (datos.dias.length === 0) {
    const pagina = nuevaPagina("AGENDA EN PREPARACIÓN");
    pagina.drawCircle({ x: 297.5, y: 420, size: 72, color: teal, opacity: 0.12 });
    pagina.drawText("AGENDA EN PREPARACIÓN", { x: 171, y: 422, size: 19, font: negrita, color: azul });
    pagina.drawText("Pronto encontrarás aquí todos los momentos del encuentro.", { x: 134, y: 394, size: 11, font: normal, color: gris });
  }

  for (const dia of datos.dias) {
    let pagina = nuevaPagina(dia.nombre);
    let y = 635;
    if (dia.momentos.length === 0) {
      pagina.drawText("Los momentos de este día estarán disponibles próximamente.", { x: 116, y: 540, size: 12, font: normal, color: gris });
      continue;
    }

    for (const momento of dia.momentos) {
      const fotoExpositor = await incrustarFoto(documento, momento.fotoExpositor);
      const textoX = fotoExpositor ? 202 : 146;
      const anchoTexto = fotoExpositor ? 335 : 380;
      const titulo = lineas(momento.nombre, negrita, 14, anchoTexto);
      const descripcion = lineas(momento.descripcion, normal, 10.5, anchoTexto);
      const alto = Math.max(fotoExpositor ? 82 : 72, 27 + titulo.length * 17 + descripcion.length * 13);
      if (y - alto < 54) {
        pagina = nuevaPagina(dia.nombre, true);
        y = 635;
      }
      const inferior = y - alto;
      pagina.drawRectangle({ x: 126, y: inferior, width: 431, height: alto - 6, color: rgb(1, 1, 1), borderColor: rgb(0.86, 0.9, 0.92), borderWidth: 1 });
      pagina.drawRectangle({ x: 126, y: inferior, width: 6, height: alto - 6, color: verde });
      pagina.drawLine({ start: { x: 108, y: y + 6 }, end: { x: 108, y: inferior - 5 }, thickness: 2, color: teal, opacity: 0.35 });
      pagina.drawCircle({ x: 108, y: y - 23, size: 7, color: verde, borderColor: rgb(1, 1, 1), borderWidth: 2 });
      pagina.drawText(seguro(momento.horaInicio), { x: 42, y: y - 19, size: 13, font: negrita, color: azul });
      pagina.drawText(seguro(momento.horaFin), { x: 43, y: y - 36, size: 10, font: normal, color: gris });
      if (fotoExpositor) dibujarFotoCircular(pagina, fotoExpositor, 166, y - 34, 24);
      let textoY = y - 22;
      for (const linea of titulo) {
        pagina.drawText(linea, { x: textoX, y: textoY, size: 14, font: negrita, color: azul });
        textoY -= 17;
      }
      textoY -= 3;
      for (const linea of descripcion) {
        pagina.drawText(linea, { x: textoX, y: textoY, size: 10.5, font: normal, color: gris });
        textoY -= 13;
      }
      y = inferior - 10;
    }
  }

  const paginas = documento.getPages();
  paginas.forEach((pagina, indice) => {
    pagina.drawText("Vicepresidencia Experiencia Usuario-Cliente", { x: 38, y: 24, size: 9, font: normal, color: teal });
    const numero = `${indice + 1} / ${paginas.length}`;
    pagina.drawText(numero, { x: 530, y: 24, size: 9, font: negrita, color: azul });
  });
  return documento.save();
}
