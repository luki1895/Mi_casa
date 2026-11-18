import { useId } from "react";

const Input = ({
  label,
  error,
  hint,
  className = "",
  id,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`min-h-11 w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-[#B85C3B] focus:bg-white focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60 ${error ? "border-red-400" : "border-slate-200"} ${className}`}
        {...props}
      />
      {error && <p id={`${inputId}-error`} role="alert" className="text-sm text-red-700">{error}</p>}
      {!error && hint && <p id={`${inputId}-hint`} className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
};

export default Input;
