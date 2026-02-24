interface ProfilePageProps {
  params: { id: string };
}

export default function PatientProfilePage({ params }: ProfilePageProps) {
  return (
    <section className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Patient profile</h1>
        <p className="text-sm text-muted-foreground">
          Profile scaffold for patient <code className="rounded bg-muted px-1.5 py-0.5">{params.id}</code>.
        </p>
      </header>
      <p className="text-sm text-muted-foreground">
        The primary implementation for patient profiles today is in the Vite app routes under{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">/pediscreen/profiles/:childId</code>.
      </p>
    </section>
  );
}

