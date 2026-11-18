CREATE TABLE IF NOT EXISTS reserva_plato (
    id_reserva BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    solicitud_id UUID NOT NULL UNIQUE,
    id_cliente BIGINT REFERENCES cliente(id_cliente) ON DELETE SET NULL,
    nombre_cliente VARCHAR(180) NOT NULL,
    celular VARCHAR(30) NOT NULL,
    correo VARCHAR(180),
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    observaciones TEXT,
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN (
            'PENDIENTE', 'RECIBIDA', 'EN_PREPARACION',
            'ATENDIDA', 'CANCELADA', 'NO_PRESENTADA'
        )),
    id_pedido BIGINT REFERENCES pedido(id_pedido) ON DELETE RESTRICT,
    codigo_expira_en TIMESTAMPTZ,
    codigo_revocado_en TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    recibida_en TIMESTAMPTZ,
    recibida_por BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    no_presentada_en TIMESTAMPTZ,
    no_presentada_por BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detalle_reserva_plato (
    id_detalle BIGSERIAL PRIMARY KEY,
    id_reserva BIGINT NOT NULL REFERENCES reserva_plato(id_reserva) ON DELETE RESTRICT,
    id_producto BIGINT NOT NULL REFERENCES producto(id_producto) ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),
    nombre_producto VARCHAR(180) NOT NULL,
    UNIQUE (id_reserva, id_producto)
);

CREATE TABLE IF NOT EXISTS historial_reserva_plato (
    id_historial BIGSERIAL PRIMARY KEY,
    id_reserva BIGINT NOT NULL REFERENCES reserva_plato(id_reserva) ON DELETE RESTRICT,
    id_usuario BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30) NOT NULL,
    accion VARCHAR(60) NOT NULL,
    observaciones TEXT
);

CREATE TABLE IF NOT EXISTS impresion_reserva_plato (
    id_impresion BIGSERIAL PRIMARY KEY,
    id_reserva BIGINT NOT NULL REFERENCES reserva_plato(id_reserva) ON DELETE RESTRICT,
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    tipo VARCHAR(30) NOT NULL,
    version INTEGER NOT NULL CHECK (version > 0),
    reimpresion BOOLEAN NOT NULL DEFAULT FALSE,
    solicitud_id UUID NOT NULL UNIQUE,
    creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserva_plato_fecha_estado
    ON reserva_plato(fecha, estado);
CREATE INDEX IF NOT EXISTS idx_reserva_plato_no_presentada
    ON reserva_plato(fecha, hora)
    WHERE estado = 'PENDIENTE' AND id_pedido IS NULL;

CREATE TABLE IF NOT EXISTS configuracion_reserva_platos (
    id_configuracion SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id_configuracion = 1),
    hora_inicio TIME,
    hora_fin TIME,
    intervalo_minutos SMALLINT CHECK (intervalo_minutos > 0),
    tolerancia_minutos SMALLINT NOT NULL DEFAULT 30 CHECK (tolerancia_minutos >= 0),
    zona_horaria TEXT NOT NULL DEFAULT 'America/La_Paz',
    actualizado_por BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((hora_inicio IS NULL AND hora_fin IS NULL)
        OR (hora_inicio IS NOT NULL AND hora_fin IS NOT NULL AND hora_inicio < hora_fin))
);

INSERT INTO configuracion_reserva_platos (id_configuracion)
VALUES (1)
ON CONFLICT (id_configuracion) DO NOTHING;

CREATE TABLE IF NOT EXISTS revision_reserva_plato (
    id_revision BIGSERIAL PRIMARY KEY,
    id_reserva BIGINT NOT NULL REFERENCES reserva_plato(id_reserva) ON DELETE RESTRICT,
    version INTEGER NOT NULL CHECK (version > 0),
    id_usuario BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    origen VARCHAR(20) NOT NULL CHECK (origen IN ('CLIENTE', 'INTERNO', 'SISTEMA')),
    accion VARCHAR(40) NOT NULL,
    datos JSONB NOT NULL,
    creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id_reserva, version)
);

CREATE INDEX IF NOT EXISTS idx_revision_reserva_plato
    ON revision_reserva_plato(id_reserva, version DESC);

