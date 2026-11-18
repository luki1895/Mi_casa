CREATE TABLE IF NOT EXISTS sector_mesa (
    id_sector BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_sector_mesa_nombre_no_vacio CHECK (length(btrim(nombre)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sector_mesa_nombre_normalizado
    ON sector_mesa (lower(btrim(nombre)));

ALTER TABLE mesa
    ADD COLUMN IF NOT EXISTS id_sector BIGINT
        REFERENCES sector_mesa(id_sector) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS orden_visualizacion INTEGER NOT NULL DEFAULT 0
        CHECK (orden_visualizacion >= 0),
    ADD COLUMN IF NOT EXISTS habilitada BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_mesa_sector_orden
    ON mesa(id_sector, orden_visualizacion, id_mesa);
