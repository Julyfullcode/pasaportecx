ALTER TABLE "Participante" DROP CONSTRAINT IF EXISTS "Participante_grupoId_fkey";
DROP INDEX IF EXISTS "Participante_grupoId_idx";
ALTER TABLE "Participante" DROP COLUMN IF EXISTS "grupoId";

DROP TABLE IF EXISTS "Grupo";

ALTER TABLE "ConfiguracionEvento" DROP COLUMN IF EXISTS "tamanoPodioEquipos";
ALTER TABLE "ConfiguracionEvento" DROP COLUMN IF EXISTS "metodoPuntajeEquipo";
ALTER TABLE "ConfiguracionEvento" DROP COLUMN IF EXISTS "asignacionAutomatica";
UPDATE "ConfiguracionEvento"
SET "cicloMixto" = trim(both ',' from replace(regexp_replace("cicloMixto", '(^|,)equipos:[0-9]+', '', 'g'), ',,', ','))
WHERE "cicloMixto" LIKE '%equipos:%';

DROP TYPE IF EXISTS "MetodoPuntajeEquipo";
