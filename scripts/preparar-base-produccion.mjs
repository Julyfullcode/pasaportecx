import { PrismaClient } from "@prisma/client";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url || !url.startsWith("postgres")) {
  throw new Error("La migración de producción requiere una conexión PostgreSQL.");
}

const db = new PrismaClient({ datasources: { db: { url } } });
try {
  await db.$executeRawUnsafe(
    'ALTER TABLE "Participante" '
    + 'ADD COLUMN IF NOT EXISTS "esStaff" BOOLEAN NOT NULL DEFAULT false',
  );
  await db.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "Participante_activo_esStaff_puntosTotales_idx" '
    + 'ON "Participante"("activo", "esStaff", "puntosTotales")',
  );
  await db.$executeRawUnsafe(
    'ALTER TABLE "ConfiguracionEvento" '
    + 'ADD COLUMN IF NOT EXISTS "puntosFotoMasReaccionada" INTEGER NOT NULL DEFAULT 0, '
    + 'ADD COLUMN IF NOT EXISTS "revisionPremioReacciones" INTEGER NOT NULL DEFAULT 0',
  );
  await db.$executeRawUnsafe(
    'ALTER TABLE "ConfiguracionEvento" '
    + 'ALTER COLUMN "puntosPorRegistro" SET DEFAULT 10',
  );
  await db.$executeRawUnsafe(
    'ALTER TABLE "ConfiguracionEvento" '
    + 'ALTER COLUMN "puntosPorRecuerdo" SET DEFAULT 10, '
    + 'ALTER COLUMN "maxRecuerdosConPuntos" SET DEFAULT 1, '
    + 'ADD COLUMN IF NOT EXISTS "rotacionAutomaticaProyeccion" BOOLEAN NOT NULL DEFAULT true, '
    + 'ADD COLUMN IF NOT EXISTS "revisionPuntosRecuerdo" INTEGER NOT NULL DEFAULT 0',
  );
  await db.$executeRawUnsafe(
    'UPDATE "ConfiguracionEvento" SET '
    + '"nombreEvento" = replace("nombreEvento", \'Pasaporte CX\', \'Pasaporte\'), '
    + '"cicloMixto" = trim(both \',\' from replace(regexp_replace("cicloMixto", \'(^|,)cierre:[0-9]+\', \'\', \'g\'), \',,\', \',\')) '
    + 'WHERE "id" = \'evento\'',
  );
  const configuracionesActualizadas = await db.$executeRawUnsafe(
    'UPDATE "ConfiguracionEvento" SET '
    + '"puntosPorRecuerdo" = CASE WHEN "puntosPorRecuerdo" = 0 AND "maxRecuerdosConPuntos" = 0 THEN 10 ELSE "puntosPorRecuerdo" END, '
    + '"maxRecuerdosConPuntos" = CASE WHEN "puntosPorRecuerdo" = 0 AND "maxRecuerdosConPuntos" = 0 THEN 1 ELSE "maxRecuerdosConPuntos" END, '
    + '"revisionPuntosRecuerdo" = 1 '
    + 'WHERE "id" = \'evento\' AND "revisionPuntosRecuerdo" = 0',
  );
  await db.$executeRawUnsafe(
    'UPDATE "ConfiguracionEvento" SET "puntosPorRegistro" = 10 '
    + 'WHERE "id" = \'evento\' AND "puntosPorRegistro" = 0',
  );
  await db.$executeRawUnsafe(
    'ALTER TABLE "Desafio" '
    + 'ADD COLUMN IF NOT EXISTS "duracionMinutos" INTEGER DEFAULT 60, '
    + 'ADD COLUMN IF NOT EXISTS "publicadoEn" TIMESTAMP',
  );
  await db.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS "CorreoAutorizado" ('
    + '"id" TEXT NOT NULL PRIMARY KEY, '
    + '"correo" TEXT NOT NULL, '
    + '"participanteId" TEXT, '
    + '"creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, '
    + 'CONSTRAINT "CorreoAutorizado_participanteId_fkey" '
    + 'FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") '
    + 'ON DELETE SET NULL ON UPDATE CASCADE)'
  );
  await db.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "CorreoAutorizado_correo_key" '
    + 'ON "CorreoAutorizado"("correo")',
  );
  await db.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "CorreoAutorizado_participanteId_key" '
    + 'ON "CorreoAutorizado"("participanteId")',
  );
  await db.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "CorreoAutorizado_creadoEn_idx" '
    + 'ON "CorreoAutorizado"("creadoEn")',
  );
  await db.$executeRawUnsafe(
    'UPDATE "Desafio" SET "duracionMinutos" = NULL '
    + 'WHERE "disponibleHasta" IS NOT NULL',
  );
  await db.$executeRawUnsafe(
    'UPDATE "Desafio" SET "publicadoEn" = CURRENT_TIMESTAMP '
    + "WHERE \"estado\" = 'PUBLICADO' "
    + 'AND "duracionMinutos" IS NOT NULL AND "publicadoEn" IS NULL',
  );
  await db.$executeRawUnsafe(
    'DELETE FROM "ReaccionRecuerdo" antigua USING "ReaccionRecuerdo" nueva '
    + 'WHERE antigua."recuerdoId" = nueva."recuerdoId" '
    + 'AND antigua."participanteId" = nueva."participanteId" '
    + 'AND antigua."id" <> nueva."id" '
    + 'AND (antigua."creadoEn" < nueva."creadoEn" '
    + 'OR (antigua."creadoEn" = nueva."creadoEn" AND antigua."id" < nueva."id"))',
  );
  await db.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "ReaccionRecuerdo_recuerdoId_participanteId_key" '
    + 'ON "ReaccionRecuerdo"("recuerdoId", "participanteId")',
  );
  if (configuracionesActualizadas > 0) {
    const configuracion = await db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } });
    const admin = await db.admin.findFirst();
    if (admin && configuracion.puntosPorRecuerdo > 0 && configuracion.maxRecuerdosConPuntos > 0) {
      const participantes = await db.participante.findMany({
        where: { esStaff: false, recuerdos: { some: { visible: true, pendiente: false, reportado: false } } },
        select: { id: true, puntosRegistro: true, recuerdos: { where: { visible: true, pendiente: false, reportado: false }, orderBy: { creadoEn: "asc" } } },
      });
      for (const participante of participantes) {
        const candidatos = participante.recuerdos
          .filter((recuerdo) => !recuerdo.claveIdempotencia?.startsWith("evidencia:"))
          .slice(0, configuracion.maxRecuerdosConPuntos);
        for (const recuerdo of candidatos) {
          const motivo = `Recuerdo #${recuerdo.id}`;
          const existe = await db.ajustePuntos.findFirst({ where: { participanteId: participante.id, motivo } });
          if (!existe) await db.ajustePuntos.create({ data: { participanteId: participante.id, puntos: configuracion.puntosPorRecuerdo, motivo, adminId: admin.id } });
        }
        const [completitudes, ajustes] = await Promise.all([
          db.completitud.aggregate({ where: { participanteId: participante.id, estado: "APROBADO" }, _sum: { puntosOtorgados: true } }),
          db.ajustePuntos.aggregate({ where: { participanteId: participante.id }, _sum: { puntos: true } }),
        ]);
        await db.participante.update({ where: { id: participante.id }, data: { puntosTotales: participante.puntosRegistro + (completitudes._sum.puntosOtorgados ?? 0) + (ajustes._sum.puntos ?? 0) } });
      }
    }
  }
  console.log("Base de producción preparada.");
} finally {
  await db.$disconnect();
}
