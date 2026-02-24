export default function MedicalDashboardPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Clinical dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of recent PediScreen cases, vitals, and developmental trends.
        </p>
      </header>
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        This is a scaffold for a future Next.js dashboard view. The primary implementation today
        lives in the Vite app routes under <code className="rounded bg-muted px-1.5 py-0.5">/dashboard</code>{" "}
        and <code className="rounded bg-muted px-1.5 py-0.5">/pediscreen/dashboard</code>.
      </div>
    </section>
  );
}

