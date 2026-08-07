ALTER TABLE "Actividad"
  ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'GUIADA',
  ADD COLUMN "codigoAcceso" TEXT,
  ADD COLUMN "anonima" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requiereEmpresa" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "RespuestaActividad" ADD COLUMN "empresaEvaluadaId" TEXT;

CREATE UNIQUE INDEX "Actividad_codigoAcceso_key" ON "Actividad"("codigoAcceso");
CREATE INDEX "RespuestaActividad_empresaEvaluadaId_idx" ON "RespuestaActividad"("empresaEvaluadaId");
