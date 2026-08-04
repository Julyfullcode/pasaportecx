ALTER TABLE "ConfiguracionEvento"
ADD COLUMN "puntosPorRegistro" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Participante"
ADD COLUMN "puntosRegistro" INTEGER NOT NULL DEFAULT 0;
