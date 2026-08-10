ALTER TABLE "Desafio" ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Desafio_dia_orden_idx" ON "Desafio"("dia", "orden");
