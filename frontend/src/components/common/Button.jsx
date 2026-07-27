const Button = ({
    children,
    variant = "primary",
    type = "button",
    className = "",
    ...props
}) => {

    const styles = {

        primary:
            "bg-red-700 hover:bg-red-800 text-white",

        secondary:
            "bg-gray-700 hover:bg-gray-800 text-white",

        success:
            "bg-green-600 hover:bg-green-700 text-white",

        warning:
            "bg-yellow-500 hover:bg-yellow-600 text-white",

        danger:
            "bg-red-600 hover:bg-red-700 text-white",

        outline:
            "border border-red-700 text-red-700 hover:bg-red-700 hover:text-white"

    };

    return (

        <button

            type={type}

            className={`px-5 py-2 rounded-lg transition font-semibold ${styles[variant]} ${className}`}

            {...props}

        >

            {children}

        </button>

    );

};

export default Button;