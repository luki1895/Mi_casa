BEGIN READ ONLY;

WITH seed_personas (
    id_persona,
    nombre,
    apellido_paterno,
    apellido_materno,
    ci,
    telefono,
    email,
    direccion
) AS (
    VALUES
        (1, 'Luis', 'Admin', 'Sistema', '1234567', '70000001', 'luis@micasa.bo', 'Sucre, Bolivia'),
        (2, 'Maria', 'Prueba', 'Sistema', '2234567', '70000002', 'maria@micasa.bo', 'Sucre, Bolivia'),
        (3, 'Mesero', 'Turno', 'Sistema', '3234567', '70000003', 'mesero@micasa.bo', 'Sucre, Bolivia'),
        (4, 'Caja', 'Turno', 'Sistema', '4234567', '70000004', 'caja@micasa.bo', 'Sucre, Bolivia'),
        (5, 'Cliente', 'Demo', 'Portal', '5234567', '70000005', 'cliente@micasa.bo', 'Sucre, Bolivia')
),
persona_candidata AS (
    SELECT p.id_persona
    FROM public.persona p
    JOIN seed_personas s USING (
        id_persona,
        nombre,
        apellido_paterno,
        apellido_materno,
        ci,
        telefono,
        email,
        direccion
    )
)
SELECT
    p.id_persona AS id,
    (SELECT count(*) FROM public.usuario u WHERE u.id_persona = p.id_persona) AS usuarios_referenciados,
    (SELECT count(*) FROM public.cliente c WHERE c.id_persona = p.id_persona) AS clientes_referenciados
FROM persona_candidata p
ORDER BY id;

WITH seed_productos (nombre, categoria, descripcion) AS (
    VALUES
        ('Sopa del día', 'SOPA', 'Sopa del menú diario'),
        ('Segundo del día', 'SEGUNDO', 'Segundo del menú diario'),
        ('Entrada mi casa', 'ENTRADA', 'Entrada adicional del día'),
        ('Refresco natural', 'REFRESCO', 'Refresco natural'),
        ('Plato extra', 'EXTRA', 'Plato extra del menú')
),
producto_candidato AS (
    SELECT p.id_producto
    FROM public.producto p
    JOIN seed_productos s USING (nombre, categoria, descripcion)
    WHERE p.precio_unitario = 0
      AND p.activo = TRUE
)
SELECT
    p.id_producto AS id,
    (SELECT count(*) FROM public.detalle_pedido d WHERE d.id_producto = p.id_producto) AS detalles_pedido,
    (SELECT count(*) FROM public.produccion_diaria d
     WHERE p.id_producto IN (d.id_sopa, d.id_segundo1, d.id_segundo2, d.id_entrada, d.id_refresco, d.id_plato_extra)) AS produccion_diaria,
    (SELECT count(*) FROM public.detalle_reserva_plato d WHERE d.id_producto = p.id_producto) AS detalles_reserva,
    (SELECT count(*) FROM public.detalle_evento_privado d WHERE d.id_producto = p.id_producto) AS detalles_evento
FROM producto_candidato p
ORDER BY id;

SELECT
    (c.id_cliente = 1
        AND c.id_persona = 5
        AND c.nombre = 'Cliente Demo'
        AND c.telefono = '70000005'
        AND c.tipo_cliente = 'EVENTUAL'
        AND c.saldo_pensiones = 0
        AND c.estado = TRUE) AS exact_seed_client,
    (c.id_cliente = 1
        AND c.id_persona = 5
        AND c.nombre = 'Cliente Demo'
        AND c.tipo_cliente = 'EVENTUAL'
        AND c.saldo_pensiones = 0) AS partial_seed_client,
    (SELECT count(*) FROM public.pedido p WHERE p.id_cliente = c.id_cliente) AS linked_orders,
    (SELECT count(*) FROM public.reserva r WHERE r.id_cliente = c.id_cliente) AS linked_reservations,
    (SELECT count(*) FROM public.usuario u WHERE u.id_cliente = c.id_cliente) AS linked_users
FROM public.cliente c
WHERE c.id_cliente = 1;

SELECT
    count(*) AS exact_seed_configurations
FROM public.configuracion
WHERE id_configuracion = 1
  AND (precio_almuerzo, precio_sopa, precio_segundo, precio_plato_extra, precio_entrada, precio_refresco)
      = (80, 25, 40, 35, 20, 12);

SELECT
    (SELECT count(*) FROM public.pedido) AS pedidos_conservados,
    (SELECT count(*) FROM public.pago) AS pagos_conservados,
    (SELECT count(*) FROM public.caja) AS movimientos_caja_conservados,
    (SELECT count(*) FROM public.produccion_diaria) AS produccion_conservada,
    (SELECT count(*) FROM public.bitacora_operaciones) AS auditoria_conservada;

ROLLBACK;
