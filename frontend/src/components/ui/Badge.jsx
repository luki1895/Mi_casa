const Badge = ({
  children,
  variant = "primary"
}) => {


  const variants = {


    primary:
      "bg-primary/10 text-primary",


    success:
      "bg-success/10 text-success",


    danger:
      "bg-danger/10 text-danger",


    warning:
      "bg-warning/10 text-warning",


    info:
      "bg-info/10 text-info",


    neutral:
      "bg-gray-100 text-gray-700"


  };


  return (

    <span

      className={`
        inline-flex
        items-center
        px-3
        py-1
        rounded-full
        text-sm
        font-medium
        ${variants[variant]}
      `}

    >

      {children}

    </span>

  );

};


export default Badge;