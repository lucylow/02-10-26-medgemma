import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PatientRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export interface PatientSummary {
  id: string;
  name: string;
  ageMonths: number;
  status: "active" | "discharged" | "archived";
  riskLevel: PatientRiskLevel;
  lastScreeningAt?: string;
}

interface PatientCardProps {
  patient: PatientSummary;
  className?: string;
}

function riskColor(level: PatientRiskLevel): string {
  switch (level) {
    case "HIGH":
      return "bg-red-100 text-red-800 border-red-200";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "LOW":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function PatientCard({ patient, className }: PatientCardProps) {
  const ageYears = patient.ageMonths / 12;

  return (
    <Card
      className={cn(
        "border-2 border-emerald-100 shadow-sm bg-gradient-to-r from-emerald-50/80 via-sky-50/60 to-white",
        className,
      )}
      aria-label={`Patient summary for ${patient.name}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold tracking-tight">
            {patient.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {patient.ageMonths} months ({ageYears.toFixed(1)} years)
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            variant="outline"
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-full border",
              riskColor(patient.riskLevel),
            )}
          >
            {patient.riskLevel === "UNKNOWN" ? "RISK UNKNOWN" : `${patient.riskLevel} RISK`}
          </Badge>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            ID: {patient.id}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4 pt-1">
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            Status:{" "}
            <span className="capitalize text-emerald-700">
              {patient.status.replace("_", " ")}
            </span>
          </span>
          {patient.lastScreeningAt && (
            <span>
              Last screening:{" "}
              <time dateTime={patient.lastScreeningAt}>
                {new Date(patient.lastScreeningAt).toLocaleDateString()}
              </time>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PatientCard;

