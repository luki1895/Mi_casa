import pool from "../config/db.js";

const listarProductos = async () => {
	const { rows } = await pool.query(
		"SELECT id_producto, nombre, categoria FROM producto WHERE activo IS TRUE ORDER BY nombre ASC"
	);
	return rows;
};

const listarMenu = async (fecha, db = pool, incluirAgotados = false) => {
	const { rows: [capacidades] } = await db.query(
		`SELECT
		    EXISTS (SELECT 1 FROM information_schema.columns
		            WHERE table_schema='public' AND table_name='producto' AND column_name='imagen_url') AS tiene_imagen,
		    to_regclass('public.reserva_plato') IS NOT NULL
		        AND to_regclass('public.detalle_reserva_plato') IS NOT NULL AS tiene_reservas_platos,
		    to_regclass('public.precio_configurado') IS NOT NULL AS tiene_precios,
		    EXISTS (SELECT 1 FROM information_schema.columns
		            WHERE table_schema='public' AND table_name='producto' AND column_name='codigo_venta') AS tiene_producto_codigo,
		    (SELECT COUNT(*)=2 FROM information_schema.columns
		     WHERE table_schema='public' AND table_name='detalle_pedido'
		       AND column_name=ANY(ARRAY['id_sopa_componente','id_segundo_componente'])) AS tiene_componentes_completo,
		    EXISTS (SELECT 1 FROM information_schema.columns
		            WHERE table_schema='public' AND table_name='movimiento_pensionado'
		              AND column_name='tipo_producto') AS tiene_movimientos_pensionados`
	);
	if (!capacidades.tiene_precios || !capacidades.tiene_producto_codigo
		|| !capacidades.tiene_componentes_completo || !capacidades.tiene_movimientos_pensionados) {
		throw Object.assign(new Error("El menú con precios vigentes requiere aplicar la migración 013_operacion_comercial_y_sectores.sql"), { status: 503 });
	}
	const reservaCte = capacidades.tiene_reservas_platos
		? `reservas AS (
			SELECT dr.id_producto, SUM(dr.cantidad) AS cantidad
			FROM detalle_reserva_plato dr
			INNER JOIN reserva_plato rp ON rp.id_reserva = dr.id_reserva
			WHERE rp.fecha = $1::date
			  AND rp.estado = 'PENDIENTE'
			  AND rp.id_pedido IS NULL
			GROUP BY dr.id_producto
		)`
		: "reservas AS (SELECT NULL::bigint AS id_producto, NULL::numeric AS cantidad WHERE FALSE)";
	const imagenSelect = capacidades.tiene_imagen ? "p.imagen_url" : "NULL::text AS imagen_url";
	const { rows } = await db.query(
		`
		WITH menu AS (
			SELECT pd.id_sopa AS id_producto, 'Sopa' AS categoria,
				   pd.cantidad_sopa AS producido,
				   (SELECT precio FROM precio_configurado WHERE codigo='SOPA' AND vigente_hasta IS NULL AND vigente_desde<=NOW()) AS precio
			FROM produccion_diaria pd
			WHERE pd.fecha = $1 AND pd.id_sopa IS NOT NULL
			UNION ALL
			SELECT pd.id_segundo1, 'Segundo', pd.cantidad_segundo1,
			       (SELECT precio FROM precio_configurado WHERE codigo='SEGUNDO' AND vigente_hasta IS NULL AND vigente_desde<=NOW())
			FROM produccion_diaria pd
			WHERE pd.fecha = $1 AND pd.id_segundo1 IS NOT NULL
			UNION ALL
			SELECT pd.id_segundo2, 'Segundo', pd.cantidad_segundo2,
			       (SELECT precio FROM precio_configurado WHERE codigo='SEGUNDO' AND vigente_hasta IS NULL AND vigente_desde<=NOW())
			FROM produccion_diaria pd
			WHERE pd.fecha = $1 AND pd.id_segundo2 IS NOT NULL
			UNION ALL
			SELECT pd.id_entrada, 'Entrada', pd.cantidad_entrada,
			       (SELECT precio FROM precio_configurado WHERE codigo='ENTRADA' AND vigente_hasta IS NULL AND vigente_desde<=NOW())
			FROM produccion_diaria pd
			WHERE pd.fecha = $1 AND pd.id_entrada IS NOT NULL
			UNION ALL
			SELECT pd.id_refresco, 'Refresco', pd.cantidad_refresco,
			       (SELECT precio FROM precio_configurado WHERE codigo='REFRESCO' AND vigente_hasta IS NULL AND vigente_desde<=NOW())
			FROM produccion_diaria pd
			WHERE pd.fecha = $1 AND pd.id_refresco IS NOT NULL
			UNION ALL
			SELECT pd.id_plato_extra, 'Extra', pd.cantidad_extra,
			       COALESCE(pd.precio_extra, (
			           SELECT precio FROM precio_configurado WHERE codigo='PLATO_EXTRA' AND vigente_hasta IS NULL AND vigente_desde<=NOW()
			       ))
			FROM produccion_diaria pd
			WHERE pd.fecha = $1 AND pd.id_plato_extra IS NOT NULL
		),
		menu_agregado AS (
			SELECT id_producto, categoria, SUM(producido) AS producido, MAX(precio) AS precio
			FROM menu
			GROUP BY id_producto, categoria
		),
		consumos_pedido AS (
			SELECT dp.id_producto,dp.cantidad,pe.pagado,pe.estado,pe.id_pedido
			FROM detalle_pedido dp
			INNER JOIN pedido pe ON pe.id_pedido=dp.id_pedido
			WHERE dp.id_sopa_componente IS NULL AND dp.id_segundo_componente IS NULL
			UNION ALL
			SELECT dp.id_sopa_componente,dp.cantidad,pe.pagado,pe.estado,pe.id_pedido
			FROM detalle_pedido dp
			INNER JOIN pedido pe ON pe.id_pedido=dp.id_pedido
			WHERE dp.id_sopa_componente IS NOT NULL
			UNION ALL
			SELECT dp.id_segundo_componente,dp.cantidad,pe.pagado,pe.estado,pe.id_pedido
			FROM detalle_pedido dp
			INNER JOIN pedido pe ON pe.id_pedido=dp.id_pedido
			WHERE dp.id_segundo_componente IS NOT NULL
		),
		pedidos AS (
			SELECT cp.id_producto,
			       SUM(cp.cantidad) FILTER (WHERE cp.pagado IS TRUE) AS vendidos,
			       SUM(cp.cantidad) FILTER (
			           WHERE UPPER(cp.estado) NOT IN ('CANCELADO', 'CANCELADA')
			       ) AS comprometidos
			FROM consumos_pedido cp
			WHERE cp.id_pedido IS NOT NULL
			  AND cp.id_pedido IN (SELECT id_pedido FROM pedido WHERE fecha::date=$1::date)
			GROUP BY cp.id_producto
		),
		pensionados AS (
			SELECT consumo.id_producto,SUM(consumo.cantidad) AS cantidad
			FROM movimiento_pensionado mp
			INNER JOIN produccion_diaria pd ON pd.fecha=$1::date
			CROSS JOIN LATERAL (
				VALUES
					(CASE WHEN mp.tipo_producto='SOPA' THEN pd.id_sopa END,mp.cantidad),
					(CASE WHEN mp.tipo_producto='SEGUNDO_POLLO' THEN pd.id_segundo1 END,mp.cantidad),
					(CASE WHEN mp.tipo_producto='SEGUNDO_CARNE' THEN pd.id_segundo2 END,mp.cantidad)
			) AS consumo(id_producto,cantidad)
			WHERE mp.fecha::date=$1::date
			  AND mp.tipo_movimiento='CONSUMO'
			  AND mp.tipo_producto IN ('SOPA','SEGUNDO_POLLO','SEGUNDO_CARNE')
			  AND consumo.id_producto IS NOT NULL
			GROUP BY consumo.id_producto
		),
		consumos_adicionales AS (
			SELECT (item->>'id_producto')::bigint AS id_producto,
			       (item->>'cantidad')::integer AS cantidad
			FROM solicitud_adicional sa
			CROSS JOIN LATERAL jsonb_array_elements(sa.detalle) item
			WHERE sa.estado = 'PENDIENTE' AND sa.fecha::date = $1::date
			  AND item->>'id_sopa_componente' IS NULL
			UNION ALL
			SELECT (item->>'id_sopa_componente')::bigint,(item->>'cantidad')::integer
			FROM solicitud_adicional sa
			CROSS JOIN LATERAL jsonb_array_elements(sa.detalle) item
			WHERE sa.estado = 'PENDIENTE' AND sa.fecha::date = $1::date
			  AND item->>'id_sopa_componente' IS NOT NULL
			UNION ALL
			SELECT (item->>'id_segundo_componente')::bigint,(item->>'cantidad')::integer
			FROM solicitud_adicional sa
			CROSS JOIN LATERAL jsonb_array_elements(sa.detalle) item
			WHERE sa.estado = 'PENDIENTE' AND sa.fecha::date = $1::date
			  AND item->>'id_segundo_componente' IS NOT NULL
		),
		adicionales AS (
			SELECT id_producto,SUM(cantidad) AS cantidad
			FROM consumos_adicionales
			GROUP BY id_producto
		),
		${reservaCte}
		SELECT m.id_producto, p.nombre, p.descripcion, ${imagenSelect}, m.categoria, m.precio,
		       m.producido AS preparados,
		       COALESCE(pd.vendidos, 0) AS vendidos,
		       COALESCE(ad.cantidad, 0) + COALESCE(rp.cantidad, 0)
		           + COALESCE(pn.cantidad, 0) AS reservados,
		       COALESCE(pn.cantidad, 0) AS consumidos_pensionados,
		       COALESCE(pd.comprometidos, 0) + COALESCE(ad.cantidad, 0)
		           + COALESCE(rp.cantidad, 0) + COALESCE(pn.cantidad, 0) AS comprometidos,
		       GREATEST(m.producido - COALESCE(pd.comprometidos, 0)
		           - COALESCE(ad.cantidad, 0) - COALESCE(rp.cantidad, 0)
		           - COALESCE(pn.cantidad, 0), 0) AS stock
		FROM menu_agregado m
		INNER JOIN producto p ON p.id_producto = m.id_producto AND p.activo IS TRUE
		LEFT JOIN pedidos pd ON pd.id_producto = m.id_producto
		LEFT JOIN pensionados pn ON pn.id_producto = m.id_producto
		LEFT JOIN adicionales ad ON ad.id_producto = m.id_producto
		LEFT JOIN reservas rp ON rp.id_producto = m.id_producto
		ORDER BY m.categoria, p.nombre
		`,
		[fecha]
	);

	const { rows: ofertas } = await db.query(
		`SELECT pd.id_sopa,pd.id_segundo1,pd.id_segundo2,pd.id_refresco,
		        sopa.nombre AS nombre_sopa,segundo1.nombre AS nombre_segundo1,
		        segundo2.nombre AS nombre_segundo2,refresco.nombre AS refresco_acompanamiento,
		        completo.id_producto AS id_producto_completo,completo.nombre AS nombre_completo,
		        precio.precio AS precio_completo
		 FROM produccion_diaria pd
		 LEFT JOIN producto sopa ON sopa.id_producto=pd.id_sopa AND sopa.activo IS TRUE
		 LEFT JOIN producto segundo1 ON segundo1.id_producto=pd.id_segundo1 AND segundo1.activo IS TRUE
		 LEFT JOIN producto segundo2 ON segundo2.id_producto=pd.id_segundo2 AND segundo2.activo IS TRUE
		 LEFT JOIN producto refresco ON refresco.id_producto=pd.id_refresco AND refresco.activo IS TRUE
		 LEFT JOIN producto completo ON completo.codigo_venta='ALMUERZO_COMPLETO' AND completo.activo IS TRUE
		 LEFT JOIN precio_configurado precio
		   ON precio.codigo='ALMUERZO_COMPLETO' AND precio.vigente_hasta IS NULL AND precio.vigente_desde<=NOW()
		 WHERE pd.fecha=$1
		 LIMIT 1`,
		[fecha],
	);
	const menuPorProducto = new Map(rows.map((item) => [Number(item.id_producto), item]));
	const resultado = rows.map((item) => ({ ...item, tipo_venta: "PRODUCTO" }));
	const oferta = ofertas[0];
	if (oferta?.id_producto_completo && oferta.id_sopa) {
		const sopa = menuPorProducto.get(Number(oferta.id_sopa));
		for (const [idSegundo, nombreSegundo] of [
			[oferta.id_segundo1, oferta.nombre_segundo1],
			[oferta.id_segundo2, oferta.nombre_segundo2],
		]) {
			const segundo = menuPorProducto.get(Number(idSegundo));
			if (!sopa || !segundo || !idSegundo) continue;
			resultado.push({
				id_producto: Number(oferta.id_producto_completo),
				nombre: oferta.nombre_completo,
				categoria: "Almuerzo completo",
				precio: oferta.precio_completo === null ? null : Number(oferta.precio_completo),
				stock: Math.min(Number(sopa.stock), Number(segundo.stock)),
				preparados: Math.min(Number(sopa.preparados), Number(segundo.preparados)),
				vendidos: Math.min(Number(sopa.vendidos), Number(segundo.vendidos)),
				comprometidos: Math.min(Number(sopa.comprometidos), Number(segundo.comprometidos)),
				tipo_venta: "ALMUERZO_COMPLETO",
				id_sopa_componente: Number(oferta.id_sopa),
				id_segundo_elegido: Number(idSegundo),
				segundo_elegido: nombreSegundo,
				refresco_acompanamiento: oferta.refresco_acompanamiento || null,
				inventario_controlado: true,
			});
		}
	}

	const { rows: vasoExtra } = await db.query(
		`SELECT p.id_producto,p.nombre,precio.precio
		 FROM producto p
		 LEFT JOIN precio_configurado precio
		   ON precio.codigo='VASO_EXTRA_REFRESCO' AND precio.vigente_hasta IS NULL AND precio.vigente_desde<=NOW()
		 WHERE p.codigo_venta='VASO_EXTRA_REFRESCO' AND p.activo IS TRUE`,
	);
	if (vasoExtra[0]) {
		resultado.push({
			id_producto: Number(vasoExtra[0].id_producto),
			nombre: vasoExtra[0].nombre,
			categoria: "Adicional",
			precio: vasoExtra[0].precio === null ? null : Number(vasoExtra[0].precio),
			stock: null,
			tipo_venta: "VASO_EXTRA_REFRESCO",
			inventario_controlado: false,
		});
	}

	return resultado.filter((item) => (
		(incluirAgotados || item.stock === null || Number(item.stock) > 0)
	));
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
	const fecha = String(datos.fecha || "");
	const fechaParseada = new Date(`${fecha}T00:00:00Z`);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)
		|| Number.isNaN(fechaParseada.getTime())
		|| fechaParseada.toISOString().slice(0, 10) !== fecha) {
		throw Object.assign(new Error("La fecha de producción no es válida"), { status: 400 });
	}
	const campos = [
		["SOPA", datos.id_sopa, datos.cantidad_sopa],
		["SEGUNDO", datos.id_segundo1, datos.cantidad_segundo1],
		["SEGUNDO", datos.id_segundo2, datos.cantidad_segundo2],
		["ENTRADA", datos.id_entrada, datos.cantidad_entrada],
		["REFRESCO", datos.id_refresco, datos.cantidad_refresco],
		["EXTRA", datos.id_plato_extra, datos.cantidad_extra],
	];
	for (const [categoria, idProducto, cantidad] of campos) {
		const unidades = Number(cantidad ?? 0);
		if (!Number.isInteger(unidades) || unidades < 0 || (!idProducto && unidades !== 0)) {
			throw Object.assign(new Error("Las cantidades deben ser enteros no negativos asociados a un producto"), { status: 400 });
		}
		if (idProducto && (!Number.isInteger(Number(idProducto)) || Number(idProducto) < 1)) {
			throw Object.assign(new Error("El producto seleccionado no es válido"), { status: 400 });
		}
	}
	if (datos.precio_extra !== undefined && datos.precio_extra !== null) {
		const precioExtra = Number(datos.precio_extra);
		if (!Number.isFinite(precioExtra) || precioExtra < 0 || Math.round(precioExtra * 100) / 100 !== precioExtra) {
			throw Object.assign(new Error("El precio especial debe ser no negativo y tener como máximo dos decimales"), { status: 400 });
		}
	}
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`menu:${fecha}`]);
		for (const [categoria, idProducto] of campos) {
			if (!idProducto) continue;
			const producto = await client.query(
				"SELECT categoria, activo FROM producto WHERE id_producto=$1 FOR SHARE",
				[idProducto]
			);
			if (!producto.rowCount || producto.rows[0].activo !== true || producto.rows[0].categoria !== categoria) {
				throw Object.assign(new Error(`El producto debe estar activo y pertenecer a la categoría ${categoria}`), { status: 400 });
			}
		}
		const menuActual = await listarMenu(fecha, client, true);
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
			if (plato.tipo_venta !== "PRODUCTO") continue;
			const comprometido = Number(plato.comprometidos || 0);
			if ((cantidadesNuevas.get(Number(plato.id_producto)) || 0) < comprometido) {
				throw Object.assign(
					new Error(`No se puede reducir la producción de ${plato.nombre}: hay ${comprometido} unidades vendidas o reservadas.`),
					{ status: 409 },
				);
			}
		}
		const existente = await client.query(
			"SELECT id_produccion FROM produccion_diaria WHERE fecha = $1 FOR UPDATE",
			[datos.fecha]
		);
		const valores = [
			fecha,
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
				 fecha=$1, id_sopa=$2, id_segundo1=$3, id_segundo2=$4, id_entrada=$5,
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