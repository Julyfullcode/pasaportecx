ALTER TABLE "Admin" ADD COLUMN "intentosFallidos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Admin" ADD COLUMN "ultimoIntentoFallido" TIMESTAMP;
ALTER TABLE "Admin" ADD COLUMN "bloqueadoHasta" TIMESTAMP;

CREATE TABLE "LimiteSolicitud" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accion" TEXT NOT NULL,
  "claveHash" TEXT NOT NULL,
  "ventana" TIMESTAMP NOT NULL,
  "cantidad" INTEGER NOT NULL DEFAULT 1,
  "expiraEn" TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX "LimiteSolicitud_accion_claveHash_ventana_key"
ON "LimiteSolicitud"("accion", "claveHash", "ventana");

CREATE INDEX "LimiteSolicitud_expiraEn_idx" ON "LimiteSolicitud"("expiraEn");
