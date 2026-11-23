export function Ta({ children, className = '' }) {
    return children ? <p lang="ta" className={className}>{children}</p> : null;
}
export function Ar({ children, className = '' }) {
    return children ? <p lang="ar" dir="rtl" className={className}>{children}</p> : null;
}
export function Text({ value, className = '' }) {
    return value ? <p className={`whitespace-pre-line ${className}`}>{value}</p> : null;
}
export function EmptyNote() {
    return <p className="text-muted-foreground">This information will be added soon.</p>;
}
export default function PageShell({ title, titleTa, children, wide = false }) {
    return (<section className={`mx-auto px-4 py-12 sm:px-6 lg:px-8 ${wide ? 'max-w-7xl' : 'max-w-4xl'}`}>
      <h1 className="font-heading text-3xl font-semibold text-[#172d43] sm:text-4xl">{title}</h1>
      <Ta className="mt-1 text-lg text-muted-foreground">{titleTa}</Ta>
      <div className="mt-8 space-y-6">{children}</div>
    </section>);
}
