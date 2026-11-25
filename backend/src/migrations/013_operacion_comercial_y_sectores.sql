ALTER TABLE producto
    ADD COLUMN IF NOT EXISTS codigo_venta VARCHAR(40);

CREATE UNIQUE INDEX IF NOT EXISTS uq_producto_codigo_venta
    ON producto(codigo_venta)
    WHERE codigo_venta IS NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM producto
        WHERE (nombre='Almuerzo completo' AND (categoria<>'OTRO' OR codigo_venta IS DISTINCT FROM 'ALMUERZO_COMPLETO'))
           OR (nombre='Vaso extra de refresco' AND (categoria<>'OTRO' OR codigo_venta IS DISTINCT FROM 'VASO_EXTRA_REFRESCO'))
           OR (codigo_venta='ALMUERZO_COMPLETO' AND nombre<>'Almuerzo completo')
           OR (codigo_venta='VASO_EXTRA_REFRESCO' AND nombre<>'Vaso extra de refresco')
    ) THEN
        RAISE EXCEPTION 'Conflicto con los productos reservados para ventas configurables; revisar catálogo antes de aplicar esta migración';
    END IF;
END $$;

INSERT INTO producto (nombre, categoria, descripcion, precio_unitario, activo, codigo_venta)
VALUES
    ('Almuerzo completo', 'OTRO', 'Sopa y un segundo elegido; refresco de acompañamiento gratuito', 0, TRUE, 'ALMUERZO_COMPLETO'),
    ('Vaso extra de refresco', 'OTRO', 'Adicional configurable; no descuenta producción de refresco', 0, TRUE, 'VASO_EXTRA_REFRESCO');

CREATE TABLE IF NOT EXISTS precio_configurado (
    id_precio BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(40) NOT NULL
        CHECK (codigo IN (
            'ALMUERZO_COMPLETO', 'SOPA', 'SEGUNDO', 'ENTRADA',
            'REFRESCO', 'PLATO_EXTRA', 'VASO_EXTRA_REFRESCO'
        )),
    precio NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
    vigente_desde TIMESTAMPTZ NOT NULL,
    vigente_hasta TIMESTAMPTZ,
    id_usuario BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (vigente_hasta IS NULL OR vigente_hasta > vigente_desde)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_precio_configurado_vigente
    ON precio_configurado(codigo)
    WHERE vigente_hasta IS NULL;

CREATE INDEX IF NOT EXISTS idx_precio_configurado_historial
    ON precio_configurado(codigo, vigente_desde DESC);

ALTER TABLE detalle_pedido
    ADD COLUMN IF NOT EXISTS id_sopa_componente BIGINT
        REFERENCES producto(id_producto) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS id_segundo_componente BIGINT
        REFERENCES producto(id_producto) ON DELETE RESTRICT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid='public.detalle_pedido'::regclass
          AND conname='ck_detalle_pedido_componentes_completo'
    ) THEN
        ALTER TABLE detalle_pedido
            ADD CONSTRAINT ck_detalle_pedido_componentes_completo
            CHECK ((id_sopa_componente IS NULL) = (id_segundo_componente IS NULL));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_detalle_pedido_componentes
    ON detalle_pedido(id_sopa_componente, id_segundo_componente)
    WHERE id_sopa_componente IS NOT NULL;

CREATE TABLE IF NOT EXISTS idempotencia_operacion (
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    solicitud_id UUID NOT NULL,
    operacion VARCHAR(40) NOT NULL,
    payload_hash CHAR(64) NOT NULL,
    resultado JSONB NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_usuario, solicitud_id)
);

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS saldo_segundos_pollo INTEGER
        CHECK (saldo_segundos_pollo IS NULL OR saldo_segundos_pollo >= 0),
    ADD COLUMN IF NOT EXISTS saldo_segundos_carne INTEGER
        CHECK (saldo_segundos_carne IS NULL OR saldo_segundos_carne >= 0);

ALTER TABLE movimiento_pensionado
    DROP CONSTRAINT IF EXISTS movimiento_pensionado_tipo_producto_check;

ALTER TABLE movimiento_pensionado
    ALTER COLUMN tipo_producto TYPE VARCHAR(20);

ALTER TABLE movimiento_pensionado
    ADD CONSTRAINT movimiento_pensionado_tipo_producto_check
        CHECK (tipo_producto IN ('SOPA', 'SEGUNDO', 'SEGUNDO_POLLO', 'SEGUNDO_CARNE'));

ALTER TABLE sector_mesa
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_sector_mesa_activo
    ON sector_mesa(activo, nombre);
