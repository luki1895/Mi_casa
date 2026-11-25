import pool from "../config/db.js";

const camposPrecio = {
    precio_almuerzo: "ALMUERZO_COMPLETO",
    precio_sopa: "SOPA",
    precio_segundo: "SEGUNDO",
    precio_entrada: "ENTRADA",
    precio_refresco: "REFRESCO",
    precio_plato_extra: "PLATO_EXTRA",
    precio_vaso_extra_refresco: "VASO_EXTRA_REFRESCO",
};

const aliasPrecio = Object.fromEntries(
    Object.entries(camposPrecio).map(([campo, codigo]) => [codigo, campo]),
);

const validarPrecio = (valor, campo) => {
    const precio = Number(valor);
    const centavos = Math.round(precio * 100);
    if (!Number.isFinite(precio) || precio < 0 || !Number.isSafeInteger(centavos)
        || Math.abs(precio * 100 - centavos) > 1e-7) {
        throw Object.assign(new Error(`${campo} debe ser no negativo y tener como máximo dos decimales`), { status: 400 });
    }
    return centavos / 100;
};

const preciosVigentes = async (db = pool) => {
    const { rows } = await db.query(
        `SELECT codigo,precio,vigente_desde,vigente_hasta
         FROM precio_configurado
         ORDER BY codigo,vigente_desde DESC`,
    );
    const resultado = Object.fromEntries(
        Object.keys(camposPrecio).map((campo) => [campo, null]),
    );
    rows.filter((precio) => precio.vigente_hasta === null
        && new Date(precio.vigente_desde).getTime() <= Date.now()).forEach((precio) => {
        const campo = aliasPrecio[precio.codigo];
        if (campo) resultado[campo] = Number(precio.precio);
    });
    return { precios: resultado, registros: rows };
};

const obtener = async () => {
    const { rows: schema } = await pool.query(
        "SELECT to_regclass('public.precio_configurado') IS NOT NULL AS precios",
    );
    if (!schema[0]?.precios) {
        throw Object.assign(new Error("La configuración de precios requiere aplicar la migración 013_operacion_comercial_y_sectores.sql"), { status: 503 });
    }
    const { rows } = await pool.query("SELECT * FROM configuracion WHERE id_configuracion=1");
    if (!rows[0]) {
        throw Object.assign(new Error("No existe la configuración del sistema"), { status: 503 });
    }
    const { precios, registros } = await preciosVigentes();
    return { ...rows[0], ...precios, historial_precios: registros };
};

const actualizar = async (datos, idUsuario) => {
    const preciosSolicitados = Object.entries(camposPrecio)
        .filter(([campo]) => Object.prototype.hasOwnProperty.call(datos, campo))
        .map(([campo, codigo]) => ({
            campo,
            codigo,
            precio: datos[campo] === null || datos[campo] === "" ? null : validarPrecio(datos[campo], campo),
        }));

    let capacidad;
    if (Object.prototype.hasOwnProperty.call(datos, "capacidad_reservas")) {
        capacidad = datos.capacidad_reservas === null || datos.capacidad_reservas === ""
            ? null
            : Number(datos.capacidad_reservas);
        if (capacidad !== null && (!Number.isInteger(capacidad) || capacidad < 1)) {
            throw Object.assign(new Error("La capacidad de reservas debe ser un entero positivo o estar sin límite"), { status: 400 });
        }
    }

    if (!preciosSolicitados.length && capacidad === undefined) {
        throw Object.assign(new Error("No se proporcionaron campos de configuración válidos"), { status: 400 });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { rows: schema } = await client.query(
            "SELECT to_regclass('public.precio_configurado') IS NOT NULL AS precios",
        );
        if (!schema[0]?.precios) {
            throw Object.assign(new Error("La configuración de precios requiere aplicar la migración 013_operacion_comercial_y_sectores.sql"), { status: 503 });
        }

        if (capacidad !== undefined) {
            const result = await client.query(
                "UPDATE configuracion SET capacidad_reservas=$1,actualizado_en=NOW() WHERE id_configuracion=1",
                [capacidad],
            );
            if (!result.rowCount) throw Object.assign(new Error("No existe la configuración del sistema"), { status: 404 });
        }

        for (const { campo, codigo, precio } of preciosSolicitados) {
            await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`precio:${codigo}`]);
            const actual = await client.query(
                `SELECT id_precio,precio FROM precio_configurado
                 WHERE codigo=$1 AND vigente_hasta IS NULL
                 FOR UPDATE`,
                [codigo],
            );
            if (precio === null) {
                if (actual.rowCount) {
                    await client.query(
                        `UPDATE precio_configurado
                         SET vigente_hasta=GREATEST(clock_timestamp(),vigente_desde + INTERVAL '1 microsecond')
                         WHERE id_precio=$1`,
                        [actual.rows[0].id_precio],
                    );
                }
                continue;
            }
            if (actual.rowCount && Number(actual.rows[0].precio) === precio) continue;

            let vigenteDesde;
            if (actual.rowCount) {
                const cerrado = await client.query(
                    `UPDATE precio_configurado
                     SET vigente_hasta=GREATEST(clock_timestamp(),vigente_desde + INTERVAL '1 microsecond')
                     WHERE id_precio=$1
                     RETURNING vigente_hasta`,
                    [actual.rows[0].id_precio],
                );
                vigenteDesde = cerrado.rows[0].vigente_hasta;
            } else {
                const ahora = await client.query("SELECT clock_timestamp() AS ahora");
                vigenteDesde = ahora.rows[0].ahora;
            }
            await client.query(
                `INSERT INTO precio_configurado (codigo,precio,vigente_desde,id_usuario)
                 VALUES ($1,$2,$3,$4)`,
                [codigo, precio, vigenteDesde, idUsuario || null],
            );
            await client.query(
                `INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle)
                 VALUES ($1,'ACTUALIZAR_PRECIO','precio_configurado',$2,$3::jsonb)`,
                [idUsuario || null, codigo, JSON.stringify({ campo, precio, vigente_desde: vigenteDesde })],
            );
        }

        await client.query("COMMIT");
        return await obtener();
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export default { obtener, actualizar };
