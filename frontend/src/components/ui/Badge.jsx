const variants = {
  primary: "bg-[#FFF4E8] text-[#8F422D]",
  success: "bg-emerald-100 text-emerald-700",
  danger: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-800",
  info: "bg-sky-100 text-sky-700",
  neutral: "bg-slate-100 text-slate-700",
};

const Badge = ({
  children,
  texto,
  variant = "primary",
  color,
  className = "",
}) => {
  const aliases = { green: "success", red: "danger", yellow: "warning", blue: "info" };
  const resolvedVariant = aliases[color] || variant;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${variants[resolvedVariant] || variants.primary} ${className}`}>
      {texto ?? children}
    </span>
  );
};

export default Badge;
