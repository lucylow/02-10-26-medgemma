/**
 * Clinician review page with real-time collaboration (CHW + clinician).
 * Integrates CollabEditor, ParentSummary, and confidence meters.
 */
import React, { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import CollabEditor from "@/components/pediscreen/CollabEditor";
import ParentSummary from "@/components/pediscreen/ParentSummary";
import { getReport, patchReport } from "@/api/medgemma";
import type { ReportDraft } from "@/api/medgemma";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/** Map backend ReportDraft to CollabEditor/ParentSummary format */
function mapReportToDraft(draft: ReportDraft | null): Record<string, unknown> | null {
  if (!draft) return null;
  return {
    clinical_summary: draft.clinical_summary,
    technical_summary: (draft as unknown as Record<string, unknown>).technical_summary,
    parent_summary: draft.plain_language_summary ?? draft.clinical_summary,
    parentFriendlyExplanation: draft.plain_language_summary ?? draft.clinical_summary,
    summary: draft.clinical_summary,
    recommendations: draft.recommendations ?? [],
    riskAssessment: draft.risk_assessment
      ? {
          overall: draft.risk_assessment.overall,
          domains: draft.risk_assessment.domains,
        }
      : undefined,
    domains: draft.risk_assessment?.domains
      ? Object.entries(draft.risk_assessment.domains).map(([domain, _]) => ({
          domain,
          confidence: 0.6,
        }))
      : [],
  };
}

export default function ClinicianReviewWithCollab() {
  const { reportId } = useParams<{ reportId: string }>();
  const { toast } = useToast();
  const [initialDraft, setInitialDraft] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Replace with real auth — get user from context or auth provider
  const user = {
    userId: "user-" + Math.random().toString(36).slice(2, 9),
    name: "Clinician",
    role: "clinician",
  };

  useEffect(() => {
    if (!reportId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getReport(reportId);
        const draft = res.draft_json ?? res.final_json;
        setInitialDraft(mapReportToDraft(draft ?? null) ?? {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId]);

  const savePatch = async (draft: Record<string, unknown>) => {
    if (!reportId) return;
    try {
      await patchReport(
        reportId,
        {
          clinical_summary: draft.clinical_summary as string | undefined,
          technical_summary: draft.technical_summary as string | undefined,
          recommendations: draft.recommendations as string[] | undefined,
        },
        (window as unknown as { googleToken?: string }).googleToken
      );
      toast({
        title: "Changes saved",
        description: "Draft updates have been persisted.",
      });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Could not persist draft.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    if (!reportId) return;
    try {
      const j = await getReport(reportId);
      const pdfBase =
        (j as { final_json?: { pdf_base64?: string } }).final_json?.pdf_base64 ?? null;
      if (pdfBase) {
        const link = document.createElement("a");
        link.href = "data:application/pdf;base64," + pdfBase;
        link.download = `${reportId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        toast({
          title: "PDF not available",
          description: "Finalize the report first to generate a PDF.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Download failed",
        variant: "destructive",
      });
    }
  };

  if (!reportId) {
    return <Navigate to="/pediscreen" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-muted-foreground">Loading report...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CollabEditor
            reportId={reportId}
            user={user}
            initialDraft={initialDraft ?? {}}
            onLocalSave={savePatch}
          />
        </div>
        <div>
          <div className="sticky top-4 space-y-4">
            <ParentSummary
              report={initialDraft}
              onSharePreference={(s) => console.log("share", s)}
              onDownload={handleDownload}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
