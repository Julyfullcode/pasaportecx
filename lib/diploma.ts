import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { DIRECTIVA_EXPERIENCIA } from "@/lib/mensajes";

type DatosDiploma = {
  nombre: string;
  empresa: string;
  equipo: string;
  evento: string;
  organizadores: string;
  fecha: Date;
  logo?: Uint8Array;
};

function textoCentrado(pagina: PDFPage, texto: string, y: number, tamano: number, fuente: PDFFont, color = rgb(0.043, 0.231, 0.376)) {
  const ancho = fuente.widthOfTextAtSize(texto, tamano);
  pagina.drawText(texto, { x: (pagina.getWidth() - ancho) / 2, y, size: tamano, font: fuente, color });
}

function tamanoQueCabe(texto: string, fuente: PDFFont, maximo: number, ancho: number) {
  let tamano = maximo;
  while (tamano > 15 && fuente.widthOfTextAtSize(texto, tamano) > ancho) tamano -= 1;
  return tamano;
}

function textoAjustado(texto: string, fuente: PDFFont, tamano: number, anchoMaximo: number, maximoLineas = 2) {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  const resultado: string[] = [];
  let actual = "";
  let truncado = false;
  for (const palabra of palabras) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (fuente.widthOfTextAtSize(candidata, tamano) <= anchoMaximo) {
      actual = candidata;
    } else {
      if (actual) {
        resultado.push(actual);
        if (resultado.length === maximoLineas) {
          truncado = true;
          break;
        }
      }
      actual = palabra;
    }
  }
  if (!truncado && actual && resultado.length < maximoLineas) resultado.push(actual);
  if (truncado && resultado.length) {
    let ultima = resultado.at(-1) ?? "";
    while (ultima && fuente.widthOfTextAtSize(`${ultima}…`, tamano) > anchoMaximo) ultima = ultima.slice(0, -1);
    resultado[resultado.length - 1] = `${ultima.trim()}…`;
  }
  return resultado;
}

function parrafoCentrado(pagina: PDFPage, texto: string, y: number, tamano: number, fuente: PDFFont, ancho: number, interlineado: number, color: RGB, maximoLineas = 2) {
  textoAjustado(texto, fuente, tamano, ancho, maximoLineas)
    .forEach((renglon, indice) => textoCentrado(pagina, renglon, y - indice * interlineado, tamano, fuente, color));
}

export async function generarDiplomaPdf(datos: DatosDiploma) {
  const documento = await PDFDocument.create();
  documento.setTitle(`Diploma de participación - ${datos.nombre}`);
  documento.setSubject(datos.evento);
  documento.setAuthor(datos.organizadores || "Grupo EPM");

  // Tamaño carta horizontal: 11 × 8,5 pulgadas a 72 puntos por pulgada.
  const anchoPagina = 792;
  const altoPagina = 612;
  const pagina = documento.addPage([anchoPagina, altoPagina]);
  const normal = await documento.embedFont(StandardFonts.Helvetica);
  const negrita = await documento.embedFont(StandardFonts.HelveticaBold);
  const azul = rgb(0.043, 0.231, 0.376);
  const teal = rgb(0.055, 0.486, 0.431);
  const verde = rgb(0.463, 0.741, 0.118);
  const gris = rgb(0.34, 0.39, 0.43);
  const blanco = rgb(1, 1, 1);

  pagina.drawRectangle({ x: 0, y: 0, width: anchoPagina, height: altoPagina, color: rgb(0.985, 0.995, 0.99) });
  pagina.drawRectangle({ x: 0, y: 536, width: anchoPagina, height: 76, color: azul });
  pagina.drawRectangle({ x: 420, y: 536, width: 372, height: 76, color: teal, opacity: 0.82 });
  pagina.drawRectangle({ x: 0, y: 0, width: anchoPagina, height: 50, color: teal });
  pagina.drawRectangle({ x: 16, y: 16, width: anchoPagina - 32, height: altoPagina - 32, borderColor: verde, borderWidth: 2 });
  pagina.drawRectangle({ x: 22, y: 22, width: anchoPagina - 44, height: altoPagina - 44, borderColor: teal, borderWidth: 0.55, opacity: 0.35 });
  pagina.drawCircle({ x: 744, y: 565, size: 86, color: verde, opacity: 0.2 });
  pagina.drawCircle({ x: 59, y: 61, size: 76, color: verde, opacity: 0.14 });
  pagina.drawCircle({ x: 734, y: 68, size: 54, color: azul, opacity: 0.12 });

  if (datos.logo) {
    try {
      const logo = await documento.embedPng(datos.logo);
      const escala = Math.min(164 / logo.width, 43 / logo.height);
      pagina.drawImage(logo, { x: 42, y: 553, width: logo.width * escala, height: logo.height * escala });
    } catch {
      pagina.drawText("Grupo EPM", { x: 43, y: 562, size: 18, font: negrita, color: blanco });
    }
  } else {
    pagina.drawText("Grupo EPM", { x: 43, y: 562, size: 18, font: negrita, color: blanco });
  }

  textoCentrado(pagina, "Diploma de participación", 489, 26, negrita, teal);
  pagina.drawRectangle({ x: 302, y: 475, width: 188, height: 4, color: verde });
  textoCentrado(pagina, "Grupo EPM reconoce a", 446, 14, normal, gris);
  textoCentrado(pagina, datos.nombre, 397, tamanoQueCabe(datos.nombre, negrita, 38, 680), negrita, azul);
  textoCentrado(pagina, "por su participación activa y entusiasta en", 366, 14, normal, gris);
  textoCentrado(pagina, datos.evento, 327, tamanoQueCabe(datos.evento, negrita, 25, 670), negrita, teal);
  parrafoCentrado(
    pagina,
    "Un espacio para conectarnos, compartir aprendizajes y construir experiencias que dejan huella.",
    291,
    13,
    normal,
    650,
    18,
    gris,
  );
  textoCentrado(pagina, "Juntos logramos experiencias más simples y confiables.", 239, 15, negrita, azul);
  textoCentrado(pagina, "Encontrarnos nos inspira para avanzar juntos.", 215, 15, negrita, teal);
  textoCentrado(pagina, DIRECTIVA_EXPERIENCIA, 181, tamanoQueCabe(DIRECTIVA_EXPERIENCIA, negrita, 12.5, 650), negrita, gris);
  textoCentrado(pagina, `${datos.empresa}  ·  ${datos.equipo}`, 153, 13, negrita, azul);

  const fecha = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" }).format(datos.fecha);
  pagina.drawLine({ start: { x: 304, y: 127 }, end: { x: 488, y: 127 }, thickness: 1, color: rgb(0.72, 0.78, 0.8) });
  textoCentrado(pagina, fecha, 106, 11, normal, gris);
  textoCentrado(pagina, "Un recuerdo de tu participación en el Encuentro de Experiencia", 76, 11, negrita, azul);

  const organizadores = datos.organizadores.trim() || "Grupo EPM";
  textoAjustado(`Organizan: ${organizadores}`, normal, 9, 690, 2)
    .forEach((renglon, indice) => textoCentrado(pagina, renglon, 28 - indice * 11, 9, normal, blanco));

  return documento.save();
}
