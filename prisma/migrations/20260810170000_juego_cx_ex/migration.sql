CREATE TABLE "ResultadoJuegoActividad" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actividadId" TEXT NOT NULL,
  "equipoId" TEXT NOT NULL,
  "participanteId" TEXT NOT NULL,
  "nombreEquipo" TEXT,
  "puntaje" INTEGER NOT NULL,
  "segundos" INTEGER NOT NULL,
  "desglose" JSONB NOT NULL,
  "reflexion" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResultadoJuegoActividad_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "Actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ResultadoJuegoActividad_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ResultadoJuegoActividad_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ResultadoJuegoActividad_actividadId_equipoId_key" ON "ResultadoJuegoActividad"("actividadId", "equipoId");
CREATE INDEX "ResultadoJuegoActividad_actividadId_puntaje_segundos_idx" ON "ResultadoJuegoActividad"("actividadId", "puntaje", "segundos");
CREATE INDEX "ResultadoJuegoActividad_participanteId_idx" ON "ResultadoJuegoActividad"("participanteId");
