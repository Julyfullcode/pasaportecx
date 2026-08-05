CREATE TABLE "CorreoAutorizado" (
  "id" TEXT NOT NULL,
  "correo" TEXT NOT NULL,
  "participanteId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CorreoAutorizado_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CorreoAutorizado_participanteId_fkey"
    FOREIGN KEY ("participanteId") REFERENCES "Participante"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CorreoAutorizado_correo_key" ON "CorreoAutorizado"("correo");
CREATE UNIQUE INDEX "CorreoAutorizado_participanteId_key" ON "CorreoAutorizado"("participanteId");
CREATE INDEX "CorreoAutorizado_creadoEn_idx" ON "CorreoAutorizado"("creadoEn");
