BEGIN;

CREATE TABLE IF NOT EXISTS persona (
    id_persona BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    apellido_paterno VARCHAR(100),
    apellido_materno VARCHAR(100),
    ci VARCHAR(40),
    telefono VARCHAR(30),
    email VARCHAR(150),
    direccion TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cliente (
    id_cliente BIGSERIAL PRIMARY KEY,
    id_persona BIGINT REFERENCES persona(id_persona) ON DELETE SET NULL,
    nombre VARCHAR(180) NOT NULL,
    telefono VARCHAR(30),
    tipo_cliente VARCHAR(30) NOT NULL DEFAULT 'EVENTUAL'
        CHECK (tipo_cliente IN ('PENSIONADO', 'EVENTUAL')),
    saldo_pensiones NUMERIC(12,2) NOT NULL DEFAULT 0,
    saldo_sopas INTEGER CHECK (saldo_sopas IS NULL OR saldo_sopas >= 0),
    saldo_segundos INTEGER CHECK (saldo_segundos IS NULL OR saldo_segundos >= 0),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario BIGSERIAL PRIMARY KEY,
    id_persona BIGINT REFERENCES persona(id_persona) ON DELETE SET NULL,
    id_cliente BIGINT UNIQUE REFERENCES cliente(id_cliente) ON DELETE SET NULL,
    usuario VARCHAR(80) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    rol VARCHAR(40) NOT NULL
        CHECK (rol IN ('admin', 'empleado', 'mesero', 'caja', 'cliente')),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS producto (
    id_producto BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(180) NOT NULL UNIQUE,
    categoria VARCHAR(40) NOT NULL
        CHECK (categoria IN ('SOPA', 'SEGUNDO', 'ENTRADA', 'REFRESCO', 'EXTRA', 'OTRO')),
    descripcion TEXT,
    precio_unitario NUMERIC(12,2) DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configuracion (
    id_configuracion SERIAL PRIMARY KEY,
    precio_almuerzo NUMERIC(12,2) NOT NULL DEFAULT 0,
    precio_sopa NUMERIC(12,2) NOT NULL DEFAULT 0,
    precio_segundo NUMERIC(12,2) NOT NULL DEFAULT 0,
    precio_plato_extra NUMERIC(12,2) NOT NULL DEFAULT 0,
    precio_entrada NUMERIC(12,2) NOT NULL DEFAULT 0,
    precio_refresco NUMERIC(12,2) NOT NULL DEFAULT 0,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produccion_diaria (
    id_produccion BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    id_sopa BIGINT REFERENCES producto(id_producto) ON DELETE SET NULL,
    id_segundo1 BIGINT REFERENCES producto(id_producto) ON DELETE SET NULL,
    id_segundo2 BIGINT REFERENCES producto(id_producto) ON DELETE SET NULL,
    id_entrada BIGINT REFERENCES producto(id_producto) ON DELETE SET NULL,
    id_refresco BIGINT REFERENCES producto(id_producto) ON DELETE SET NULL,
    id_plato_extra BIGINT REFERENCES producto(id_producto) ON DELETE SET NULL,
    cantidad_sopa INTEGER NOT NULL DEFAULT 0,
    cantidad_segundo1 INTEGER NOT NULL DEFAULT 0,
    cantidad_segundo2 INTEGER NOT NULL DEFAULT 0,
    cantidad_entrada INTEGER NOT NULL DEFAULT 0,
    cantidad_refresco INTEGER NOT NULL DEFAULT 0,
    cantidad_extra INTEGER NOT NULL DEFAULT 0,
    precio_extra NUMERIC(12,2) DEFAULT NULL,
    UNIQUE (fecha)
);

CREATE TABLE IF NOT EXISTS pedido (
    id_pedido BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT NOT NULL REFERENCES cliente(id_cliente) ON DELETE RESTRICT,
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tipo_cliente VARCHAR(30) NOT NULL DEFAULT 'EVENTUAL'
        CHECK (tipo_cliente IN ('PENSIONADO', 'EVENTUAL')),
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO')),
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    observaciones TEXT,
    pagado BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS detalle_pedido (
    id_detalle_pedido BIGSERIAL PRIMARY KEY,
    id_pedido BIGINT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    id_producto BIGINT NOT NULL REFERENCES producto(id_producto) ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio NUMERIC(12,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gasto (
    id_gasto BIGSERIAL PRIMARY KEY,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    concepto VARCHAR(180) NOT NULL,
    descripcion TEXT,
    cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    id_usuario BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    metodo_pago VARCHAR(30) NOT NULL DEFAULT 'EFECTIVO'
        CHECK (metodo_pago IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR'))
);

CREATE TABLE IF NOT EXISTS caja (
    id_caja BIGSERIAL PRIMARY KEY,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    concepto VARCHAR(180) NOT NULL,
    ingreso NUMERIC(12,2) NOT NULL DEFAULT 0,
    egreso NUMERIC(12,2) NOT NULL DEFAULT 0,
    saldo NUMERIC(12,2) NOT NULL DEFAULT 0,
    id_usuario BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS apertura_caja (
    id_apertura BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    monto_inicial NUMERIC(12,2) NOT NULL CHECK (monto_inicial >= 0),
    abierta_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cierre_caja (
    id_cierre BIGSERIAL PRIMARY KEY,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    saldo_esperado NUMERIC(12,2) NOT NULL DEFAULT 0,
    monto_contado NUMERIC(12,2) NOT NULL DEFAULT 0,
    diferencia NUMERIC(12,2) NOT NULL DEFAULT 0,
    observaciones TEXT
);

CREATE TABLE IF NOT EXISTS reserva (
    id_reserva BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT NOT NULL REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL,
    cantidad_personas INTEGER NOT NULL CHECK (cantidad_personas > 0),
    observaciones TEXT,
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO')),
    creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pago (
    id_pago BIGSERIAL PRIMARY KEY,
    id_pedido BIGINT NOT NULL REFERENCES pedido(id_pedido) ON DELETE RESTRICT,
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    metodo VARCHAR(30) NOT NULL,
    recibido NUMERIC(12,2) NOT NULL CHECK (recibido >= 0),
    cambio NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado VARCHAR(30) NOT NULL DEFAULT 'CONFIRMADO'
        CHECK (estado IN ('CONFIRMADO', 'PENDIENTE', 'ANULADO'))
);

CREATE TABLE IF NOT EXISTS solicitud_adicional (
    id_solicitud BIGSERIAL PRIMARY KEY,
    id_pedido BIGINT NOT NULL REFERENCES pedido(id_pedido) ON DELETE RESTRICT,
    id_mesero BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    detalle JSONB NOT NULL,
    observaciones TEXT,
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'CANCELADO')),
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    id_pago BIGINT REFERENCES pago(id_pago) ON DELETE SET NULL,
    CONSTRAINT solicitud_detalle_es_array CHECK (jsonb_typeof(detalle) = 'array')
);

CREATE TABLE IF NOT EXISTS bitacora_operaciones (
    id_operacion BIGSERIAL PRIMARY KEY,
    id_usuario BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(100) NOT NULL,
    id_entidad VARCHAR(100),
    detalle JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_usuario_rol ON usuario(rol);
CREATE INDEX IF NOT EXISTS idx_cliente_tipo_estado ON cliente(tipo_cliente, estado);
CREATE INDEX IF NOT EXISTS idx_pedido_cliente_fecha ON pedido(id_cliente, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_pedido_usuario_estado ON pedido(id_usuario, estado);
CREATE INDEX IF NOT EXISTS idx_detalle_pedido_producto ON detalle_pedido(id_producto, id_pedido);
CREATE INDEX IF NOT EXISTS idx_produccion_fecha ON produccion_diaria(fecha);
CREATE INDEX IF NOT EXISTS idx_gasto_fecha ON gasto(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_caja_fecha ON caja(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_pago_pedido ON pago(id_pedido, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_reserva_cliente_fecha ON reserva(id_cliente, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON bitacora_operaciones(fecha DESC);

INSERT INTO configuracion (
    id_configuracion,
    precio_almuerzo,
    precio_sopa,
    precio_segundo,
    precio_plato_extra,
    precio_entrada,
    precio_refresco
)
VALUES (
    1,
    80,
    25,
    40,
    35,
    20,
    12
)
ON CONFLICT (id_configuracion) DO UPDATE SET
    precio_almuerzo = EXCLUDED.precio_almuerzo,
    precio_sopa = EXCLUDED.precio_sopa,
    precio_segundo = EXCLUDED.precio_segundo,
    precio_plato_extra = EXCLUDED.precio_plato_extra,
    precio_entrada = EXCLUDED.precio_entrada,
    precio_refresco = EXCLUDED.precio_refresco,
    actualizado_en = NOW();

INSERT INTO producto (nombre, categoria, descripcion, precio_unitario, activo)
VALUES
    ('Sopa del día', 'SOPA', 'Sopa del menú diario', 0, TRUE),
    ('Segundo del día', 'SEGUNDO', 'Segundo del menú diario', 0, TRUE),
    ('Entrada mi casa', 'ENTRADA', 'Entrada adicional del día', 0, TRUE),
    ('Refresco natural', 'REFRESCO', 'Refresco natural', 0, TRUE),
    ('Plato extra', 'EXTRA', 'Plato extra del menú', 0, TRUE)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO persona (id_persona, nombre, apellido_paterno, apellido_materno, ci, telefono, email, direccion)
VALUES
    (1, 'Luis', 'Admin', 'Sistema', '1234567', '70000001', 'luis@micasa.bo', 'Sucre, Bolivia'),
    (2, 'Maria', 'Empleado', 'Sistema', '2234567', '70000002', 'maria@micasa.bo', 'Sucre, Bolivia'),
    (3, 'Mesero', 'Turno', 'Sistema', '3234567', '70000003', 'mesero@micasa.bo', 'Sucre, Bolivia'),
    (4, 'Caja', 'Turno', 'Sistema', '4234567', '70000004', 'caja@micasa.bo', 'Sucre, Bolivia'),
    (5, 'Cliente', 'Demo', 'Portal', '5234567', '70000005', 'cliente@micasa.bo', 'Sucre, Bolivia')
ON CONFLICT (id_persona) DO NOTHING;

INSERT INTO cliente (id_cliente, id_persona, nombre, telefono, tipo_cliente, saldo_pensiones, estado)
VALUES
    (1, 5, 'Cliente Demo', '70000005', 'EVENTUAL', 0, TRUE)
ON CONFLICT (id_cliente) DO NOTHING;

INSERT INTO usuario (id_usuario, id_persona, id_cliente, usuario, password, rol, estado)
VALUES
    (1, 1, NULL, 'luis', '$2b$10$ifW8ScebSReStsahF039X.EhtfTVo06rEH.fhYshybFGt.IhMURh6', 'admin', TRUE),
    (2, 2, NULL, 'maria', '$2b$10$FGohPwvAqgfOliZniActWOyECdfbOulja.z2cgMYilGGRZl6e5l1u', 'empleado', TRUE),
    (3, 3, NULL, 'mesero', '$2b$10$mXqnvKAQKpa.SoR5skneY.vn6wvDnGhVsbYHUwLzqsC8TG7CPFNPm', 'mesero', TRUE),
    (4, 4, NULL, 'caja', '$2b$10$P8EqJiMcXWYHWvSgmAqrkuVLK9CNR2KvGJ6gbH/v6w6m1IE2mCbhO', 'caja', TRUE),
    (5, 5, 1, 'cliente', '$2b$10$wnxyoUX7aE7mvctAFJ0aOOUClu1idZXJ7ueV37NQTuxnV2Wc7Bl3C', 'cliente', TRUE)
ON CONFLICT (id_usuario) DO NOTHING;

SELECT setval('persona_id_persona_seq', COALESCE((SELECT MAX(id_persona) FROM persona), 0), true);
SELECT setval('cliente_id_cliente_seq', COALESCE((SELECT MAX(id_cliente) FROM cliente), 0), true);
SELECT setval('usuario_id_usuario_seq', COALESCE((SELECT MAX(id_usuario) FROM usuario), 0), true);
SELECT setval('producto_id_producto_seq', COALESCE((SELECT MAX(id_producto) FROM producto), 0), true);

COMMIT;
