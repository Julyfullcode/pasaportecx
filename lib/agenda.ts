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
  type RGB,
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
  fecha?: string | null;
  fotos?: Uint8Array[];
  momentos: MomentoAgendaPdf[];
};

type DatosAgenda = {
  evento: string;
  descripcion: string;
  organizadores: string;
  dias: DiaAgendaPdf[];
  logo?: Uint8Array;
};

const azul = rgb(0.043, 0.231, 0.376);
const azulProfundo = rgb(0.043, 0.153, 0.255);
const teal = rgb(0.055, 0.486, 0.431);
const verde = rgb(0.463, 0.741, 0.118);
const gris = rgb(0.34, 0.39, 0.43);
const fondo = rgb(0.956, 0.973, 0.98);
const blanco = rgb(1, 1, 1);

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
    } else actual = candidata;
  }
  if (actual) resultado.push(actual);
  return resultado.length ? resultado : [""];
}

function tamanoQueCabe(texto: string, fuente: PDFFont, maximo: number, ancho: number, minimo = 8) {
  let tamano = maximo;
  while (tamano > minimo && fuente.widthOfTextAtSize(seguro(texto), tamano) > ancho) tamano -= 0.5;
  return tamano;
}

function formatearFecha(fecha?: string | null) {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return "";
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const [ano, mes, dia] = fecha.split("-").map(Number);
  return `${dia} de ${meses[mes - 1]} de ${ano}`;
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

function dibujarDegradado(pagina: PDFPage, y: number, alto: number) {
  const inicio = [0.043, 0.153, 0.255];
  const fin = [0.055, 0.486, 0.431];
  const pasos = 48;
  const ancho = 595 / pasos;
  for (let indice = 0; indice < pasos; indice += 1) {
    const t = indice / (pasos - 1);
    pagina.drawRectangle({
      x: indice * ancho,
      y,
      width: ancho + 0.5,
      height: alto,
      color: rgb(
        inicio[0] + (fin[0] - inicio[0]) * t,
        inicio[1] + (fin[1] - inicio[1]) * t,
        inicio[2] + (fin[2] - inicio[2]) * t,
      ),
    });
  }
}

async function incrustarFoto(documento: PDFDocument, datos?: Uint8Array) {
  if (!datos) return undefined;
  try { return await documento.embedJpg(datos); } catch {
    try { return await documento.embedPng(datos); } catch { return undefined; }
  }
}

function dibujarFotoCircular(pagina: PDFPage, foto: PDFImage, centroX: number, centroY: number, radio: number, borde = blanco) {
  const control = radio * 0.5522847498;
  pagina.pushOperators(
    pushGraphicsState(),
    moveTo(centroX + radio, centroY),
    appendBezierCurve(centroX + radio, centroY + control, centroX + control, centroY + radio, centroX, centroY + radio),
    appendBezierCurve(centroX - control, centroY + radio, centroX - radio, centroY + control, centroX - radio, centroY),
    appendBezierCurve(centroX - radio, centroY - control, centroX - control, centroY - radio, centroX, centroY - radio),
    appendBezierCurve(centroX + control, centroY - radio, centroX + radio, centroY - control, centroX + radio, centroY),
    closePath(), clip(), endPath(),
  );
  const diametro = radio * 2;
  const escala = Math.max(diametro / foto.width, diametro / foto.height);
  const ancho = foto.width * escala;
  const alto = foto.height * escala;
  pagina.drawImage(foto, { x: centroX - ancho / 2, y: centroY - alto / 2, width: ancho, height: alto });
  pagina.pushOperators(popGraphicsState());
  pagina.drawCircle({ x: centroX, y: centroY, size: radio, borderColor: borde, borderWidth: 2.5 });
}

function dibujarEncabezado(pagina: PDFPage, logo: PDFImage | undefined, datos: DatosAgenda, normal: PDFFont, negrita: PDFFont) {
  pagina.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: fondo });
  dibujarDegradado(pagina, 650, 192);
  pagina.drawCircle({ x: 566, y: 820, size: 92, color: verde, opacity: 0.18 });
  pagina.drawCircle({ x: 520, y: 676, size: 70, color: blanco, opacity: 0.07 });
  pagina.drawCircle({ x: 32, y: 654, size: 56, color: verde, opacity: 0.18 });
  pagina.drawText("Agenda del encuentro", { x: 38, y: 807, size: 11, font: negrita, color: verde });
  if (logo) {
    const escala = Math.min(142 / logo.width, 32 / logo.height);
    pagina.drawImage(logo, { x: 415, y: 794, width: logo.width * escala, height: logo.height * escala });
  }
  const titulo = lineas(datos.evento, negrita, 29, 500).slice(0, 2);
  let tituloY = 765;
  for (const linea of titulo) {
    pagina.drawText(linea, { x: 38, y: tituloY, size: 29, font: negrita, color: blanco });
    tituloY -= 33;
  }
  const descripcion = lineas(datos.descripcion, normal, 10.5, 455).slice(0, 3);
  let descripcionY = Math.min(696, tituloY - 2);
  for (const linea of descripcion) {
    pagina.drawText(linea, { x: 39, y: descripcionY, size: 10.5, font: normal, color: blanco, opacity: 0.9 });
    descripcionY -= 13;
  }
}

async function prepararFotos(documento: PDFDocument, fotos?: Uint8Array[]) {
  const incrustadas = await Promise.all((fotos ?? []).slice(0, 6).map((foto) => incrustarFoto(documento, foto)));
  return incrustadas.filter((foto): foto is PDFImage => Boolean(foto));
}

