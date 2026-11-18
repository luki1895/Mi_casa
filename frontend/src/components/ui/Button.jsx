const variants = {
  primary: "border border-transparent bg-slate-900 text-white hover:bg-slate-700",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  success: "border border-transparent bg-emerald-700 text-white hover:bg-emerald-800",
  danger: "border border-transparent bg-red-700 text-white hover:bg-red-800",
  warning: "border border-transparent bg-[#F59E0B] text-slate-950 hover:bg-amber-400",
  outline: "border border-[#B85C3B] bg-white text-[#B85C3B] hover:bg-[#FFF8F2]",
};

const sizes = {
  sm: "min-h-9 px-3 py-2 text-sm",
  md: "min-h-11 px-4 py-2.5 text-sm",
  lg: "min-h-12 px-6 py-3",
};

const Button = ({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  loading = false,
  disabled = false,
  ...props
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center rounded-xl font-bold transition-colors focus:outline-none focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
    {...props}
  >
    {loading ? "Procesando…" : children}
  </button>
);

export default Button;
