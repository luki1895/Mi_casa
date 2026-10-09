import pool from "../config/db.js";

const crear=async(idPedido,detalle)=>{

for(const item of detalle){

await pool.query(

`

INSERT INTO detalle_pedido

(

id_pedido,

id_producto,

cantidad,

precio,

subtotal

)

VALUES

($1,$2,$3,$4,$5)

`

,[

idPedido,

item.id_producto,

item.cantidad,

item.precio,

item.subtotal

]);

}

};

export default{

crear

};