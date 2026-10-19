import pool from "../config/db.js";

const buscarUsuario=async(usuario)=>{

const { rows } = await pool.query(

`SELECT id_usuario, usuario, password, rol, estado, id_cliente
FROM usuario
WHERE usuario=$1`,

[usuario]

);

return rows[0];

};

export default{

buscarUsuario

};