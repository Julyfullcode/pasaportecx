CREATE TABLE "Dependencia" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "orden" INTEGER NOT NULL,
  "activa" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Dependencia_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Participante" ADD COLUMN "dependenciaId" TEXT;
ALTER TABLE "CorreoAutorizado" ADD COLUMN "dependenciaId" TEXT;

ALTER TABLE "Participante" ADD CONSTRAINT "Participante_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "Dependencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CorreoAutorizado" ADD CONSTRAINT "CorreoAutorizado_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "Dependencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Dependencia_nombre_key" ON "Dependencia"("nombre");
CREATE INDEX "Dependencia_orden_idx" ON "Dependencia"("orden");
CREATE INDEX "Participante_dependenciaId_idx" ON "Participante"("dependenciaId");
CREATE INDEX "CorreoAutorizado_dependenciaId_idx" ON "CorreoAutorizado"("dependenciaId");

INSERT INTO "Dependencia" ("id", "nombre", "orden", "activa") VALUES
  ('dependencia-comunicaciones', 'Comunicaciones', 1, true),
  ('dependencia-experiencia', 'Experiencia', 2, true),
  ('dependencia-talento-humano', 'Talento Humano', 3, true),
  ('dependencia-reputacion', 'Reputación', 4, true);