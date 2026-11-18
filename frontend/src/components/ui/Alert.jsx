const variants = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

const Alert = ({
  children,
  type = "info",
  variant,
  role,
  className = "",
  onRetry,
}) => {
  const resolvedType = variant === "error" ? "error" : variant || type;
  const resolvedRole = role || (resolvedType === "error" ? "alert" : "status");

  return (
    <div role={resolvedRole} className={`rounded-xl border p-4 text-sm ${variants[resolvedType] || variants.info} ${className}`}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>{children}</div>
        {onRetry && <button type="button" onClick={onRetry} className="font-bold underline underline-offset-2">Reintentar</button>}
      </div>
    </div>
  );
};

export default Alert;
