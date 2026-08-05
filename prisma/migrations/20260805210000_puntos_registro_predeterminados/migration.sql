ALTER TABLE "ConfiguracionEvento"
ALTER COLUMN "puntosPorRegistro" SET DEFAULT 10;

UPDATE "ConfiguracionEvento"
SET "puntosPorRegistro" = 10
WHERE "id" = 'evento' AND "puntosPorRegistro" = 0;
