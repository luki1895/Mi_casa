import jwt from "jsonwebtoken";

import bcrypt from "bcrypt";

import authModel from "../models/auth.model.js";

const login=async(datos)=>{

const usuario=await authModel.buscarUsuario(datos.usuario);

if(!usuario){

throw Object.assign(new Error("Usuario o contraseña incorrectos"), { status: 401 });

}

if (usuario.estado === false || String(usuario.estado).toUpperCase() === "INACTIVO") {
throw Object.assign(new Error("El usuario está desactivado"), { status: 403 });
}

const valido=await bcrypt.compare(

datos.password,

usuario.password

);

if(!valido){

throw Object.assign(new Error("Usuario o contraseña incorrectos"), { status: 401 });

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