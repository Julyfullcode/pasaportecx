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
    const esRanking = tipo === "ranking-individual";
    const datos = await db.participante.findMany({
      where: esRanking ? { activo: true, esStaff: false } : undefined,
      orderBy: { puntosTotales: "desc" },
      include: { empresa: true, correoAutorizado: true },
    });
    filas = [
      ["Posición", "Nombre", "Correo", "Empresa", "Puntos", "Staff", "Activo", "Registrado"],
      ...datos.map((p, i) => [i + 1, p.nombre, p.correoAutorizado?.correo, p.empresa.nombre, p.puntosTotales, p.esStaff ? "Sí" : "No", p.activo ? "Sí" : "No", p.creadoEn.toISOString()]),
    ];
  } else if (tipo === "completitudes") {
    const datos = await db.completitud.findMany({ include: { participante: true, desafio: true }, orderBy: { completadoEn: "asc" } });
    filas = [["Participante", "Staff", "Desafío", "Tipo", "Día", "Estado", "Puntos", "Fecha"], ...datos.map((c) => [c.participante.nombre, c.participante.esStaff ? "Sí" : "No", c.desafio.titulo, esConfiguracionPuntualidad(c.desafio.configuracion) ? "PUNTUALIDAD" : c.desafio.tipo, etiquetaDiaDesafio(c.desafio.dia), c.estado, c.puntosOtorgados, c.completadoEn.toISOString()])];
  } else if (tipo === "encuestas") {
    const datos = await db.completitud.findMany({ where: { desafio: { tipo: "ENCUESTA" } }, include: { participante: true, desafio: true } });
    filas = [["Participante", "Staff", "Encuesta", "Respuesta", "Fecha"], ...datos.map((c) => [c.participante.nombre, c.participante.esStaff ? "Sí" : "No", c.desafio.titulo, JSON.stringify(c.respuesta), c.completadoEn.toISOString()])];
  } else if (tipo === "empresas") {
    const datos = await db.empresa.findMany({ include: { participantes: true }, orderBy: { orden: "asc" } });
    filas = [["Empresa", "Participantes", "Puntos totales"], ...datos.map((e) => [e.nombre, e.participantes.length, e.participantes.reduce((s, p) => s + p.puntosTotales, 0)])];
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
