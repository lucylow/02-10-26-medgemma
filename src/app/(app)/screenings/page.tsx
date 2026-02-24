export default function ScreeningsIndexPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Screenings</h1>
        <p className="text-sm text-muted-foreground">
          List and manage pediatric developmental screenings.
        </p>
      </header>
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        This route is a placeholder for a Next.js implementation mirroring the existing screening
        history and case list in the Vite app (<code className="rounded bg-muted px-1.5 py-0.5">
          /pediscreen/history
        </code>
        ).
      </div>
    </section>
  );
}

