ALTER TABLE "Participante"
ADD COLUMN "esStaff" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Participante_activo_esStaff_puntosTotales_idx"
ON "Participante"("activo", "esStaff", "puntosTotales");
