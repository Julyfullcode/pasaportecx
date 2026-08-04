ALTER TABLE "Desafio"
ADD COLUMN "duracionMinutos" INTEGER DEFAULT 60,
ADD COLUMN "publicadoEn" TIMESTAMP;

UPDATE "Desafio"
SET "duracionMinutos" = NULL
WHERE "disponibleHasta" IS NOT NULL;

UPDATE "Desafio"
SET "publicadoEn" = CURRENT_TIMESTAMP
WHERE "estado" = 'PUBLICADO'
  AND "duracionMinutos" IS NOT NULL
  AND "publicadoEn" IS NULL;
