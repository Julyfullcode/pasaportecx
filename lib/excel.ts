import JSZip from "jszip";

type ValorCelda = string | number | boolean | null | undefined;

function escaparXml(valor: string) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function columna(indice: number) {
  let resultado = "";
  let numero = indice + 1;
  while (numero > 0) {
    numero -= 1;
    resultado = String.fromCharCode(65 + (numero % 26)) + resultado;
    numero = Math.floor(numero / 26);
  }
  return resultado;
}

export async function crearExcel(filas: ValorCelda[][], nombreHoja = "Resultados") {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
  zip.folder("_rels")?.file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.folder("xl")?.file("workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escaparXml(nombreHoja.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.folder("xl")?.folder("_rels")?.file("workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.folder("xl")?.file("styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B3B60"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`);

  const filasXml = filas.map((fila, indiceFila) => {
    const celdas = fila.map((valor, indiceColumna) => {
      const referencia = `${columna(indiceColumna)}${indiceFila + 1}`;
      const estilo = indiceFila === 0 ? ' s="1"' : "";
      if (typeof valor === "number") return `<c r="${referencia}"${estilo}><v>${valor}</v></c>`;
      const texto = typeof valor === "boolean" ? (valor ? "Sí" : "No") : String(valor ?? "");
      return `<c r="${referencia}" t="inlineStr"${estilo}><is><t xml:space="preserve">${escaparXml(texto)}</t></is></c>`;
    }).join("");
    return `<row r="${indiceFila + 1}">${celdas}</row>`;
  }).join("");
  const ancho = Math.max(1, ...filas.map((fila) => fila.length));
  const columnas = Array.from({ length: ancho }, (_, indice) => `<col min="${indice + 1}" max="${indice + 1}" width="${indice < 3 ? 24 : 42}" customWidth="1"/>`).join("");
  zip.folder("xl")?.folder("worksheets")?.file("sheet1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${columnas}</cols><sheetData>${filasXml}</sheetData><autoFilter ref="A1:${columna(ancho - 1)}${Math.max(1, filas.length)}"/></worksheet>`);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
