import { useEffect } from "react";

const sizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const Modal = ({
  open,
  isOpen,
  title,
  children,
  onClose,
  size = "md",
  className = "",
}) => {
  const visible = open ?? isOpen;

  useEffect(() => {
    if (!visible) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "mi-casa-modal-title" : undefined}
        className={`max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-2xl bg-white shadow-xl ${sizes[size] || sizes.md} ${className}`}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
            {title && <h2 id="mi-casa-modal-title" className="text-xl font-black text-slate-900">{title}</h2>}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                ×
              </button>
            )}
          </div>
        )}
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
