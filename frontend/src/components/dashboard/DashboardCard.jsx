import React from "react";

const DashboardCard=({

titulo,

valor,

icono,

color

})=>{

return(

<div className={`${color} rounded-xl text-white p-5`}>

<div className="flex justify-between">

<div>

<p>

{titulo}

</p>

<h2 className="text-3xl font-bold">

{valor}

</h2>

</div>

<div className="text-5xl">

{icono}

</div>

</div>

</div>

);

};

export default DashboardCard;