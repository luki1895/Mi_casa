const Table = ({
  columns,
  data
}) => {


return (

<div className="
overflow-x-auto
">


<table className="
w-full
text-sm
text-left
">


<thead className="
bg-background
border-b
border-border
">


<tr>


{
columns.map((column)=>(

<th

key={column.key}

className="
px-4
py-3
font-semibold
text-text
"

>

{column.label}

</th>


))

}


</tr>


</thead>



<tbody>


{
data.map((row,index)=>(


<tr

key={index}

className="
border-b
border-border
hover:bg-background
transition
duration-fast
"

>


{
columns.map((column)=>(


<td

key={column.key}

className="
px-4
py-3
"

>

{row[column.key]}

</td>


))


}


</tr>


))

}


</tbody>


</table>


</div>

)


};


export default Table;