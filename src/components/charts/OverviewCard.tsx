import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface OverviewCardProps {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  className?: string;
  /** Optional pulsing dot next to the icon */
  pulse?: boolean;
}

export function OverviewCard({
  icon: Icon,
  iconClassName,
  title,
  value,
  subtitle,
  className,
  pulse,
}: OverviewCardProps) {
  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon className={cn("w-8 h-8 text-muted-foreground", iconClassName)} />
            {pulse && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-success rounded-full animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground truncate">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
