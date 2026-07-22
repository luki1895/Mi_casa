function Modal({

open,

title,

children,

onClose

}){

if(!open) return null;

return(

<div className="fixed inset-0 bg-black/40 flex justify-center items-center">

<div className="bg-white rounded-xl w-[650px]">

<div className="flex justify-between border-b p-5">

<h2 className="text-xl font-semibold">

{title}

</h2>

<button

onClick={onClose}

>

✕

</button>

</div>

<div className="p-5">

{children}

</div>

</div>

</div>

);

}

export default Modal;