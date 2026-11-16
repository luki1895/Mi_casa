import pool from "../config/db.js";

const obtener = async () => {
    const existente = await pool.query(
        "SELECT * FROM configuracion LIMIT 1",
    );

    if (existente.rows[0]) {
        return existente.rows[0];
    }

    const insertada = await pool.query(
        `INSERT INTO configuracion (
            id_configuracion,
            precio_almuerzo,
            precio_sopa,
            precio_segundo,
            precio_plato_extra,
            precio_entrada,
            precio_refresco
        )
        VALUES (1, 0, 0, 0, 0, 0, 0)
        ON CONFLICT (id_configuracion)
        DO NOTHING
        RETURNING *`
    );

    if (insertada.rows[0]) {
        return insertada.rows[0];
    }

    const resultado = await pool.query(
        "SELECT * FROM configuracion LIMIT 1",
    );

    return resultado.rows[0];

};

const actualizar = async (datos) => {
    const camposPrecio = [
        "precio_sopa",
        "precio_segundo",
        "precio_plato_extra",
        "precio_entrada",
        "precio_refresco",
    ];
    const campos = [];
    const valores = [];

    for (const campo of camposPrecio) {
        if (!Object.prototype.hasOwnProperty.call(datos, campo)) continue;
        const valor = Number(datos[campo]);
        if (!Number.isFinite(valor) || valor < 0) {
            throw Object.assign(new Error(`${campo} debe ser un número no negativo`), { status: 400 });
        }
        valores.push(valor);
        campos.push(`${campo}=$${valores.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(datos, "capacidad_reservas")) {
        const capacidad = datos.capacidad_reservas === null || datos.capacidad_reservas === ""
            ? null
            : Number(datos.capacidad_reservas);
        if (capacidad !== null && (!Number.isInteger(capacidad) || capacidad < 1)) {
            throw Object.assign(new Error("La capacidad de reservas debe ser un entero positivo o estar sin límite"), { status: 400 });
        }
        valores.push(capacidad);
        campos.push(`capacidad_reservas=$${valores.length}`);
    }

    if (!campos.length) {
        throw Object.assign(new Error("No se proporcionaron campos de configuración válidos"), { status: 400 });
    }

    const resultado = await pool.query(
        `UPDATE configuracion SET ${campos.join(", ")}, actualizado_en=NOW()
         WHERE id_configuracion=1 RETURNING *`,
        valores,
    );
    if (!resultado.rowCount) {
        throw Object.assign(new Error("No existe la configuración del sistema"), { status: 404 });
    }
    return resultado;
};

export default {

    obtener,

    actualizar

};