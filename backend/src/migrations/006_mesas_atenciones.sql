CREATE TABLE IF NOT EXISTS mesa (
    id_mesa BIGSERIAL PRIMARY KEY,
    numero VARCHAR(20) NOT NULL UNIQUE,
    capacidad INTEGER NOT NULL CHECK (capacidad > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA'
        CHECK (estado IN ('ACTIVA', 'FUERA_SERVICIO')),
    creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS atencion_mesa (
    id_atencion BIGSERIAL PRIMARY KEY,
    id_mesa BIGINT NOT NULL REFERENCES mesa(id_mesa) ON DELETE RESTRICT,
    id_usuario_apertura BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    id_usuario_cierre BIGINT REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTA'
        CHECK (estado IN ('ABIERTA', 'CERRADA', 'CANCELADA')),
    abierta_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cerrada_en TIMESTAMPTZ,
    observaciones TEXT,
    CHECK ((estado = 'ABIERTA' AND cerrada_en IS NULL AND id_usuario_cierre IS NULL)
        OR (estado <> 'ABIERTA' AND cerrada_en IS NOT NULL AND id_usuario_cierre IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_atencion_mesa_abierta
    ON atencion_mesa(id_mesa)
    WHERE estado = 'ABIERTA';

ALTER TABLE pedido
    ADD COLUMN IF NOT EXISTS id_atencion BIGINT
        REFERENCES atencion_mesa(id_atencion) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS historial_atencion_mesa (
    id_historial BIGSERIAL PRIMARY KEY,
    id_atencion BIGINT NOT NULL REFERENCES atencion_mesa(id_atencion) ON DELETE RESTRICT,
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accion VARCHAR(40) NOT NULL,
    detalle JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_atencion_mesa_estado
    ON atencion_mesa(estado, abierta_en DESC);

CREATE INDEX IF NOT EXISTS idx_historial_atencion_fecha
    ON historial_atencion_mesa(id_atencion, fecha DESC);
