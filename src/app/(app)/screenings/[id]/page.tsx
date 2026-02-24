interface ScreeningDetailPageProps {
  params: { id: string };
}

export default function ScreeningDetailPage({ params }: ScreeningDetailPageProps) {
  return (
    <section className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Screening detail</h1>
        <p className="text-sm text-muted-foreground">
          Detail view scaffold for screening <code className="rounded bg-muted px-1.5 py-0.5">{params.id}</code>.
        </p>
      </header>
      <p className="text-sm text-muted-foreground">
        The fully implemented version of this view currently lives in the Vite app under{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">/cases/:id</code> and{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">/pediscreen/case/:id</code>.
      </p>
    </section>
  );
}

