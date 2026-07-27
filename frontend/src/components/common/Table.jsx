const Table=({

columns,

data

})=>{

return(

<table className="w-full">

<thead>

<tr>

{

columns.map(col=>

<th

key={col.key}

className="p-3 bg-gray-100 text-left"

>

{col.label}

</th>

)

}

</tr>

</thead>

<tbody>

{

data.map((row,index)=>(

<tr key={index}>

{

columns.map(col=>

<td

key={col.key}

className="border-b p-3"

>

{row[col.key]}

</td>

)

}

</tr>

))

}

</tbody>

</table>

);

};

export default Table;