function dibujarTituloDia(pagina: PDFPage, y: number, nombre: string, fecha: string, fotos: PDFImage[], normal: PDFFont, negrita: PDFFont, continuacion = false) {
  cajaRedondeada(pagina, 40, y - 55, 515, 54, 27, azulProfundo, 0.09);
  cajaRedondeada(pagina, 38, y - 52, 519, 54, 27, teal);
  const reservaFotos = fotos.length ? Math.min(150, fotos.length * 38 + 20) : 0;
  const etiqueta = continuacion ? `${nombre} · continuación` : nombre;
  pagina.drawText(seguro(etiqueta), { x: 58, y: y - 21, size: tamanoQueCabe(etiqueta, negrita, 17, 455 - reservaFotos, 11), font: negrita, color: blanco });
  if (fecha) pagina.drawText(seguro(fecha), { x: 59, y: y - 39, size: 9.5, font: normal, color: blanco, opacity: 0.85 });
  fotos.slice(0, 4).forEach((foto, indice) => dibujarFotoCircular(pagina, foto, 525 - indice * 39, y - 25, 20, verde));
  return y - 68;
}

export async function generarAgendaPdf(datos: DatosAgenda) {
  const documento = await PDFDocument.create();
  const normal = await documento.embedFont(StandardFonts.Helvetica);
  const negrita = await documento.embedFont(StandardFonts.HelveticaBold);
  const logo = await incrustarFoto(documento, datos.logo);

  function nuevaPagina() {
    const pagina = documento.addPage([595, 842]);
    dibujarEncabezado(pagina, logo, datos, normal, negrita);
    return pagina;
  }

  let pagina = nuevaPagina();
  let y = 625;

  if (datos.dias.length === 0) {
    cajaRedondeada(pagina, 100, 380, 395, 112, 32, blanco);
    pagina.drawCircle({ x: 150, y: 436, size: 34, color: verde, opacity: 0.22 });
    pagina.drawText("Agenda en preparación", { x: 195, y: 447, size: 19, font: negrita, color: azulProfundo });
    pagina.drawText("Pronto encontrarás aquí todos los momentos del encuentro.", { x: 195, y: 420, size: 10.5, font: normal, color: gris });
  }

  for (const dia of datos.dias) {
    const fotosDia = await prepararFotos(documento, dia.fotos);
    if (y < (dia.momentos.length ? 220 : 132)) {
      pagina = nuevaPagina();
      y = 625;
    }
    y = dibujarTituloDia(pagina, y, dia.nombre, formatearFecha(dia.fecha), fotosDia, normal, negrita);
    if (dia.momentos.length === 0) {
      pagina.drawText("Los momentos de este día estarán disponibles próximamente.", { x: 58, y: y - 18, size: 11, font: normal, color: gris });
      y -= 48;
      continue;
    }

    for (const momento of dia.momentos) {
      const fotoExpositor = await incrustarFoto(documento, momento.fotoExpositor);
      const textoX = fotoExpositor ? 207 : 151;
      const anchoTexto = fotoExpositor ? 322 : 378;
      const titulo = lineas(momento.nombre, negrita, 14, anchoTexto);
      const descripcion = lineas(momento.descripcion, normal, 10.3, anchoTexto);
      const alto = Math.max(fotoExpositor ? 92 : 82, 31 + titulo.length * 17 + descripcion.length * 13);
      if (y - alto < 54) {
        pagina = nuevaPagina();
        y = dibujarTituloDia(pagina, 625, dia.nombre, formatearFecha(dia.fecha), fotosDia, normal, negrita, true);
      }
      const inferior = y - alto;
      cajaRedondeada(pagina, 130, inferior - 3, 427, alto - 4, 22, azulProfundo, 0.08);
      cajaRedondeada(pagina, 126, inferior, 431, alto - 4, 22, blanco);
      cajaRedondeada(pagina, 38, y - 58, 76, 45, 20, teal, 0.12);
      pagina.drawText(seguro(momento.horaInicio), { x: 53, y: y - 34, size: 12.5, font: negrita, color: azulProfundo });
      pagina.drawText(seguro(momento.horaFin), { x: 56, y: y - 49, size: 9, font: normal, color: teal });
      pagina.drawCircle({ x: 127, y: y - 30, size: 6, color: verde, borderColor: blanco, borderWidth: 2 });
      if (fotoExpositor) dibujarFotoCircular(pagina, fotoExpositor, 166, y - 45, 27, verde);
      let textoY = y - 27;
      for (const linea of titulo) {
        pagina.drawText(linea, { x: textoX, y: textoY, size: 14, font: negrita, color: azulProfundo });
        textoY -= 17;
      }
      textoY -= 3;
      for (const linea of descripcion) {
        pagina.drawText(linea, { x: textoX, y: textoY, size: 10.3, font: normal, color: gris });
        textoY -= 13;
      }
      y = inferior - 12;
    }
    y -= 8;
  }

  const paginas = documento.getPages();
  paginas.forEach((paginaActual, indice) => {
    paginaActual.drawLine({ start: { x: 38, y: 42 }, end: { x: 557, y: 42 }, thickness: 1, color: teal, opacity: 0.2 });
    const pie = datos.organizadores ? `Organizan: ${seguro(datos.organizadores)}` : "";
    if (pie) paginaActual.drawText(pie, { x: 38, y: 24, size: tamanoQueCabe(pie, normal, 8.5, 445, 7), font: normal, color: teal });
    const numero = `${indice + 1} / ${paginas.length}`;
    paginaActual.drawText(numero, { x: 528, y: 24, size: 8.5, font: negrita, color: azulProfundo });
  });
  return documento.save();
}
