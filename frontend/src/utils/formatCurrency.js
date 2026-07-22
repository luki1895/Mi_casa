export default function formatCurrency(numero){

return new Intl.NumberFormat(

"es-BO",

{

style:"currency",

currency:"BOB"

}

).format(numero);

}