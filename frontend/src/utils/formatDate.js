export default function formatDate(fecha){

return new Date(fecha)

.toLocaleDateString(

"es-BO"

);

}