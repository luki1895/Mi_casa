ALTER TABLE mesa
    ADD COLUMN IF NOT EXISTS posicion_x NUMERIC(6,5),
    ADD COLUMN IF NOT EXISTS posicion_y NUMERIC(6,5),
    ADD COLUMN IF NOT EXISTS rotacion_grados SMALLINT NOT NULL DEFAULT 0
        CHECK (rotacion_grados BETWEEN 0 AND 359),
    ADD COLUMN IF NOT EXISTS forma_visual VARCHAR(16) NOT NULL DEFAULT 'CIRCULAR'
        CHECK (forma_visual IN ('CIRCULAR', 'CUADRADA', 'RECTANGULAR')),
    ADD COLUMN IF NOT EXISTS ancho_visual NUMERIC(6,5) NOT NULL DEFAULT 0.12
        CHECK (ancho_visual BETWEEN 0.04 AND 0.40),
    ADD COLUMN IF NOT EXISTS alto_visual NUMERIC(6,5) NOT NULL DEFAULT 0.12
        CHECK (alto_visual BETWEEN 0.04 AND 0.40);

ALTER TABLE mesa
    ADD CONSTRAINT ck_mesa_plano_coordenadas_completas
        CHECK ((posicion_x IS NULL AND posicion_y IS NULL)
            OR (posicion_x BETWEEN 0 AND 1 AND posicion_y BETWEEN 0 AND 1));
