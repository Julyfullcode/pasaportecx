ALTER TABLE "ConfiguracionEvento"
ADD COLUMN "rotacionAutomaticaProyeccion" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "revisionPuntosRecuerdo" INTEGER NOT NULL DEFAULT 0;

DELETE FROM "ReaccionRecuerdo" antigua
USING "ReaccionRecuerdo" nueva
WHERE antigua."recuerdoId" = nueva."recuerdoId"
  AND antigua."participanteId" = nueva."participanteId"
  AND antigua."id" <> nueva."id"
  AND (antigua."creadoEn" < nueva."creadoEn"
    OR (antigua."creadoEn" = nueva."creadoEn" AND antigua."id" < nueva."id"));

CREATE UNIQUE INDEX "ReaccionRecuerdo_recuerdoId_participanteId_key"
ON "ReaccionRecuerdo"("recuerdoId", "participanteId");