CREATE TABLE IF NOT EXISTS evento_privado (
    id_evento BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    nombre_responsable VARCHAR(180) NOT NULL,
    celular VARCHAR(30) NOT NULL,
    correo VARCHAR(180),
    tipo_evento VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    invitados INTEGER NOT NULL CHECK (invitados > 0),
    decoracion VARCHAR(20) NOT NULL CHECK (decoracion IN ('SI', 'NO', 'CONSULTAR')),
    observaciones TEXT,
    estado VARCHAR(40) NOT NULL DEFAULT 'PENDIENTE_REVISION'
        CHECK (estado IN (
            'PENDIENTE_REVISION', 'REQUIERE_CAMBIOS',
            'APROBADO_PENDIENTE_ANTICIPO', 'CONFIRMADO',
            'RECHAZADO', 'CANCELADO', 'REALIZADO'
        )),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    costos_adicionales NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (costos_adicionales >= 0),
    total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    anticipo_requerido NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (anticipo_requerido >= 0),
    condiciones_cancelacion TEXT,
    token_expira_en TIMESTAMPTZ,
    token_revocado_en TIMESTAMPTZ,
    solicitud_id UUID NOT NULL UNIQUE,
    id_usuario_aprobacion BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    aprobado_en TIMESTAMPTZ,
    confirmado_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (hora_inicio < hora_fin)
);

CREATE TABLE IF NOT EXISTS detalle_evento_privado (
    id_detalle BIGSERIAL PRIMARY KEY,
    id_evento BIGINT NOT NULL REFERENCES evento_privado(id_evento) ON DELETE RESTRICT,
    id_producto BIGINT REFERENCES producto(id_producto) ON DELETE SET NULL,
    preparacion VARCHAR(240) NOT NULL,
    cantidad_personas INTEGER NOT NULL CHECK (cantidad_personas > 0),
    precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_unitario >= 0),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    es_adicional BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS historial_evento_privado (
    id_historial BIGSERIAL PRIMARY KEY,
    id_evento BIGINT NOT NULL REFERENCES evento_privado(id_evento) ON DELETE RESTRICT,
    id_usuario BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    accion VARCHAR(50) NOT NULL,
    estado_anterior VARCHAR(40),
    estado_nuevo VARCHAR(40),
    detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pago_evento (
    id_pago_evento BIGSERIAL PRIMARY KEY,
    id_evento BIGINT NOT NULL REFERENCES evento_privado(id_evento) ON DELETE RESTRICT,
    id_usuario_registro BIGINT REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    id_usuario_verificacion BIGINT REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    id_caja BIGINT UNIQUE REFERENCES caja(id_caja) ON DELETE RESTRICT,
    solicitud_id UUID NOT NULL UNIQUE,
    importe NUMERIC(12,2) NOT NULL CHECK (importe > 0),
    metodo VARCHAR(30) NOT NULL CHECK (metodo IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'QR')),
    referencia TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'VERIFICADO', 'RECHAZADO', 'ANULADO')),
    registrado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verificado_en TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS impresion_evento_privado (
    id_impresion BIGSERIAL PRIMARY KEY,
    id_evento BIGINT NOT NULL REFERENCES evento_privado(id_evento) ON DELETE RESTRICT,
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('COMANDA', 'ACTUALIZACION')),
    version INTEGER NOT NULL CHECK (version > 0),
    solicitud_id UUID NOT NULL UNIQUE,
    reimpresion BOOLEAN NOT NULL DEFAULT FALSE,
    creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS horario_evento_privado (
    id_horario BIGSERIAL PRIMARY KEY,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    actualizado_por BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (hora_inicio < hora_fin)
);

CREATE INDEX IF NOT EXISTS idx_evento_privado_fecha_estado
    ON evento_privado(fecha, estado, hora_inicio);
CREATE INDEX IF NOT EXISTS idx_pago_evento_evento_estado
    ON pago_evento(id_evento, estado, registrado_en);
CREATE INDEX IF NOT EXISTS idx_historial_evento_fecha
    ON historial_evento_privado(id_evento, fecha DESC);
