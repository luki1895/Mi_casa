CREATE TABLE IF NOT EXISTS cancelacion_evento_privado (
    id_cancelacion BIGSERIAL PRIMARY KEY,
    id_evento BIGINT NOT NULL UNIQUE
        REFERENCES evento_privado(id_evento) ON DELETE RESTRICT,
    tipo_responsable VARCHAR(20) NOT NULL
        CHECK (tipo_responsable IN ('CLIENTE', 'USUARIO')),
    id_usuario_responsable BIGINT REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    motivo TEXT NOT NULL CHECK (BTRIM(motivo) <> ''),
    condiciones_aplicadas TEXT,
    monto_recibido NUMERIC(12,2) NOT NULL CHECK (monto_recibido >= 0),
    monto_devuelto NUMERIC(12,2) NOT NULL CHECK (monto_devuelto >= 0),
    monto_retenido NUMERIC(12,2) NOT NULL CHECK (monto_retenido >= 0),
    metodo_devolucion VARCHAR(30)
        CHECK (metodo_devolucion IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'QR')),
    referencia_devolucion TEXT,
    estado VARCHAR(20) NOT NULL
        CHECK (estado IN ('SIN_DEVOLUCION', 'AUTORIZADA', 'DEVUELTA')),
    solicitud_id UUID NOT NULL UNIQUE,
    id_usuario_autorizacion BIGINT REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    autorizada_en TIMESTAMPTZ,
    id_usuario_devolucion BIGINT REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    devuelta_en TIMESTAMPTZ,
    solicitud_devolucion_id UUID UNIQUE,
    id_caja BIGINT UNIQUE REFERENCES caja(id_caja) ON DELETE RESTRICT,
    creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (monto_recibido = monto_devuelto + monto_retenido),
    CHECK (
        (monto_devuelto = 0 AND metodo_devolucion IS NULL)
        OR (monto_devuelto > 0 AND metodo_devolucion IS NOT NULL)
    ),
    CHECK (
        (tipo_responsable = 'CLIENTE' AND id_usuario_responsable IS NULL)
        OR (tipo_responsable = 'USUARIO' AND id_usuario_responsable IS NOT NULL)
    ),
    CHECK (
        (estado = 'SIN_DEVOLUCION' AND monto_devuelto = 0
            AND id_usuario_devolucion IS NULL AND devuelta_en IS NULL
            AND solicitud_devolucion_id IS NULL AND id_caja IS NULL)
        OR (estado = 'AUTORIZADA' AND monto_devuelto > 0
            AND id_usuario_autorizacion IS NOT NULL AND autorizada_en IS NOT NULL
            AND id_usuario_devolucion IS NULL AND devuelta_en IS NULL
            AND solicitud_devolucion_id IS NULL AND id_caja IS NULL)
        OR (estado = 'DEVUELTA' AND monto_devuelto > 0
            AND id_usuario_autorizacion IS NOT NULL AND autorizada_en IS NOT NULL
            AND id_usuario_devolucion IS NOT NULL AND devuelta_en IS NOT NULL
            AND solicitud_devolucion_id IS NOT NULL
            AND (
                (metodo_devolucion = 'EFECTIVO' AND id_caja IS NOT NULL)
                OR (metodo_devolucion <> 'EFECTIVO' AND id_caja IS NULL)
            ))
    )
);

CREATE INDEX IF NOT EXISTS idx_cancelacion_evento_estado_fecha
    ON cancelacion_evento_privado(estado, creada_en DESC);
