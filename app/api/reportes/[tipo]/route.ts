import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { etiquetaDiaDesafio } from "@/lib/dia-desafio";
import { esConfiguracionPuntualidad } from "@/lib/puntualidad";

function csv(filas: (string | number | null | undefined)[][]) {
  const contenido = filas
    .map((fila) =>
      fila
        .map((valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\r\n");
  return `\uFEFF${contenido}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tipo: string }> },
) {
  await requerirAdmin();
  const { tipo } = await params;
  let filas: (string | number | null | undefined)[][];
  if (tipo === "participantes" || tipo === "ranking-individual") {
    const datos = await db.participante.findMany({
      orderBy: { puntosTotales: "desc" },
      include: { empresa: true, correoAutorizado: true },
    });
    filas = [
      ["Posición", "Nombre", "Correo", "Empresa", "Puntos", "Activo", "Registrado"],
      ...datos.map((p, i) => [i + 1, p.nombre, p.correoAutorizado?.correo, p.empresa.nombre, p.puntosTotales, p.activo ? "Sí" : "No", p.creadoEn.toISOString()]),
    ];
  } else if (tipo === "completitudes") {
    const datos = await db.completitud.findMany({ include: { participante: true, desafio: { include: { componente: true } } }, orderBy: { completadoEn: "asc" } });
    filas = [["Participante", "Desafío", "Tipo", "Día", "Componente", "Estado", "Puntos", "Fecha"], ...datos.map((c) => [c.participante.nombre, c.desafio.titulo, esConfiguracionPuntualidad(c.desafio.configuracion) ? "PUNTUALIDAD" : c.desafio.tipo, etiquetaDiaDesafio(c.desafio.dia), c.desafio.componente?.nombre, c.estado, c.puntosOtorgados, c.completadoEn.toISOString()])];
  } else if (tipo === "encuestas") {
    const datos = await db.completitud.findMany({ where: { desafio: { tipo: "ENCUESTA" } }, include: { participante: true, desafio: true } });
    filas = [["Participante", "Encuesta", "Respuesta", "Fecha"], ...datos.map((c) => [c.participante.nombre, c.desafio.titulo, JSON.stringify(c.respuesta), c.completadoEn.toISOString()])];
  } else if (tipo === "empresas") {
    const datos = await db.empresa.findMany({ include: { participantes: true }, orderBy: { orden: "asc" } });
    filas = [["Empresa", "Participantes", "Puntos totales"], ...datos.map((e) => [e.nombre, e.participantes.length, e.participantes.reduce((s, p) => s + p.puntosTotales, 0)])];
  } else if (tipo === "componentes") {
    const datos = await db.componente.findMany({ include: { desafios: { include: { completitudes: true } } }, orderBy: { orden: "asc" } });
    filas = [["Componente", "Desafíos", "Completitudes"], ...datos.map((c) => [c.nombre, c.desafios.length, c.desafios.reduce((s, d) => s + d.completitudes.length, 0)])];
  } else {
    return Response.json({ error: "Reporte no encontrado" }, { status: 404 });
  }
  return new Response(csv(filas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tipo}-pasaporte-cx.csv"`,
    },
  });
}
