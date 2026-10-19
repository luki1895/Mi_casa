import pool from "../config/db.js";

const listarProductos = async () => {
	const { rows } = await pool.query("SELECT id_producto, nombre FROM producto ORDER BY nombre ASC");
	return rows;
};

const listarMenu = async (fecha, db = pool, incluirAgotados = false) => {
	const { rows } = await db.query(
		`
		WITH menu AS (
			SELECT pd.id_sopa AS id_producto, 'Sopa' AS categoria,
				   pd.cantidad_sopa AS producido, c.precio_sopa AS precio
			FROM produccion_diaria pd CROSS JOIN configuracion c
			WHERE pd.fecha = $1 AND pd.id_sopa IS NOT NULL
			UNION ALL
			SELECT pd.id_segundo1, 'Segundo', pd.cantidad_segundo1, c.precio_segundo
			FROM produccion_diaria pd CROSS JOIN configuracion c
			WHERE pd.fecha = $1 AND pd.id_segundo1 IS NOT NULL
			UNION ALL
			SELECT pd.id_segundo2, 'Segundo', pd.cantidad_segundo2, c.precio_segundo
			FROM produccion_diaria pd CROSS JOIN configuracion c
			WHERE pd.fecha = $1 AND pd.id_segundo2 IS NOT NULL
			UNION ALL
			SELECT pd.id_entrada, 'Entrada', pd.cantidad_entrada, c.precio_entrada
			FROM produccion_diaria pd CROSS JOIN configuracion c
			WHERE pd.fecha = $1 AND pd.id_entrada IS NOT NULL
			UNION ALL
			SELECT pd.id_refresco, 'Refresco', pd.cantidad_refresco, c.precio_refresco
			FROM produccion_diaria pd CROSS JOIN configuracion c
			WHERE pd.fecha = $1 AND pd.id_refresco IS NOT NULL
			UNION ALL
			SELECT pd.id_plato_extra, 'Extra', pd.cantidad_extra,
			       COALESCE(pd.precio_extra, c.precio_plato_extra)
			FROM produccion_diaria pd CROSS JOIN configuracion c
			WHERE pd.fecha = $1 AND pd.id_plato_extra IS NOT NULL
		)
		SELECT m.id_producto, p.nombre, m.categoria, m.precio,
		       m.producido AS preparados,
		       COALESCE(SUM(dp.cantidad) FILTER (WHERE pe.pagado IS TRUE), 0) AS vendidos,
		       COALESCE(SUM(dp.cantidad) FILTER (WHERE pe.id_pedido IS NOT NULL AND pe.pagado IS FALSE), 0)
		       + COALESCE((
		           SELECT SUM((item->>'cantidad')::integer)
		           FROM solicitud_adicional sa
		           CROSS JOIN LATERAL jsonb_array_elements(sa.detalle) item
		           WHERE sa.estado='PENDIENTE' AND sa.fecha::date=$1::date
		             AND (item->>'id_producto')::integer=m.id_producto
		       ),0) AS reservados,
		       GREATEST(m.producido - COALESCE(SUM(
		           CASE WHEN pe.id_pedido IS NOT NULL THEN dp.cantidad ELSE 0 END
		       ), 0) - COALESCE((
		           SELECT SUM((item->>'cantidad')::integer)
		           FROM solicitud_adicional sa
		           CROSS JOIN LATERAL jsonb_array_elements(sa.detalle) item
		           WHERE sa.estado='PENDIENTE' AND sa.fecha::date=$1::date
		             AND (item->>'id_producto')::integer=m.id_producto
		       ),0), 0) AS stock
		FROM menu m
		INNER JOIN producto p ON p.id_producto = m.id_producto
		LEFT JOIN detalle_pedido dp ON dp.id_producto = m.id_producto
		LEFT JOIN pedido pe ON pe.id_pedido = dp.id_pedido
		                    AND pe.fecha::date = $1::date
		                    AND UPPER(pe.estado) NOT LIKE 'CANCEL%'
		GROUP BY m.id_producto, p.nombre, m.categoria, m.precio, m.producido
		${incluirAgotados ? "" : "HAVING GREATEST(m.producido - COALESCE(SUM(CASE WHEN pe.id_pedido IS NOT NULL THEN dp.cantidad ELSE 0 END), 0) - COALESCE((SELECT SUM((item->>'cantidad')::integer) FROM solicitud_adicional sa CROSS JOIN LATERAL jsonb_array_elements(sa.detalle) item WHERE sa.estado='PENDIENTE' AND sa.fecha::date=$1::date AND (item->>'id_producto')::integer=m.id_producto),0), 0) > 0"}
		ORDER BY m.categoria, p.nombre
		`,
		[fecha]
	);

	return rows;
};

