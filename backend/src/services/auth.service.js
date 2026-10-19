import jwt from "jsonwebtoken";

import bcrypt from "bcrypt";

import authModel from "../models/auth.model.js";

const login=async(datos)=>{

const usuario=await authModel.buscarUsuario(datos.usuario);

if(!usuario){

throw new Error("Usuario incorrecto");

}

if (usuario.estado === false || String(usuario.estado).toUpperCase() === "INACTIVO") {
throw new Error("El usuario está desactivado");
}

const valido=await bcrypt.compare(

datos.password,

usuario.password

);

if(!valido){

throw new Error("Contraseña incorrecta");

}

const token=jwt.sign(

{

id:usuario.id_usuario,

rol:usuario.rol

},

process.env.JWT_SECRET,

{

expiresIn:"12h"

}

);

const usuarioPublico = { ...usuario };
delete usuarioPublico.password;

return{

token,

usuario: usuarioPublico

};

};

export default{

login

};