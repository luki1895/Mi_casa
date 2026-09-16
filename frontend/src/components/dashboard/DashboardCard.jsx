import Card from "../ui/Card";


const DashboardCard = ({

titulo,

valor,

icono,

color = "primary"

}) => {


const colors = {


primary:
"bg-primary",


success:
"bg-success",


danger:
"bg-danger",


warning:
"bg-warning",


info:
"bg-info"


};



return (

<Card

className={`
${colors[color]}
text-white
`}
>


<div className="
flex
justify-between
items-center
">


<div>


<p className="
text-sm
opacity-90
">

{titulo}

</p>



<h2 className="
text-3xl
font-bold
mt-2
">

{valor}

</h2>


</div>



<div className="
text-5xl
opacity-90
">

{icono}

</div>



</div>


</Card>

);


};


export default DashboardCard;