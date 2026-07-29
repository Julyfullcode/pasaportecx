-- CreateTable
CREATE TABLE "Participante" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "urlFoto" TEXT NOT NULL,
    "codigoRecuperacion" TEXT NOT NULL,
    "puntosTotales" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participante_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Participante_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Grupo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Componente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "colorHex" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Ubicacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Desafio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigoQr" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "puntos" INTEGER NOT NULL,
    "dia" INTEGER NOT NULL,
    "componenteId" TEXT,
    "ubicacion" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "esSecreto" BOOLEAN NOT NULL DEFAULT false,
    "disponibleDesde" DATETIME,
    "disponibleHasta" DATETIME,
    "limiteCompletitudes" INTEGER,
    "configuracion" JSONB NOT NULL,
    "urlImagen" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Desafio_componenteId_fkey" FOREIGN KEY ("componenteId") REFERENCES "Componente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Completitud" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participanteId" TEXT NOT NULL,
    "desafioId" TEXT NOT NULL,
    "puntosOtorgados" INTEGER NOT NULL,
    "respuesta" JSONB,
    "urlEvidencia" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'APROBADO',
    "completadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Completitud_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Completitud_desafioId_fkey" FOREIGN KEY ("desafioId") REFERENCES "Desafio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recuerdo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participanteId" TEXT NOT NULL,
    "urlFoto" TEXT NOT NULL,
    "urlMiniatura" TEXT NOT NULL,
    "descripcion" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "reportado" BOOLEAN NOT NULL DEFAULT false,
    "pendiente" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claveIdempotencia" TEXT,
    CONSTRAINT "Recuerdo_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AjustePuntos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participanteId" TEXT NOT NULL,
    "puntos" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AjustePuntos_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AjustePuntos_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SesionParticipante" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "expiraEn" DATETIME NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SesionParticipante_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SesionAdmin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "expiraEn" DATETIME NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SesionAdmin_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConfiguracionEvento" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'evento',
    "nombreEvento" TEXT NOT NULL DEFAULT 'Pasaporte CX',
    "tamanoPodioIndividual" INTEGER NOT NULL DEFAULT 5,
    "tamanoPodioEquipos" INTEGER NOT NULL DEFAULT 3,
    "metodoPuntajeEquipo" TEXT NOT NULL DEFAULT 'PROMEDIO',
    "puntosPorRecuerdo" INTEGER NOT NULL DEFAULT 0,
    "maxRecuerdosConPuntos" INTEGER NOT NULL DEFAULT 0,
    "recuerdosRequierenAprobacion" BOOLEAN NOT NULL DEFAULT false,
    "asignacionAutomatica" BOOLEAN NOT NULL DEFAULT false,
    "modoAsistentes" TEXT NOT NULL DEFAULT 'MOSAICO',
    "intervaloAsistentesSegundos" INTEGER NOT NULL DEFAULT 6,
    "cicloMixto" TEXT NOT NULL DEFAULT 'asistentes:60,recuerdos:45,podio:30'
);

-- CreateIndex
CREATE UNIQUE INDEX "Participante_codigoRecuperacion_key" ON "Participante"("codigoRecuperacion");

-- CreateIndex
CREATE INDEX "Participante_puntosTotales_idx" ON "Participante"("puntosTotales");

-- CreateIndex
CREATE INDEX "Participante_grupoId_idx" ON "Participante"("grupoId");

-- CreateIndex
CREATE INDEX "Participante_empresaId_idx" ON "Participante"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Grupo_nombre_key" ON "Grupo"("nombre");

-- CreateIndex
CREATE INDEX "Grupo_orden_idx" ON "Grupo"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_nombre_key" ON "Empresa"("nombre");

-- CreateIndex
CREATE INDEX "Empresa_orden_idx" ON "Empresa"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "Componente_nombre_key" ON "Componente"("nombre");

-- CreateIndex
CREATE INDEX "Componente_orden_idx" ON "Componente"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "Ubicacion_nombre_key" ON "Ubicacion"("nombre");

-- CreateIndex
CREATE INDEX "Ubicacion_orden_idx" ON "Ubicacion"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "Desafio_codigoQr_key" ON "Desafio"("codigoQr");

-- CreateIndex
CREATE INDEX "Desafio_estado_dia_idx" ON "Desafio"("estado", "dia");

-- CreateIndex
CREATE INDEX "Desafio_componenteId_idx" ON "Desafio"("componenteId");

-- CreateIndex
CREATE INDEX "Completitud_participanteId_idx" ON "Completitud"("participanteId");

-- CreateIndex
CREATE INDEX "Completitud_desafioId_idx" ON "Completitud"("desafioId");

-- CreateIndex
CREATE INDEX "Completitud_estado_idx" ON "Completitud"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "Completitud_participanteId_desafioId_key" ON "Completitud"("participanteId", "desafioId");

-- CreateIndex
CREATE UNIQUE INDEX "Recuerdo_claveIdempotencia_key" ON "Recuerdo"("claveIdempotencia");

-- CreateIndex
CREATE INDEX "Recuerdo_creadoEn_idx" ON "Recuerdo"("creadoEn");

-- CreateIndex
CREATE INDEX "Recuerdo_participanteId_idx" ON "Recuerdo"("participanteId");

-- CreateIndex
CREATE INDEX "AjustePuntos_participanteId_idx" ON "AjustePuntos"("participanteId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_usuario_key" ON "Admin"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "SesionParticipante_tokenHash_key" ON "SesionParticipante"("tokenHash");

-- CreateIndex
CREATE INDEX "SesionParticipante_participanteId_idx" ON "SesionParticipante"("participanteId");

-- CreateIndex
CREATE INDEX "SesionParticipante_expiraEn_idx" ON "SesionParticipante"("expiraEn");

-- CreateIndex
CREATE UNIQUE INDEX "SesionAdmin_tokenHash_key" ON "SesionAdmin"("tokenHash");

-- CreateIndex
CREATE INDEX "SesionAdmin_expiraEn_idx" ON "SesionAdmin"("expiraEn");
