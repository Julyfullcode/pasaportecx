CREATE TABLE ReaccionRecuerdo (
  id TEXT NOT NULL,
  recuerdoId TEXT NOT NULL,
  participanteId TEXT NOT NULL,
  tipo TEXT NOT NULL,
  creadoEn TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT ReaccionRecuerdo_pkey PRIMARY KEY (id),
  CONSTRAINT ReaccionRecuerdo_recuerdoId_fkey FOREIGN KEY (recuerdoId) REFERENCES Recuerdo(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ReaccionRecuerdo_participanteId_fkey FOREIGN KEY (participanteId) REFERENCES Participante(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX ReaccionRecuerdo_recuerdoId_participanteId_tipo_key
ON ReaccionRecuerdo(recuerdoId, participanteId, tipo);

CREATE INDEX ReaccionRecuerdo_recuerdoId_tipo_idx
ON ReaccionRecuerdo(recuerdoId, tipo);

CREATE INDEX ReaccionRecuerdo_participanteId_idx
ON ReaccionRecuerdo(participanteId);
