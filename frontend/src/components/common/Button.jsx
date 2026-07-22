function Button({

children,

onClick,

type="button",

color="blue"

}){

const colores={

blue:"bg-blue-600 hover:bg-blue-700",

green:"bg-green-600 hover:bg-green-700",

red:"bg-red-600 hover:bg-red-700",

gray:"bg-gray-500 hover:bg-gray-600"

};

return(

<button

type={type}

onClick={onClick}

className={`${colores[color]} text-white px-5 py-3 rounded-lg transition`}

>

{children}

</button>

);

}

export default Button;