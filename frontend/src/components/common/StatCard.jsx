function StatCard({

title,

value,

color="text-blue-600"

}){

return(

<div className="bg-white rounded-xl shadow p-5">

<p className="text-gray-500">

{title}

</p>

<h2 className={`text-3xl font-bold ${color}`}>

{value}

</h2>

</div>

);

}

export default StatCard;