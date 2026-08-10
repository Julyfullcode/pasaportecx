CREATE TABLE "Equipo" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "orden" INTEGER NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Equipo_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Participante" ADD COLUMN "equipoId" TEXT;
ALTER TABLE "CorreoAutorizado" ADD COLUMN "equipoId" TEXT;

ALTER TABLE "Participante" ADD CONSTRAINT "Participante_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CorreoAutorizado" ADD CONSTRAINT "CorreoAutorizado_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Equipo_nombre_key" ON "Equipo"("nombre");
CREATE INDEX "Equipo_orden_idx" ON "Equipo"("orden");
CREATE INDEX "Participante_equipoId_idx" ON "Participante"("equipoId");
CREATE INDEX "CorreoAutorizado_equipoId_idx" ON "CorreoAutorizado"("equipoId");

INSERT INTO "Equipo" ("id", "nombre", "orden", "activo") VALUES
  ('equipo-1', 'Equipo 1', 1, true),
  ('equipo-2', 'Equipo 2', 2, true),
  ('equipo-3', 'Equipo 3', 3, true);
