function Card({

title,

children

}){

return(

<div className="bg-white rounded-xl shadow">

<div className="border-b p-5">

<h2 className="text-xl font-semibold">

{title}

</h2>

</div>

<div className="p-5">

{children}

</div>

</div>

);

}

export default Card;