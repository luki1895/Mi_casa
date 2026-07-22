function Select({

value,

onChange,

options

}){

return(

<select

value={value}

onChange={onChange}

className="w-full border rounded-lg p-3"

>

{

options.map(op=>

<option

key={op.value}

value={op.value}

>

{op.label}

</option>

)

}

</select>

);

}

export default Select;