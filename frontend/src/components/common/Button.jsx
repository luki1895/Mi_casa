const Button = ({
    children,
    variant = "primary",
    type = "button",
    className = "",
    ...props
}) => {
    const styles = {
        primary: "bg-[#ff3b30] hover:bg-[#e11d48] text-white shadow-sm hover:shadow-lg",
        secondary: "bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-sm hover:shadow-lg",
        success: "bg-[#14b8a6] hover:bg-[#0f766e] text-white shadow-sm hover:shadow-lg",
        warning: "bg-[#facc15] hover:bg-[#eab308] text-[#713f12] shadow-sm hover:shadow-lg",
        danger: "bg-[#f43f5e] hover:bg-[#e11d48] text-white shadow-sm hover:shadow-lg",
        outline: "border border-[#c084fc] bg-white text-[#6b21a8] hover:border-[#ff3b30] hover:text-[#ff3b30] hover:bg-[#fef2f2] shadow-sm",
        ghost: "bg-transparent text-slate-700 hover:bg-[#fef3c7] hover:text-[#92400e]"
    };

    return (
        <button
            type={type}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ff3b30]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;