ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_rol_check;
-- Retain legacy empleado rows while enforcing the role constraint on future writes.
ALTER TABLE usuario
    ADD CONSTRAINT usuario_rol_check
        CHECK (rol IN ('admin', 'empleado', 'mesero', 'caja', 'cliente')) NOT VALID;

ALTER TABLE pago DROP CONSTRAINT IF EXISTS pago_recibido_check;
ALTER TABLE pago
    ADD CONSTRAINT pago_recibido_check CHECK (recibido >= monto) NOT VALID;
ALTER TABLE pago
    ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT,
    ADD COLUMN IF NOT EXISTS anulado_por BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS anulado_en TIMESTAMPTZ;

ALTER TABLE detalle_pedido
    ADD COLUMN IF NOT EXISTS id_solicitud BIGINT
        REFERENCES solicitud_adicional(id_solicitud) ON DELETE SET NULL;

ALTER TABLE solicitud_adicional DROP CONSTRAINT IF EXISTS solicitud_adicional_estado_check;
ALTER TABLE solicitud_adicional
    ADD CONSTRAINT solicitud_adicional_estado_check
        CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'CANCELADO', 'COBRADO'));

ALTER TABLE reserva
    ADD COLUMN IF NOT EXISTS observaciones_admin TEXT;

CREATE TABLE IF NOT EXISTS movimiento_pensionado (
    id_movimiento BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT NOT NULL REFERENCES cliente(id_cliente) ON DELETE RESTRICT,
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tipo_producto VARCHAR(10) NOT NULL CHECK (tipo_producto IN ('SOPA', 'SEGUNDO')),
    tipo_movimiento VARCHAR(12) NOT NULL CHECK (tipo_movimiento IN ('CONSUMO', 'REPOSICION')),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    saldo_resultante INTEGER NOT NULL CHECK (saldo_resultante >= 0),
    observaciones TEXT
);

CREATE TABLE IF NOT EXISTS historial_reserva (
    id_historial BIGSERIAL PRIMARY KEY,
    id_reserva BIGINT NOT NULL REFERENCES reserva(id_reserva) ON DELETE CASCADE,
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30) NOT NULL,
    observaciones_admin TEXT
);

CREATE INDEX IF NOT EXISTS idx_movimiento_pensionado_cliente_fecha
    ON movimiento_pensionado(id_cliente, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_detalle_pedido_solicitud
    ON detalle_pedido(id_solicitud) WHERE id_solicitud IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_historial_reserva_id_fecha
    ON historial_reserva(id_reserva, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_reserva_fecha_estado
    ON reserva(fecha, estado);
CREATE INDEX IF NOT EXISTS idx_pago_fecha_estado
    ON pago(fecha, estado);
CREATE INDEX IF NOT EXISTS idx_gasto_fecha_metodo
    ON gasto(fecha, metodo_pago);
