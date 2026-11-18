import { useId } from "react";

const Select = ({
  label,
  error,
  hint,
  options,
  children,
  className = "",
  id,
  ...props
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className="flex flex-col gap-2">
      {label && <label htmlFor={selectId} className="text-sm font-semibold text-slate-700">{label}</label>}
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
        className={`min-h-11 w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-[#B85C3B] focus:bg-white focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60 ${error ? "border-red-400" : "border-slate-200"} ${className}`}
        {...props}
      >
        {children || options?.map((option) => {
          if (typeof option === "string" || typeof option === "number") {
            return <option key={option} value={option}>{option}</option>;
          }
          return <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>;
        })}
      </select>
      {error && <p id={`${selectId}-error`} role="alert" className="text-sm text-red-700">{error}</p>}
      {!error && hint && <p id={`${selectId}-hint`} className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
};

export default Select;
