const Card=({

title,

children

})=>{

return(

<div className="bg-white rounded-xl shadow p-5">

<h2 className="font-bold text-xl mb-5">

{title}

</h2>

{children}

</div>

);

};

export default Card;