const Modal = ({
  isOpen,
  title,
  children,
  onClose
}) => {


if(!isOpen) return null;


return (

<div className="
fixed
inset-0
bg-black/40
flex
items-center
justify-center
z-50
">


<div className="
bg-card
rounded-lg
shadow-dropdown
w-full
max-w-lg
p-6
">


<div className="
flex
justify-between
items-center
mb-5
">


<h2 className="
text-xl
font-semibold
text-text
">

{title}

</h2>


<button

onClick={onClose}

className="
text-gray-500
hover:text-danger
"

>

✕


</button>


</div>



{children}



</div>


</div>

)


};


export default Modal;