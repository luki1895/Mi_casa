function Search({

value,

onChange,

placeholder

}){

return(

<input

value={value}

onChange={onChange}

placeholder={placeholder}

className="w-full border rounded-lg p-3"

>

</input>

);

}

export default Search;