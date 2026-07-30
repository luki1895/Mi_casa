import Modal from "./Modal";

function ConfirmModal({

open,

title,

message,

onConfirm,

onCancel

}){

return(

<Modal

open={open}

title={title}

onClose={onCancel}

>

<p className="mb-6">

{message}

</p>

<div className="flex justify-end gap-4">

<button

onClick={onCancel}

className="px-5 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-[#f5f3ff]"

>

Cancelar

</button>

<button

onClick={onConfirm}

className="px-5 py-2 bg-[#ff3b30] text-white rounded-xl hover:bg-[#e11d48]"

>

Aceptar

</button>

</div>

</Modal>

);

}

export default ConfirmModal;