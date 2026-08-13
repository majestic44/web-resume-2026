export function PageHeader({ eyebrow, title, children }) {
  return (
    <header className="page-header mb-6 max-w-4xl">
      <p className="mb-2 text-xs font-bold uppercase tracking-normal text-teal-700">{eyebrow}</p>
      <h1 className="font-['Space_Grotesk'] text-4xl leading-none text-slate-900 md:text-5xl">{title}</h1>
      {children ? <div className="page-header-copy mt-3 max-w-3xl text-[1.08rem] leading-7 text-slate-600">{children}</div> : null}
    </header>
  );
}
