ALTER TABLE "ConfiguracionEvento"
ADD COLUMN "maxRecuerdosPorParticipante" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "eliminarEvidenciasRechazadas" BOOLEAN NOT NULL DEFAULT true;
