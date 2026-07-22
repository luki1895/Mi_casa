function Input({

type="text",

value,

onChange,

placeholder

}){

return(

<input

type={type}

value={value}

onChange={onChange}

placeholder={placeholder}

className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"

/>

);

}

export default Input;