-- Preserve legacy empleado rows while preventing new or automatic role assignments.
ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_rol_check;
ALTER TABLE usuario
    ADD CONSTRAINT usuario_rol_check
        CHECK (rol IN ('admin', 'empleado', 'mesero', 'caja', 'cliente')) NOT VALID;

CREATE OR REPLACE FUNCTION public.mi_casa_proteger_rol_empleado()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.rol = 'empleado' THEN
            RAISE EXCEPTION 'No se permiten nuevas cuentas con rol empleado'
                USING ERRCODE = '23514', CONSTRAINT = 'usuario_rol_check';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.rol = 'empleado' AND NEW.rol IS DISTINCT FROM OLD.rol THEN
            RAISE EXCEPTION 'El rol de una cuenta empleado histórica no puede cambiar en esta etapa'
                USING ERRCODE = '23514', CONSTRAINT = 'usuario_rol_check';
        END IF;

        IF NEW.rol = 'empleado' AND OLD.rol IS DISTINCT FROM 'empleado' THEN
            RAISE EXCEPTION 'No se permite asignar el rol empleado'
                USING ERRCODE = '23514', CONSTRAINT = 'usuario_rol_check';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS usuario_proteger_rol_empleado ON usuario;
CREATE TRIGGER usuario_proteger_rol_empleado
    BEFORE INSERT OR UPDATE OF rol ON usuario
    FOR EACH ROW
    EXECUTE FUNCTION public.mi_casa_proteger_rol_empleado();
