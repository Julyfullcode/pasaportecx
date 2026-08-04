import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const grupos = [
  ["grupo-e2e-1", "Equipo Aurora", "#006CB7"],
  ["grupo-e2e-2", "Equipo Bosque", "#009B77"],
  ["grupo-e2e-3", "Equipo Río", "#6F42C1"],
  ["grupo-e2e-4", "Equipo Sol", "#E67E22"],
  ["grupo-e2e-5", "Equipo Nube", "#607D8B"],
  ["grupo-e2e-6", "Equipo Tierra", "#795548"],
] as const;

async function sembrar() {
  await db.configuracionEvento.create({
    data: {
      id: "evento",
      nombreEvento: "Pasaporte CX E2E",
      tamanoPodioIndividual: 5,
      tamanoPodioEquipos: 3,
      metodoPuntajeEquipo: "SUMA",
      puntosPorRegistro: 25,
      modoAsistentes: "CARRUSEL",
      intervaloAsistentesSegundos: 1,
      maxRecuerdosPorParticipante: 10,
    },
  });
  await db.empresa.create({
    data: { id: "empresa-e2e", nombre: "Empresa E2E", orden: 1, activa: true },
  });
  await db.componente.create({
    data: { id: "componente-e2e", nombre: "Componente E2E", orden: 1, colorHex: "#006CB7" },
  });
  await db.ubicacion.create({
    data: { id: "ubicacion-e2e", nombre: "Registro E2E", orden: 1, activa: true },
  });
  await db.grupo.createMany({
    data: grupos.map(([id, nombre, colorHex], indice) => ({ id, nombre, colorHex, orden: indice + 1 })),
  });
  await db.admin.create({
    data: {
      id: "admin-e2e",
      usuario: "e2e-admin",
      passwordHash: await bcrypt.hash("E2E-Segura-123!", 10),
    },
  });
  await db.desafio.createMany({
    data: [
      { id: "desafio-e2e-100", codigoQr: "reto-e2e-100", titulo: "Reto E2E de 100 puntos", descripcion: "Reto determinista para pruebas.", tipo: "CHECK_IN", puntos: 100, dia: 1, ubicacion: "Registro E2E", estado: "PUBLICADO", configuracion: {} },
      { id: "desafio-e2e-idempotente", codigoQr: "reto-concurrencia-idempotente", titulo: "Reto concurrente idempotente", descripcion: "Valida que un reto no sume dos veces.", tipo: "CHECK_IN", puntos: 100, dia: 1, ubicacion: "Registro E2E", estado: "PUBLICADO", configuracion: {} },
      { id: "desafio-e2e-carga", codigoQr: "reto-carga-50", titulo: "Reto para carga concurrente", descripcion: "Reto usado por usuarios virtuales.", tipo: "CHECK_IN", puntos: 100, dia: 1, ubicacion: "Registro E2E", estado: "PUBLICADO", configuracion: {} },
    ],
  });

  await db.participante.createMany({
    data: Array.from({ length: 5 }, (_, indice) => ({
      id: `podio-${indice + 1}`,
      nombre: `Podio ${indice + 1}`,
      empresaId: "empresa-e2e",
      grupoId: grupos[indice][0],
      urlFoto: "/marca/logo-grupo-epm-oficial.png",
      codigoRecuperacion: `PODIO${indice + 1}`,
      puntosRegistro: 5_000 - indice * 100,
      puntosTotales: 5_000 - indice * 100,
      creadoEn: new Date(Date.UTC(2026, 0, 1, 0, indice)),
    })),
  });
  await db.participante.createMany({
    data: Array.from({ length: 55 }, (_, indice) => ({
      id: `carrusel-${indice + 1}`,
      nombre: `Carrusel ${String(indice + 1).padStart(2, "0")}`,
      empresaId: "empresa-e2e",
      grupoId: grupos[indice % grupos.length][0],
      urlFoto: "/marca/logo-grupo-epm-oficial.png",
      codigoRecuperacion: `CAR${String(indice + 1).padStart(3, "0")}`,
      creadoEn: new Date(Date.UTC(2026, 0, 2, 0, indice)),
    })),
  });
}

sembrar()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
