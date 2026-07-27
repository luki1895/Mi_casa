const Input = ({label,error,...props})=>{

return(

<div className="flex flex-col gap-1">

<label className="font-semibold">

{label}

</label>

<input

className="border rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-500"

{...props}

/>

{

error &&

<p className="text-red-600 text-sm">

{error}

</p>

}

</div>

);

};

export default Input;