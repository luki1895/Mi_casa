export const subtotal=(cantidad,precio)=>{

return cantidad*precio;

};

export const total=(detalle)=>{

return detalle.reduce(

(a,b)=>a+b.subtotal,

0

);

};