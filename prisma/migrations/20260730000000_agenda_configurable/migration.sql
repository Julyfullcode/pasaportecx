CREATE TABLE "DiaAgenda" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    CONSTRAINT "DiaAgenda_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MomentoAgenda" (
    "id" TEXT NOT NULL,
    "diaId" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    CONSTRAINT "MomentoAgenda_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DiaAgenda_orden_idx" ON "DiaAgenda"("orden");
CREATE INDEX "MomentoAgenda_diaId_horaInicio_idx" ON "MomentoAgenda"("diaId", "horaInicio");

ALTER TABLE "MomentoAgenda"
ADD CONSTRAINT "MomentoAgenda_diaId_fkey"
FOREIGN KEY ("diaId") REFERENCES "DiaAgenda"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
