import Modal from "./Modal";
import Button from "./Button";

const ConfirmModal = ({
  open,
  isOpen,
  title = "Confirmar acción",
  message,
  children,
  onConfirm,
  onCancel,
  onClose,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  loading = false,
}) => {
  const visible = open ?? isOpen;
  const close = onCancel || onClose;

  return (
    <Modal open={visible} title={title} onClose={close}>
      <div className="text-sm text-slate-600">{message || children}</div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={close} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
