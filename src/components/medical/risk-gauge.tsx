import { cn } from "@/lib/utils";

interface RiskGaugeProps {
  value: "low" | "monitor" | "refer" | "unknown";
  className?: string;
}

const LABELS: Record<RiskGaugeProps["value"], string> = {
  low: "On track",
  monitor: "Monitor",
  refer: "Refer / Evaluate",
  unknown: "Not assessed",
};

export function RiskGauge({ value, className }: RiskGaugeProps) {
  const segments = ["low", "monitor", "refer"] as const;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative w-24 h-12 overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-20 rounded-[999px] bg-slate-100" />
        <div className="relative z-10 flex h-full items-end justify-between px-1 pb-1">
          {segments.map((segment) => (
            <div
              key={segment}
              className={cn(
                "h-2 w-6 rounded-full transition-colors",
                segment === "low" && "bg-emerald-300",
                segment === "monitor" && "bg-amber-300",
                segment === "refer" && "bg-red-300",
                value === segment && "h-3 shadow-[0_0_0_1px_rgba(15,23,42,0.12)]",
              )}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col text-xs">
        <span className="font-semibold leading-tight">
          {LABELS[value] ?? LABELS.unknown}
        </span>
        <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
          Developmental risk
        </span>
      </div>
    </div>
  );
}

export default RiskGauge;

