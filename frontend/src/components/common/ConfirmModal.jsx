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

className="px-5 py-2 border rounded-lg"

>

Cancelar

</button>

<button

onClick={onConfirm}

className="px-5 py-2 bg-red-600 text-white rounded-lg"

>

Aceptar

</button>

</div>

</Modal>

);

}

export default ConfirmModal;