const Input = ({
  label,
  type="text",
  placeholder,
  value,
  onChange,
  name
}) => {


return (

<div className="flex flex-col gap-2">


{
label &&

<label className="
text-sm
font-medium
text-text
">

{label}

</label>

}


<input

name={name}

type={type}

placeholder={placeholder}

value={value}

onChange={onChange}

className="
border
border-border
rounded-md
px-3
py-2
outline-none
focus:ring-2
focus:ring-primary
transition
duration-fast
"

/>


</div>

)

}


export default Input;