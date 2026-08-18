import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  PDFName,
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
import { PREGUNTAS_COSECHA, TITULO_DESAFIO_CIERRE, type RespuestasCosecha } from "@/lib/cosecha-config";

type DatosTarjetaCosecha = {
  nombre: string;
  empresa: string;
  evento: string;
  respuestas: RespuestasCosecha;
  logo?: Uint8Array;
  foto?: Uint8Array;
  fuenteRegular?: Uint8Array;
  fuenteSemibold?: Uint8Array;
};

const anchoPagina = 595;
const altoPagina = 420;

function lineas(texto: string, fuente: PDFFont, tamano: number, anchoMaximo: number) {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
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
  return resultado;
}

function textoAjustado(texto: string, fuente: PDFFont, ancho: number, maximoLineas: number) {
  let tamano = 9.5;
  let renglones = lineas(texto, fuente, tamano, ancho);
  while (tamano > 6.5 && renglones.length > maximoLineas) {
    tamano -= 0.5;
    renglones = lineas(texto, fuente, tamano, ancho);
  }
  if (renglones.length > maximoLineas) {
    renglones = renglones.slice(0, maximoLineas);
    let ultima = renglones[maximoLineas - 1];
    while (ultima && fuente.widthOfTextAtSize(`${ultima}…`, tamano) > ancho) ultima = ultima.slice(0, -1);
    renglones[maximoLineas - 1] = `${ultima.trim()}…`;
  }
  return { tamano, renglones };
}

