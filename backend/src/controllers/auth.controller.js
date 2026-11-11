import authService from "../services/auth.service.js";

const login=async(req,res)=>{

try{

const resultado=await authService.login(req.body);

res.json(resultado);

}

catch(error){

res.status(error.status || 500).json({

mensaje:error.status ? error.message : "No se pudo iniciar sesión"

});

}

};

export default login;