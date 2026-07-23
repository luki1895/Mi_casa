import pool from "../config/db.js";

const listar=async()=>{

const[rows]=await pool.query(

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

const crear=async(datos)=>{

const[resultado]=await pool.query(

`

INSERT INTO pedido

(

id_cliente,

id_usuario,

fecha,

tipo_cliente,

estado,

total

)

VALUES

(?,?,?,?,?,?)

`

,[

datos.id_cliente,

datos.id_usuario,

datos.fecha,

datos.tipo_cliente,

"PENDIENTE",

datos.total

]);

return resultado.insertId;

};

export default{

listar,

crear

};