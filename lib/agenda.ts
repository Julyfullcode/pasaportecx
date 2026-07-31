import fontkit from "@pdf-lib/fontkit";
import { DIRECTIVA_EXPERIENCIA } from "@/lib/mensajes";
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
  destacado: boolean;
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
  fuenteRegular?: Uint8Array;
  fuenteSemibold?: Uint8Array;
};

const azulProfundo = rgb(0.043, 0.153, 0.255);
const teal = rgb(0.055, 0.486, 0.431);
const verde = rgb(0.463, 0.741, 0.118);
const verdeSuave = rgb(0.918, 0.969, 0.886);
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
  return resultado;
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

function formatearHora(hora: string) {
  const coincidencia = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora);
  if (!coincidencia) return seguro(hora);
  const horas = Number(coincidencia[1]);
  const hora12 = horas % 12 || 12;
  return `${hora12}:${coincidencia[2]} ${horas >= 12 ? "p. m." : "a. m."}`;
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
  const titulo = lineas(datos.evento, negrita, 29, 500).slice(0, 2);
  const descripcion = lineas(datos.descripcion, normal, 10.5, 455).slice(0, 3);
  const ultimoTituloY = 765 - Math.max(0, titulo.length - 1) * 33;
  const primeraDescripcionY = 765 - titulo.length * 33 + 8;
  const ultimaDescripcionY = primeraDescripcionY - Math.max(0, descripcion.length - 1) * 13;
  const inferiorEncabezado = Math.max(650, descripcion.length ? ultimaDescripcionY - 28 : ultimoTituloY - 42);
  pagina.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: fondo });
  dibujarDegradado(pagina, inferiorEncabezado, 842 - inferiorEncabezado);
  pagina.drawCircle({ x: 566, y: 820, size: 92, color: verde, opacity: 0.18 });
  pagina.drawCircle({ x: 520, y: inferiorEncabezado + 26, size: 70, color: blanco, opacity: 0.07 });
  pagina.drawCircle({ x: 32, y: inferiorEncabezado + 4, size: 56, color: verde, opacity: 0.18 });
  pagina.drawText("Agenda del encuentro", { x: 38, y: 807, size: 11, font: negrita, color: verde });
  if (logo) {
    const escala = Math.min(142 / logo.width, 32 / logo.height);
    pagina.drawImage(logo, { x: 415, y: 794, width: logo.width * escala, height: logo.height * escala });
  }
  let tituloY = 765;
  for (const linea of titulo) {
    pagina.drawText(linea, { x: 38, y: tituloY, size: 29, font: negrita, color: blanco });
    tituloY -= 33;
  }
  let descripcionY = tituloY + 8;
  for (const linea of descripcion) {
    pagina.drawText(linea, { x: 39, y: descripcionY, size: 10.5, font: normal, color: blanco, opacity: 0.9 });
    descripcionY -= 13;
  }
  return inferiorEncabezado - 25;
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
  documento.registerFontkit(fontkit);
  const normal = datos.fuenteRegular
    ? await documento.embedFont(datos.fuenteRegular, { subset: true })
    : await documento.embedFont(StandardFonts.Helvetica);
  const negrita = datos.fuenteSemibold
    ? await documento.embedFont(datos.fuenteSemibold, { subset: true })
    : await documento.embedFont(StandardFonts.HelveticaBold);
  const logo = await incrustarFoto(documento, datos.logo);

  function nuevaPagina() {
    const pagina = documento.addPage([595, 842]);
    const yInicial = dibujarEncabezado(pagina, logo, datos, normal, negrita);
    return { pagina, yInicial };
  }

  let nueva = nuevaPagina();
  let pagina = nueva.pagina;
  let y = nueva.yInicial;

  if (datos.dias.length === 0) {
    cajaRedondeada(pagina, 100, 380, 395, 112, 32, blanco);
    pagina.drawCircle({ x: 150, y: 436, size: 34, color: verde, opacity: 0.22 });
    pagina.drawText("Agenda en preparación", { x: 195, y: 447, size: 19, font: negrita, color: azulProfundo });
    pagina.drawText("Pronto encontrarás aquí todos los momentos del encuentro.", { x: 195, y: 420, size: 10.5, font: normal, color: gris });
  }

  for (const dia of datos.dias) {
    const fotosDia = await prepararFotos(documento, dia.fotos);
    if (y < (dia.momentos.length ? 220 : 132)) {
      nueva = nuevaPagina();
      pagina = nueva.pagina;
      y = nueva.yInicial;
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
      const altoContenido = 14 + Math.max(0, titulo.length - 1) * 17
        + (descripcion.length ? 20 + Math.max(0, descripcion.length - 1) * 13 : 0);
      const alto = Math.max(fotoExpositor ? 72 : 52, altoContenido + 26);
      if (y - alto < 54) {
        nueva = nuevaPagina();
        pagina = nueva.pagina;
        y = dibujarTituloDia(pagina, nueva.yInicial, dia.nombre, formatearFecha(dia.fecha), fotosDia, normal, negrita, true);
      }
      const inferior = y - alto;
      const centroTarjetaY = inferior + (alto - 4) / 2;
      cajaRedondeada(pagina, 135, inferior - 3, 422, alto - 4, 22, momento.destacado ? teal : azulProfundo, 0.08);
      cajaRedondeada(pagina, 131, inferior, 426, alto - 4, 22, momento.destacado ? verdeSuave : blanco);
      pagina.drawLine({ start: { x: 116, y: y + 2 }, end: { x: 116, y: inferior - 12 }, thickness: 2, color: teal, opacity: 0.25 });
      pagina.drawText(formatearHora(momento.horaInicio), { x: 38, y: centroTarjetaY + 5, size: 9.5, font: negrita, color: azulProfundo });
      pagina.drawText(formatearHora(momento.horaFin), { x: 38, y: centroTarjetaY - 11, size: 8.2, font: normal, color: gris });
      pagina.drawCircle({ x: 116, y: centroTarjetaY, size: 6, color: verde, borderColor: blanco, borderWidth: 2 });
      if (fotoExpositor) dibujarFotoCircular(pagina, fotoExpositor, 166, centroTarjetaY, 27, verde);
      let textoY = centroTarjetaY + altoContenido / 2 - 14;
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

  if (datos.dias.length > 0) {
    if (y < 142) {
      nueva = nuevaPagina();
      pagina = nueva.pagina;
      y = nueva.yInicial;
    }
    const inferior = y - 86;
    cajaRedondeada(pagina, 42, inferior - 4, 511, 76, 30, azulProfundo, 0.1);
    cajaRedondeada(pagina, 38, inferior, 519, 76, 30, teal);
    pagina.drawCircle({ x: 79, y: inferior + 38, size: 23, color: verde, opacity: 0.95 });
    pagina.drawCircle({ x: 79, y: inferior + 46, size: 6, color: blanco });
    pagina.drawEllipse({ x: 79, y: inferior + 28, xScale: 13, yScale: 10, color: blanco });
    const directiva = lineas(DIRECTIVA_EXPERIENCIA, negrita, 13, 414).slice(0, 2);
    let directivaY = inferior + (directiva.length > 1 ? 42 : 33);
    for (const linea of directiva) {
      const x = 116 + (414 - negrita.widthOfTextAtSize(seguro(linea), 13)) / 2;
      pagina.drawText(seguro(linea), { x, y: directivaY, size: 13, font: negrita, color: blanco });
      directivaY -= 17;
    }
  }

  const paginas = documento.getPages();
  paginas.forEach((paginaActual, indice) => {
    paginaActual.drawLine({ start: { x: 38, y: 42 }, end: { x: 557, y: 42 }, thickness: 1, color: teal, opacity: 0.2 });
    const pie = datos.organizadores ? `Organizan: ${seguro(datos.organizadores)}` : "";
    const lineasPie = lineas(pie, normal, 7.5, 445).slice(0, 2);
    let pieY = lineasPie.length > 1 ? 29 : 24;
    for (const linea of lineasPie) {
      paginaActual.drawText(linea, { x: 38, y: pieY, size: 7.5, font: normal, color: teal });
      pieY -= 10;
    }
    const numero = `${indice + 1} / ${paginas.length}`;
    paginaActual.drawText(numero, { x: 528, y: 24, size: 8.5, font: negrita, color: azulProfundo });
  });
  return documento.save();
}
