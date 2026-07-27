const Modal=({

open,

title,

children,

onClose

})=>{

if(!open) return null;

return(

<div className="fixed inset-0 bg-black/40 flex justify-center items-center">

<div className="bg-white rounded-xl w-[700px]">

<div className="flex justify-between p-5 border-b">

<h2 className="text-xl font-bold">

{title}

</h2>

<button onClick={onClose}>

✕

</button>

</div>

<div className="p-6">

{children}

</div>

</div>

</div>

);

};

export default Modal;