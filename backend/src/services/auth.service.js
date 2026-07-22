import jwt from "jsonwebtoken";

import bcrypt from "bcrypt";

import authModel from "../models/auth.model.js";

const login=async(datos)=>{

const usuario=await authModel.buscarUsuario(datos.usuario);

if(!usuario){

throw new Error("Usuario incorrecto");

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

return{

token,

usuario

};

};

export default{

login

};