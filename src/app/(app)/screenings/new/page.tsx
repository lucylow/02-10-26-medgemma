export default function NewScreeningPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New screening</h1>
        <p className="text-sm text-muted-foreground">
          Use the PediScreen AI workflow to create a new developmental screening.
        </p>
      </header>
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        In the current implementation, this flow is powered by the Vite app at{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">/pediscreen/screening</code>. This route
        exists as a scaffold for a future Next.js migration.
      </div>
    </section>
  );
}

