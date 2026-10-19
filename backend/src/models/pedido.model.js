import pool from "../config/db.js";

const listar=async()=>{

const { rows } = await pool.query(

`

SELECT

p.id_pedido,

c.nombre,

p.fecha,

p.estado,

p.total

FROM pedido p

INNER JOIN cliente c

ON c.id_cliente=p.id_cliente

ORDER BY p.id_pedido DESC

`

);

return rows;

};

const listarPorUsuario = async (idUsuario) => {
	const { rows } = await pool.query(
		`
		SELECT p.id_pedido, c.nombre AS cliente, p.fecha, p.estado, p.total,
		       p.pagado, p.observaciones,
		       COALESCE(json_agg(json_build_object(
		           'id_producto', pr.id_producto, 'nombre', pr.nombre,
		           'cantidad', dp.cantidad, 'precio', dp.precio, 'subtotal', dp.subtotal
		       )) FILTER (WHERE dp.id_pedido IS NOT NULL), '[]') AS detalle
		FROM pedido p
		INNER JOIN cliente c ON c.id_cliente = p.id_cliente
		LEFT JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
		LEFT JOIN producto pr ON pr.id_producto = dp.id_producto
		WHERE p.id_usuario = $1
		GROUP BY p.id_pedido, c.nombre
		ORDER BY p.fecha DESC, p.id_pedido DESC
		LIMIT 100
		`,
		[idUsuario]
	);
	return rows;
};

const listarActivos = async () => {
	const { rows } = await pool.query(
		`SELECT p.id_pedido, c.nombre AS cliente, p.fecha, p.estado, p.total,
		        p.pagado, p.observaciones,
		        COALESCE(json_agg(json_build_object(
		            'id_producto', pr.id_producto, 'nombre', pr.nombre,
		            'cantidad', dp.cantidad, 'precio', dp.precio, 'subtotal', dp.subtotal
		        )) FILTER (WHERE dp.id_pedido IS NOT NULL), '[]') AS detalle
		 FROM pedido p
		 INNER JOIN cliente c ON c.id_cliente = p.id_cliente
		 LEFT JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
		 LEFT JOIN producto pr ON pr.id_producto = dp.id_producto
		 WHERE UPPER(p.estado) NOT IN ('ENTREGADO', 'CANCELADO', 'CANCELADA')
		 GROUP BY p.id_pedido, c.nombre
		 ORDER BY p.fecha ASC, p.id_pedido ASC`
	);
	return rows;
};

const obtener = async (idPedido) => {
	const { rows } = await pool.query(
		`SELECT p.id_pedido, p.id_cliente, c.nombre AS cliente, c.tipo_cliente,
		        p.fecha, p.estado, p.total, p.pagado, p.observaciones,
		        COALESCE(json_agg(json_build_object(
		            'id_producto', pr.id_producto, 'nombre', pr.nombre,
		            'cantidad', dp.cantidad, 'precio', dp.precio, 'subtotal', dp.subtotal
		        )) FILTER (WHERE dp.id_pedido IS NOT NULL), '[]') AS detalle
		 FROM pedido p
		 INNER JOIN cliente c ON c.id_cliente = p.id_cliente
		 LEFT JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
		 LEFT JOIN producto pr ON pr.id_producto = dp.id_producto
		 WHERE p.id_pedido = $1
		 GROUP BY p.id_pedido, c.nombre, c.tipo_cliente`,
		[idPedido]
	);
	return rows[0];
};

const actualizarEstado = async (idPedido, estado, idUsuario, rol) => {
	const nuevoEstado = String(estado || "").toUpperCase();
	if (!["PENDIENTE", "EN_PREPARACION", "LISTO", "ENTREGADO", "CANCELADO"].includes(nuevoEstado)) {
		throw Object.assign(new Error("Estado de pedido no válido"), { status: 400 });
	}
	if (String(rol || "").trim().toLowerCase().includes("mesero") && nuevoEstado !== "ENTREGADO") {
		throw Object.assign(new Error("El mesero solo puede marcar pedidos listos como entregados"), { status: 403 });
	}
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const actual = await client.query("SELECT estado,pagado FROM pedido WHERE id_pedido=$1 FOR UPDATE", [idPedido]);
		if (!actual.rowCount) throw Object.assign(new Error("Pedido no encontrado"), { status: 404 });
		const estadoActual = String(actual.rows[0].estado).toUpperCase();
		const transiciones = {
			PENDIENTE: ["EN_PREPARACION", "CANCELADO"],
			EN_PREPARACION: ["LISTO"],
			LISTO: ["ENTREGADO"],
			ENTREGADO: [],
			CANCELADO: [],
		};
		if (!transiciones[estadoActual]?.includes(nuevoEstado)) throw Object.assign(new Error(`No se permite pasar de ${estadoActual} a ${nuevoEstado}`), { status: 409 });
		if (nuevoEstado === "CANCELADO" && actual.rows[0].pagado) throw Object.assign(new Error("Un pedido pagado no se cancela ni se elimina sin un proceso de devolución"), { status: 409 });
		await client.query("UPDATE pedido SET estado=$1 WHERE id_pedido=$2", [nuevoEstado,idPedido]);
		await client.query(
			"INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle) VALUES ($1,'CAMBIAR_ESTADO','pedido',$2,$3)",
			[idUsuario,idPedido,JSON.stringify({ anterior: estadoActual, nuevo: nuevoEstado })]
		);
		await client.query("COMMIT");
		return { id_pedido: Number(idPedido), estado: nuevoEstado };
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
};

const crear=async(datos, db = pool)=>{

const resultado = await db.query(

`

INSERT INTO pedido

(

id_cliente,

id_usuario,

fecha,

tipo_cliente,

estado,

total,

observaciones,

pagado

)

VALUES

($1,$2,$3,$4,$5,$6,$7,$8)

RETURNING id_pedido
`

,[

datos.id_cliente,

datos.id_usuario,

datos.fecha || new Date(),

datos.tipo_cliente,

"PENDIENTE",

datos.total

,datos.observaciones || null

,false

]);

return resultado.rows[0].id_pedido;

};

export default{

listar,

listarPorUsuario,

listarActivos,

obtener,

actualizarEstado,

crear

};