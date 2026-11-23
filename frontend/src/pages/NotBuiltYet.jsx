// Phase 1 only: marks routes whose real content arrives in a later phase.
export default function NotBuiltYet({ title, phase }) {
    return (<section className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-4 text-muted-foreground">This page is not built yet. It will be created in {phase}.</p>
    </section>);
}
