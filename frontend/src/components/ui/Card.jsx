const Card = ({
  children,
  title,
  description,
  actions,
  className = "",
  as: Component = "div",
}) => (
  <Component className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
    {(title || description || actions) && (
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          {title && <h2 className="text-lg font-black text-slate-900">{title}</h2>}
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    )}
    <div className="p-5 sm:p-6">{children}</div>
  </Component>
);

export default Card;
