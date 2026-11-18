function Empty({ texto, children, className = "" }) {
  return (
    <div className={`rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 ${className}`}>
      {texto || children}
    </div>
  );
}

export default Empty;
