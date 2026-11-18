import { useId } from "react";

const Textarea = ({
  label,
  error,
  hint,
  className = "",
  id,
  rows = 4,
  ...props
}) => {
  const generatedId = useId();
  const textareaId = id || generatedId;

  return (
    <div className="flex flex-col gap-2">
      {label && <label htmlFor={textareaId} className="text-sm font-semibold text-slate-700">{label}</label>}
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
        className={`w-full rounded-xl border bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-[#B85C3B] focus:bg-white focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60 ${error ? "border-red-400" : "border-slate-200"} ${className}`}
        {...props}
      />
      {error && <p id={`${textareaId}-error`} role="alert" className="text-sm text-red-700">{error}</p>}
      {!error && hint && <p id={`${textareaId}-hint`} className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
};

export default Textarea;
