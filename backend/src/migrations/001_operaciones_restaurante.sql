-- Ampliaciones compatibles con el esquema existente de Mi Casa.
-- Aplicar una sola vez sobre la base PostgreSQL configurada en backend/.env.

ALTER TABLE produccion_diaria
    ADD COLUMN IF NOT EXISTS id_entrada INTEGER REFERENCES producto(id_producto),
    ADD COLUMN IF NOT EXISTS cantidad_entrada INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS precio_extra NUMERIC(12, 2);

ALTER TABLE configuracion
    ADD COLUMN IF NOT EXISTS precio_entrada NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS precio_refresco NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE pedido
    ADD COLUMN IF NOT EXISTS observaciones TEXT,
    ADD COLUMN IF NOT EXISTS pagado BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE gasto
    ADD COLUMN IF NOT EXISTS descripcion TEXT,
    ADD COLUMN IF NOT EXISTS metodo_pago TEXT NOT NULL DEFAULT 'EFECTIVO',
    ADD COLUMN IF NOT EXISTS id_usuario INTEGER REFERENCES usuario(id_usuario);

ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS id_cliente INTEGER UNIQUE REFERENCES cliente(id_cliente);

CREATE TABLE IF NOT EXISTS reserva (
    id_reserva BIGSERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL REFERENCES cliente(id_cliente),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL,
    cantidad_personas INTEGER NOT NULL CHECK (cantidad_personas > 0),
    observaciones TEXT,
    estado TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO')),
    creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pago (
    id_pago BIGSERIAL PRIMARY KEY,
    id_pedido INTEGER NOT NULL REFERENCES pedido(id_pedido),
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario),
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    metodo TEXT NOT NULL,
    recibido NUMERIC(12, 2) NOT NULL CHECK (recibido >= monto),
    cambio NUMERIC(12, 2) NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'CONFIRMADO'
);

CREATE TABLE IF NOT EXISTS solicitud_adicional (
    id_solicitud BIGSERIAL PRIMARY KEY,
    id_pedido INTEGER NOT NULL REFERENCES pedido(id_pedido),
    id_mesero INTEGER NOT NULL REFERENCES usuario(id_usuario),
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    detalle JSONB NOT NULL,
    observaciones TEXT,
    estado TEXT NOT NULL DEFAULT 'PENDIENTE',
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    id_pago INTEGER REFERENCES pago(id_pago),
    CONSTRAINT solicitud_detalle_es_array CHECK (jsonb_typeof(detalle) = 'array')
);

CREATE TABLE IF NOT EXISTS cierre_caja (
    id_cierre BIGSERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario),
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    saldo_esperado NUMERIC(12, 2) NOT NULL,
    monto_contado NUMERIC(12, 2) NOT NULL,
    diferencia NUMERIC(12, 2) NOT NULL,
    observaciones TEXT
);

CREATE TABLE IF NOT EXISTS apertura_caja (
    id_apertura BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario),
    monto_inicial NUMERIC(12, 2) NOT NULL CHECK (monto_inicial >= 0),
    abierta_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bitacora_operaciones (
    id_operacion BIGSERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuario(id_usuario),
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    id_entidad TEXT,
    detalle JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pago_pedido ON pago(id_pedido, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_solicitud_estado ON solicitud_adicional(estado, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON bitacora_operaciones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_reserva_cliente_fecha ON reserva(id_cliente, fecha DESC);
