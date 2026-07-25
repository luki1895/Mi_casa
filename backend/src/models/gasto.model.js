import pool from "../config/db.js";

const listar=async()=>{

const[rows]=await pool.query(

`

SELECT *

FROM gasto

ORDER BY fecha DESC

`

);

return rows;

};

const crear=async(datos)=>{

const[resultado]=await pool.query(

`

INSERT INTO gasto

(

fecha,

concepto,

cantidad,

precio_unitario,

total

)

VALUES

(

NOW(),

?,

?,

?,

?

)

`

,[

datos.concepto,

datos.cantidad,

datos.precio_unitario,

datos.total

]);

return resultado;

};

export default{

listar,

crear

};