const listar=async(fecha)=>{

const { rows } = await pool.query(

`

SELECT

pd.id_produccion,

pd.fecha,

pd.id_sopa,

pd.id_segundo1,

pd.id_segundo2,

pd.id_entrada,

pd.id_refresco,

pd.id_plato_extra,

ps.nombre AS sopa,

s1.nombre AS segundo1,

s2.nombre AS segundo2,

en.nombre AS entrada,

r.nombre AS refresco,

pe.nombre AS plato_extra,

pd.cantidad_sopa,

pd.cantidad_segundo1,

pd.cantidad_segundo2,

pd.cantidad_entrada,

pd.cantidad_refresco,

pd.cantidad_extra

FROM produccion_diaria pd

LEFT JOIN producto ps ON pd.id_sopa=ps.id_producto

LEFT JOIN producto s1 ON pd.id_segundo1=s1.id_producto

LEFT JOIN producto s2 ON pd.id_segundo2=s2.id_producto

LEFT JOIN producto en ON pd.id_entrada=en.id_producto

LEFT JOIN producto r ON pd.id_refresco=r.id_producto

LEFT JOIN producto pe ON pd.id_plato_extra=pe.id_producto

WHERE fecha=$1

`,

[fecha]

);

return rows;

};

const crear=async(datos, idUsuario)=>{
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`menu:${datos.fecha}`]);
		const menuActual = await listarMenu(datos.fecha, client, true);
		const cantidadesNuevas = new Map();
		[
			[datos.id_sopa, datos.cantidad_sopa],
			[datos.id_segundo1, datos.cantidad_segundo1],
			[datos.id_segundo2, datos.cantidad_segundo2],
			[datos.id_entrada, datos.cantidad_entrada],
			[datos.id_refresco, datos.cantidad_refresco],
			[datos.id_plato_extra, datos.cantidad_extra],
		].forEach(([idProducto, cantidad]) => {
			if (idProducto) cantidadesNuevas.set(Number(idProducto), (cantidadesNuevas.get(Number(idProducto)) || 0) + Number(cantidad || 0));
		});
		for (const plato of menuActual) {
			const comprometido = Number(plato.vendidos || 0) + Number(plato.reservados || 0);
			if ((cantidadesNuevas.get(Number(plato.id_producto)) || 0) < comprometido) {
				throw new Error(`No se puede reducir la producción de ${plato.nombre}: hay ${comprometido} unidades vendidas o reservadas.`);
			}
		}
		const existente = await client.query(
			"SELECT id_produccion FROM produccion_diaria WHERE fecha = $1 FOR UPDATE",
			[datos.fecha]
		);
		const valores = [
			datos.fecha,
			datos.id_sopa || null,
			datos.id_segundo1 || null,
			datos.id_segundo2 || null,
			datos.id_entrada || null,
			datos.id_refresco || null,
			datos.id_plato_extra || null,
			Number(datos.cantidad_sopa || 0),
			Number(datos.cantidad_segundo1 || 0),
			Number(datos.cantidad_segundo2 || 0),
			Number(datos.cantidad_entrada || 0),
			Number(datos.cantidad_refresco || 0),
			Number(datos.cantidad_extra || 0),
			datos.precio_extra == null ? null : Number(datos.precio_extra),
		];
		let resultado;
		if (existente.rowCount) {
			resultado = await client.query(
				`UPDATE produccion_diaria SET
				 id_sopa=$2, id_segundo1=$3, id_segundo2=$4, id_entrada=$5,
				 id_refresco=$6, id_plato_extra=$7, cantidad_sopa=$8,
				 cantidad_segundo1=$9, cantidad_segundo2=$10, cantidad_entrada=$11,
				 cantidad_refresco=$12, cantidad_extra=$13, precio_extra=$14
				 WHERE id_produccion=$15 RETURNING id_produccion`,
				[...valores, existente.rows[0].id_produccion]
			);
		} else {
			resultado = await client.query(
				`INSERT INTO produccion_diaria
				 (fecha,id_sopa,id_segundo1,id_segundo2,id_entrada,id_refresco,id_plato_extra,
				  cantidad_sopa,cantidad_segundo1,cantidad_segundo2,cantidad_entrada,
				  cantidad_refresco,cantidad_extra,precio_extra)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
				 RETURNING id_produccion`,
				valores
			);
		}
		await client.query(
			"INSERT INTO bitacora_operaciones (id_usuario, accion, entidad, id_entidad, detalle) VALUES ($1, $2, $3, $4, $5)",
			[idUsuario, existente.rowCount ? "ACTUALIZAR" : "CREAR", "produccion_diaria", resultado.rows[0].id_produccion, JSON.stringify(datos)]
		);
		await client.query("COMMIT");
		return resultado.rows[0];
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
};

export default{

listar,

listarProductos,

listarMenu,

crear

};