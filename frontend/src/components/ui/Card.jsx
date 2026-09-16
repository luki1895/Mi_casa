const Card = ({
  children,
  className = ""
}) => {


return (

<div

className={`
rounded-lg
shadow-card
p-5
${className}
`}

>

{children}

</div>

)

}


export default Card;