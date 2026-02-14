import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSummary } from "@/services/cases";
import { ClipboardList, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default function Dashboard() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["summary"],
    queryFn: getSummary,
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: "Pending",
      value: summary?.cases_pending ?? 0,
      icon: ClipboardList,
      className: "text-muted-foreground",
    },
    {
      title: "High Priority",
      value: summary?.high_priority ?? 0,
      icon: AlertTriangle,
      className: "text-amber-500",
    },
    {
      title: "Reviewed",
      value: summary?.reviewed ?? 0,
      icon: CheckCircle,
      className: "text-green-600",
    },
    {
      title: "Avg Review Time (min)",
      value: summary?.avg_review_time ?? 0,
      icon: Clock,
      className: "text-muted-foreground",
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => (
          <Card key={m.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.title}
              </CardTitle>
              <m.icon className={`w-4 h-4 ${m.className}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {summary?.weekly_throughput && summary.weekly_throughput.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Throughput</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-2">
              {summary.weekly_throughput.slice(-12).map((w, i) => (
                <div
                  key={w.week}
                  className="flex-1 bg-primary/20 rounded-t min-h-[4px]"
                  style={{ height: `${Math.max(4, (w.count / (Math.max(...summary.weekly_throughput.map((x) => x.count)) || 1)) * 100)}%` }}
                  title={`${w.week}: ${w.count}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
