ALTER TABLE "ConfiguracionEvento"
ADD COLUMN "descripcionAgenda" TEXT NOT NULL DEFAULT '',
ADD COLUMN "organizadoresAgenda" TEXT NOT NULL DEFAULT 'Vicepresidencia Experiencia Usuario-Cliente';

ALTER TABLE "DiaAgenda"
ADD COLUMN "fecha" TEXT;

CREATE TABLE "FotoDiaAgenda" (
  "id" TEXT NOT NULL,
  "diaId" TEXT NOT NULL,
  "urlFoto" TEXT NOT NULL,
  "orden" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "FotoDiaAgenda_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FotoDiaAgenda_diaId_fkey" FOREIGN KEY ("diaId") REFERENCES "DiaAgenda"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "FotoDiaAgenda_diaId_orden_idx" ON "FotoDiaAgenda"("diaId", "orden");
