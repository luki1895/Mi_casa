function TextArea({

value,

onChange,

placeholder

}){

return(

<textarea

rows="4"

value={value}

onChange={onChange}

placeholder={placeholder}

className="w-full border rounded-lg p-3"

/>

);

}

export default TextArea;