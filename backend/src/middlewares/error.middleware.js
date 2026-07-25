const errorMiddleware=(err,req,res,next)=>{

console.error(err);

return res.status(500).json({

ok:false,

mensaje:"Error interno del servidor"

});

};

export default errorMiddleware;