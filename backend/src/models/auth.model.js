import pool from "../config/db.js";

const buscarUsuario=async(usuario)=>{

const[rows]=await pool.query(

`SELECT *

FROM usuario

WHERE usuario=?`,

[usuario]

);

return rows[0];

};

export default{

buscarUsuario

};