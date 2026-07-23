import pool from "../config/db.js";

const listar=async(fecha)=>{

const [rows]=await pool.query(

`

SELECT

pd.id_produccion,

pd.fecha,

ps.nombre AS sopa,

s1.nombre AS segundo1,

s2.nombre AS segundo2,

r.nombre AS refresco,

pe.nombre AS plato_extra,

pd.cantidad_sopa,

pd.cantidad_segundo1,

pd.cantidad_segundo2,

pd.cantidad_refresco,

pd.cantidad_extra

FROM produccion_diaria pd

LEFT JOIN producto ps ON pd.id_sopa=ps.id_producto

LEFT JOIN producto s1 ON pd.id_segundo1=s1.id_producto

LEFT JOIN producto s2 ON pd.id_segundo2=s2.id_producto

LEFT JOIN producto r ON pd.id_refresco=r.id_producto

LEFT JOIN producto pe ON pd.id_plato_extra=pe.id_producto

WHERE fecha=?

`,

[fecha]

);

return rows;

};

const crear=async(datos)=>{

const[resultado]=await pool.query(

`

INSERT INTO produccion_diaria

(

fecha,

id_sopa,

id_segundo1,

id_segundo2,

id_refresco,

id_plato_extra,

cantidad_sopa,

cantidad_segundo1,

cantidad_segundo2,

cantidad_refresco,

cantidad_extra

)

VALUES

(?,?,?,?,?,?,?,?,?,?,?)

`

,[

datos.fecha,

datos.id_sopa,

datos.id_segundo1,

datos.id_segundo2,

datos.id_refresco,

datos.id_plato_extra,

datos.cantidad_sopa,

datos.cantidad_segundo1,

datos.cantidad_segundo2,

datos.cantidad_refresco,

datos.cantidad_extra

]);

return resultado;

};

export default{

listar,

crear

};