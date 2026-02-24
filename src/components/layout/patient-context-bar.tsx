import PatientCard, { type PatientSummary } from "@/components/medical/patient-card";

interface PatientContextBarProps {
  patient: PatientSummary;
}

export function PatientContextBar({ patient }: PatientContextBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center gap-4">
          <PatientCard patient={patient} className="flex-1 shadow-none border-emerald-200" />
        </div>
        <div className="hidden text-xs text-muted-foreground md:block">
          <p className="font-medium text-foreground">PediScreen AI</p>
          <p>MedGemma-powered pediatric screening assistant</p>
        </div>
      </div>
    </header>
  );
}

export default PatientContextBar;

