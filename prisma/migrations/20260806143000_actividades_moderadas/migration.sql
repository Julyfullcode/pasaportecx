CREATE TABLE "Actividad" (
  "id" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "invitacion" TEXT NOT NULL,
  "cierre" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
  "pasoActual" INTEGER NOT NULL DEFAULT 0,
  "puntosHabilitados" BOOLEAN NOT NULL DEFAULT false,
  "puntos" INTEGER NOT NULL DEFAULT 0,
  "configuracion" JSONB NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Actividad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RespuestaActividad" (
  "id" TEXT NOT NULL,
  "actividadId" TEXT NOT NULL,
  "participanteId" TEXT NOT NULL,
  "preguntaId" TEXT NOT NULL,
  "respuesta" JSONB NOT NULL,
  "respondidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RespuestaActividad_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RespuestaActividad_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "Actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RespuestaActividad_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ParticipacionActividad" (
  "id" TEXT NOT NULL,
  "actividadId" TEXT NOT NULL,
  "participanteId" TEXT NOT NULL,
  "puntosOtorgados" INTEGER NOT NULL DEFAULT 0,
  "completadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParticipacionActividad_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ParticipacionActividad_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "Actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ParticipacionActividad_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Actividad_estado_creadoEn_idx" ON "Actividad"("estado", "creadoEn");
CREATE UNIQUE INDEX "RespuestaActividad_actividadId_participanteId_preguntaId_key" ON "RespuestaActividad"("actividadId", "participanteId", "preguntaId");
CREATE INDEX "RespuestaActividad_actividadId_preguntaId_idx" ON "RespuestaActividad"("actividadId", "preguntaId");
CREATE INDEX "RespuestaActividad_participanteId_idx" ON "RespuestaActividad"("participanteId");
CREATE UNIQUE INDEX "ParticipacionActividad_actividadId_participanteId_key" ON "ParticipacionActividad"("actividadId", "participanteId");
CREATE INDEX "ParticipacionActividad_participanteId_idx" ON "ParticipacionActividad"("participanteId");
