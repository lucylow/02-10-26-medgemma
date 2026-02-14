import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getScreening } from "@/services/screeningApi";
import { ArrowLeft } from "lucide-react";

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: caseData, isLoading } = useQuery({
    queryKey: ["case", id],
    queryFn: () => getScreening(id!),
    enabled: !!id,
  });

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Missing case ID</p>
        <Link to="/cases">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Cases
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-muted-foreground">Case not found</p>
        <Link to="/cases">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Cases
          </Button>
        </Link>
      </div>
    );
  }

  const report = caseData.report ?? {};

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/cases">
        <Button variant="ghost" className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Cases
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Case {caseData.screening_id}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Domain: {caseData.domain ?? "General"} • Age: {caseData.child_age_months} months
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">Observations</h3>
            <p className="text-sm text-muted-foreground">
              {caseData.observations ?? "—"}
            </p>
          </div>
          {report.summary && (
            <div>
              <h3 className="font-medium mb-1">Summary</h3>
              <p className="text-sm">{report.summary}</p>
            </div>
          )}
          {report.riskLevel && (
            <div>
              <h3 className="font-medium mb-1">Risk Level</h3>
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-sm">
                {report.riskLevel}
              </span>
            </div>
          )}
          <Button>Sign off</Button>
        </CardContent>
      </Card>
    </div>
  );
}
