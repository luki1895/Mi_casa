const Button = ({
  children,
  variant = "primary",
  size = "md",
  onClick
}) => {


  const variants = {

    primary:
      "bg-primary text-white hover:bg-primary-dark",

    success:
      "bg-success text-white hover:bg-success-dark",

    danger:
      "bg-danger text-white hover:bg-danger-dark",

    warning:
      "bg-warning text-white hover:bg-warning-dark",

    outline:
      "border border-primary text-primary hover:bg-primary hover:text-white"

  };


  const sizes = {

    sm:
      "px-3 py-1 text-sm",

    md:
      "px-4 py-2",

    lg:
      "px-6 py-3"

  };


  return (

    <button

      onClick={onClick}

      className={`
        rounded-md
        font-medium
        transition
        duration-fast
        ${variants[variant]}
        ${sizes[size]}
      `}

    >

      {children}

    </button>

  );

};


export default Button;