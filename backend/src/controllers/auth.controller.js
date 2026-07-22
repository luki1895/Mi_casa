import authService from "../services/auth.service.js";

const login=async(req,res)=>{

try{

const resultado=await authService.login(req.body);

res.json(resultado);

}

catch(error){

res.status(401).json({

mensaje:error.message

});

}

};

export default login;