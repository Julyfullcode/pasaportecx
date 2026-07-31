import { PrismaClient } from "@prisma/client";
import {
  CODIGO_DESAFIO_CIERRE,
  FORMATO_COSECHA,
  PREGUNTAS_COSECHA,
  TITULO_DESAFIO_CIERRE,
} from "../lib/cosecha-config";

const prisma = new PrismaClient();

async function main() {
  const existente = await prisma.desafio.findFirst({
    where: {
      OR: [
        { codigoQr: CODIGO_DESAFIO_CIERRE },
        { titulo: TITULO_DESAFIO_CIERRE },
      ],
    },
  });
  if (existente) {
    const actualizado = await prisma.desafio.update({
      where: { id: existente.id },
      data: {
        codigoQr: CODIGO_DESAFIO_CIERRE,
        titulo: TITULO_DESAFIO_CIERRE,
        descripcion: "Recoge lo vivido en el encuentro: un aprendizaje, un agradecimiento y una acción para impulsar al regresar.",
        tipo: "ENCUESTA",
        configuracion: { formato: FORMATO_COSECHA, preguntas: PREGUNTAS_COSECHA },
      },
    });
    console.log(JSON.stringify({ accion: "actualizado", id: actualizado.id, estado: actualizado.estado }));
    return;
  }

  const componente = await prisma.componente.findFirst({
    where: { activo: true },
    orderBy: { orden: "asc" },
  });
  const ubicacion = componente
    ? null
    : await prisma.ubicacion.findFirst({ where: { activa: true }, orderBy: { orden: "asc" } });
  const creado = await prisma.desafio.create({
    data: {
      codigoQr: CODIGO_DESAFIO_CIERRE,
      titulo: TITULO_DESAFIO_CIERRE,
      descripcion: "Recoge lo vivido en el encuentro: un aprendizaje, un agradecimiento y una acción para impulsar al regresar.",
      tipo: "ENCUESTA",
      puntos: 150,
      dia: componente ? 2 : 1,
      componenteId: componente?.id ?? null,
      ubicacion: ubicacion?.nombre ?? "",
      estado: "BORRADOR",
      esSecreto: false,
      configuracion: { formato: FORMATO_COSECHA, preguntas: PREGUNTAS_COSECHA },
    },
  });
  console.log(JSON.stringify({ accion: "creado", id: creado.id, estado: creado.estado }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