function tamanoQueCabe(texto: string, fuente: PDFFont, maximo: number, ancho: number, minimo = 8) {
  let tamano = maximo;
  while (tamano > minimo && fuente.widthOfTextAtSize(texto, tamano) > ancho) tamano -= 0.5;
  return tamano;
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

function degradado(
  pagina: PDFPage,
  x: number,
  y: number,
  ancho: number,
  alto: number,
  inicio: [number, number, number],
  fin: [number, number, number],
  radio: number,
) {
  const pasos = 48;
  recortarCajaRedondeada(pagina, x, y, ancho, alto, radio);
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

function fotoCircular(pagina: PDFPage, foto: PDFImage, centroX: number, centroY: number, radio: number) {
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
  pagina.drawCircle({ x: centroX, y: centroY, size: radio, borderColor: rgb(1, 1, 1), borderWidth: 3 });
}

export async function generarTarjetaCosechaPdf(datos: DatosTarjetaCosecha) {
  const documento = await PDFDocument.create();
  documento.registerFontkit(fontkit);
  documento.setTitle(`Mi tarjeta de cierre - ${datos.nombre}`);
  documento.setSubject(TITULO_DESAFIO_CIERRE);

  const pagina = documento.addPage([anchoPagina, altoPagina]);
  const normal = datos.fuenteRegular
    ? await documento.embedFont(datos.fuenteRegular, { subset: true })
    : await documento.embedFont(StandardFonts.Helvetica);
  const semibold = datos.fuenteSemibold
    ? await documento.embedFont(datos.fuenteSemibold, { subset: true })
    : await documento.embedFont(StandardFonts.HelveticaBold);
  const azul = rgb(0.043, 0.153, 0.255);
  const azulProfundo = rgb(0.043, 0.231, 0.376);
  const teal = rgb(0.055, 0.486, 0.431);
  const verde = rgb(0.463, 0.741, 0.118);
  const gris = rgb(0.31, 0.37, 0.42);
  const blanco = rgb(1, 1, 1);

  pagina.drawRectangle({ x: 0, y: 0, width: anchoPagina, height: altoPagina, color: rgb(0.94, 0.973, 0.979) });
  pagina.drawCircle({ x: 580, y: 405, size: 88, color: verde, opacity: 0.15 });
  pagina.drawCircle({ x: 8, y: 15, size: 62, color: teal, opacity: 0.09 });
  cajaRedondeada(pagina, 12, 12, 571, 396, 28, blanco);
  degradado(pagina, 24, 330, 547, 66, [0.043, 0.153, 0.255], [0.055, 0.486, 0.431], 22);
  pagina.drawCircle({ x: 548, y: 387, size: 48, color: verde, opacity: 0.2 });

  if (datos.logo) {
    try {
      const logo = await documento.embedPng(datos.logo);
      const escala = Math.min(95 / logo.width, 24 / logo.height);
      pagina.drawImage(logo, { x: 43, y: 365, width: logo.width * escala, height: logo.height * escala });
    } catch {
      const marca = "Grupo EPM";
      pagina.drawText(marca, { x: 48, y: 370, size: 11, font: normal, color: blanco });
    }
  }

  const titulo = lineas(TITULO_DESAFIO_CIERRE, semibold, 17, 365).slice(0, 2);
  titulo.forEach((renglon, indice) => pagina.drawText(renglon, {
    x: 181 + (365 - semibold.widthOfTextAtSize(renglon, 17)) / 2,
    y: 369 - indice * 19,
    size: 17,
    font: semibold,
    color: blanco,
  }));
  const evento = lineas(datos.evento, normal, 8, 340).slice(0, 1)[0] ?? "";
  pagina.drawText(evento, { x: 181 + (365 - normal.widthOfTextAtSize(evento, 8)) / 2, y: 337, size: 8, font: normal, color: blanco, opacity: 0.82 });

  cajaRedondeada(pagina, 24, 56, 158, 262, 24, rgb(0.975, 0.989, 0.993));
  pagina.drawCircle({ x: 103, y: 258, size: 47, color: azul, opacity: 0.12 });
  pagina.drawCircle({ x: 103, y: 258, size: 43, color: blanco });
  if (datos.foto) {
    try {
      fotoCircular(pagina, await documento.embedPng(datos.foto), 103, 258, 40);
    } catch {
      pagina.drawCircle({ x: 103, y: 258, size: 40, color: rgb(0.9, 0.95, 0.96) });
    }
  }
  const nombre = textoAjustado(datos.nombre, semibold, 130, 3);
  nombre.renglones.forEach((renglon, indice) => pagina.drawText(renglon, {
    x: 103 - semibold.widthOfTextAtSize(renglon, nombre.tamano) / 2,
    y: 194 - indice * (nombre.tamano + 2),
    size: nombre.tamano,
    font: semibold,
    color: azulProfundo,
  }));
  const afiliacion = lineas(datos.empresa, normal, 8.5, 126).slice(0, 3);
  afiliacion.forEach((renglon, indice) => pagina.drawText(renglon, {
    x: 103 - normal.widthOfTextAtSize(renglon, 8.5) / 2,
    y: 139 - indice * 11,
    size: 8.5,
    font: normal,
    color: gris,
  }));
  const cosecha = "Mi cosecha personal";
  pagina.drawText(cosecha, { x: 103 - semibold.widthOfTextAtSize(cosecha, 9) / 2, y: 83, size: 9, font: semibold, color: teal });

  const posiciones = [234, 145, 56];
  const fondos: [number, number, number][][] = [
    [[0.91, 0.97, 0.99], [0.95, 0.985, 0.97]],
    [[0.94, 0.985, 0.95], [0.91, 0.97, 0.99]],
    [[0.95, 0.98, 0.91], [0.91, 0.97, 0.98]],
  ];
  PREGUNTAS_COSECHA.forEach((pregunta, indice) => {
    const y = posiciones[indice];
    degradado(pagina, 194, y, 377, 80, fondos[indice][0] as [number, number, number], fondos[indice][1] as [number, number, number], 22);
    const colorEtiqueta = indice === 0 ? azul : indice === 1 ? teal : rgb(0.31, 0.58, 0.11);
    pagina.drawCircle({ x: 217, y: y + 58, size: 8, color: colorEtiqueta, opacity: 0.95 });
    pagina.drawText(pregunta.titulo, { x: 233, y: y + 53, size: 11, font: semibold, color: azulProfundo });
    const respuesta = textoAjustado(datos.respuestas[pregunta.id], normal, 329, 4);
    respuesta.renglones.forEach((renglon, linea) => pagina.drawText(renglon, {
      x: 215,
      y: y + 35 - linea * (respuesta.tamano + 2),
      size: respuesta.tamano,
      font: normal,
      color: gris,
    }));
  });

  const reflexion = "Lo que cosechamos hoy inspira la experiencia que construiremos mañana.";
  const tamanoReflexion = tamanoQueCabe(reflexion, semibold, 8.5, 480, 7);
  pagina.drawCircle({ x: 45, y: 34, size: 3.5, color: verde });
  pagina.drawCircle({ x: 550, y: 34, size: 3.5, color: teal });
  pagina.drawText(reflexion, {
    x: (anchoPagina - semibold.widthOfTextAtSize(reflexion, tamanoReflexion)) / 2,
    y: 30.5,
    size: tamanoReflexion,
    font: semibold,
    color: teal,
  });

  const preferencias = documento.catalog.getOrCreateViewerPreferences();
  preferencias.setFitWindow(true);
  preferencias.setCenterWindow(true);
  preferencias.setDisplayDocTitle(true);
  documento.catalog.set(PDFName.of("PageLayout"), PDFName.of("SinglePage"));
  documento.catalog.set(PDFName.of("PageMode"), PDFName.of("UseNone"));
  documento.catalog.set(PDFName.of("OpenAction"), documento.context.obj([pagina.ref, PDFName.of("Fit")]));

  return documento.save();
}
