const Button = ({
    children,
    variant = "primary",
    type = "button",
    className = "",
    ...props
}) => {
    const styles = {
        primary: "bg-[var(--primary-color)] hover:opacity-90 text-white shadow-sm hover:shadow-lg",
        secondary: "bg-[var(--secondary-color)] hover:opacity-90 text-white shadow-sm hover:shadow-lg",
        success: "bg-[#14b8a6] hover:bg-[#0f766e] text-white shadow-sm hover:shadow-lg",
        warning: "bg-[#facc15] hover:bg-[#eab308] text-[#713f12] shadow-sm hover:shadow-lg",
        danger: "bg-[#f43f5e] hover:bg-[#e11d48] text-white shadow-sm hover:shadow-lg",
        outline: "border border-slate-300 bg-white text-slate-700 hover:border-[var(--primary-color)] hover:text-[var(--primary-color)] hover:bg-[#fff7ed] shadow-sm",
        ghost: "bg-transparent text-slate-700 hover:bg-[#fef3c7] hover:text-[#92400e]"
    };

    return (
        <button
            type={type}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;