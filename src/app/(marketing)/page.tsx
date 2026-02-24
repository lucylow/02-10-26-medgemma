export default function MarketingLandingPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <h1 className="bg-gradient-to-r from-emerald-700 to-sky-700 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">
        PediScreen AI — MedGemma Pediatric Screening Assistant
      </h1>
      <p className="text-base text-muted-foreground sm:text-lg">
        A medical-grade, MedGemma-powered platform for pediatric developmental screening,
        designed for CHWs and clinicians with human-in-the-loop safety and embedding-first privacy.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p className="font-semibold">MedGemma 4B Multimodal</p>
          <p className="text-muted-foreground">Text + image reasoning with LoRA adapters.</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p className="font-semibold">ASQ-3 validated flows</p>
          <p className="text-muted-foreground">0–60 month developmental screening support.</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p className="font-semibold">HIPAA-ready architecture</p>
          <p className="text-muted-foreground">Embedding-first, on-device friendly design.</p>
        </div>
      </div>
    </div>
  );
}

