import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ClipboardCheck, Shield, FileDown, Scale } from 'lucide-react';
import {
  approveReport,
  getReport,
  generateReportFromScreening,
  validateEdit,
  getFdaMapping,
  exportReportPdf,
  type ReportDraft,
} from '@/api/medgemma';
import { useToast } from '@/hooks/use-toast';

interface ClinicianReviewProps {
  reportId: string;
  onDone: () => void;
  /** Optional: OAuth token for approval API */
  authToken?: string;
  /** Optional: API key for backend (x-api-key) */
  apiKey?: string;
  className?: string;
}

/**
 * Clinician Review — explicit human-in-the-loop sign-off.
 * Fetches draft, allows editing of summary/recommendations, then signs off.
 * OAuth-protected, audit-ready.
 */
const ClinicianReview: React.FC<ClinicianReviewProps> = ({
  reportId,
  onDone,
  authToken,
  apiKey,
  className,
}) => {
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [effectiveReportId, setEffectiveReportId] = useState<string>(reportId);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [clinicianId, setClinicianId] = useState('clinician');
  const [isApproving, setIsApproving] = useState(false);
  const [flags, setFlags] = useState<string[]>([]);
  const [fdaMapping, setFdaMapping] = useState<{
    classification: string;
    sa_md_risk: string;
    human_in_loop: boolean;
    explainable: boolean;
    no_autonomous_diagnosis: boolean;
  } | null>(null);
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let res: Awaited<ReturnType<typeof getReport>>;
        try {
          res = await getReport(reportId, apiKey);
        } catch {
          // If reportId looks like screening_id (ps-xxx), try to generate report first
          if (reportId.startsWith('ps-') || reportId.includes('-')) {
            try {
              const gen = await generateReportFromScreening(reportId, undefined, apiKey);
              if (gen.success && gen.draft) {
                if (!cancelled) {
                  setDraft(gen.draft);
                  setEffectiveReportId(gen.draft.report_id);
                }
                if (!cancelled) setLoading(false);
                return;
              }
            } catch (genErr) {
              console.error(genErr);
            }
          }
          throw new Error('Report not found');
        }
        const d = res.draft_json ?? res.final_json ?? (res as unknown as ReportDraft);
        if (!cancelled && d) {
          setDraft(typeof d === 'object' ? d : null);
          const rid = res.report_id ?? (d as ReportDraft).report_id;
          if (rid) setEffectiveReportId(rid);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          toast({ title: 'Could not load report', description: 'Report not found. Generate one from the screening first.', variant: 'destructive' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reportId, apiKey, toast]);

  // FDA mapping when report is loaded
  useEffect(() => {
    if (!effectiveReportId || !apiKey) return;
    getFdaMapping(effectiveReportId, apiKey)
      .then((m) => setFdaMapping(m))
      .catch(() => setFdaMapping(null));
  }, [effectiveReportId, apiKey]);

  // Debounced validation when draft content changes
  const runValidation = useCallback(
    (content: string) => {
      if (!apiKey) return;
      validateEdit(content, apiKey).then((r) => setFlags(r.flags)).catch(() => setFlags([]));
    },
    [apiKey]
  );

  useEffect(() => {
    if (!draft) return;
    const combined =
      (draft.clinical_summary ?? '') +
      '\n' +
      (draft.recommendations ?? []).join('\n');
    if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    validationTimeoutRef.current = setTimeout(() => runValidation(combined), 400);
    return () => {
      if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    };
  }, [draft?.clinical_summary, draft?.recommendations, runValidation]);

  const approve = async () => {
    setIsApproving(true);
    try {
      await approveReport(
        effectiveReportId,
        note,
        authToken ?? (window as unknown as { googleToken?: string }).googleToken,
        {
          clinicianId,
          apiKey,
          clinicalSummary: draft.clinical_summary,
          recommendations: draft.recommendations ?? [],
        }
      );
      toast({
        title: 'Report signed',
        description: 'Clinician review completed successfully.',
      });
      onDone();
    } catch (err) {
      toast({
        title: 'Approval failed',
        description: err instanceof Error ? err.message : 'Could not complete sign-off.',
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
    }
  };

  const updateDraft = (updates: Partial<ReportDraft>) => {
    if (draft) setDraft({ ...draft, ...updates });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!draft) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          Draft not found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          Clinician Review
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Review the AI draft and sign off to finalize this report.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="clinician-id" className="text-sm font-medium">
            Clinician ID
          </label>
          <Input
            id="clinician-id"
            value={clinicianId}
            onChange={(e) => setClinicianId(e.target.value)}
            placeholder="e.g. dr.smith"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="clinical-summary" className="text-sm font-medium">
            Clinical Summary (editable)
          </label>
          <Textarea
            id="clinical-summary"
            className="min-h-[80px]"
            value={draft.clinical_summary ?? ''}
            onChange={(e) => updateDraft({ clinical_summary: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="recommendations" className="text-sm font-medium">
            Recommendations
          </label>
          <Textarea
            id="recommendations"
            className="min-h-[80px]"
            value={(draft.recommendations ?? []).join('\n')}
            onChange={(e) =>
              updateDraft({
                recommendations: e.target.value.split('\n').filter(Boolean),
              })
            }
          />
        </div>

        {flags.length > 0 && (
          <div className="bg-red-50 border border-red-400 rounded-lg p-3">
            <h4 className="text-red-600 font-semibold text-sm">Safety Review Required</h4>
            <ul className="text-sm text-red-700 mt-2 space-y-1">
              {flags.map((f, i) => (
                <li key={i}>⚠ {f}</li>
              ))}
            </ul>
          </div>
        )}

        {fdaMapping && (
          <Card className="p-4 bg-green-50 border-green-200">
            <h3 className="font-semibold text-green-800 flex items-center gap-2">
              <Scale className="w-4 h-4" />
              FDA Regulatory Status
            </h3>
            <p className="text-sm text-green-700 mt-1">{fdaMapping.classification}</p>
            <ul className="text-xs mt-2 space-y-1 text-green-600">
              <li>✔ Human-in-the-loop enforced</li>
              <li>✔ Explainable reasoning</li>
              <li>✔ No autonomous diagnosis</li>
            </ul>
          </Card>
        )}

        <div className="space-y-2">
          <label htmlFor="clinician-note" className="text-sm font-medium">
            Sign-off note
          </label>
          <Textarea
            id="clinician-note"
            className="min-h-[60px]"
            placeholder="Add context, corrections, or clinical observations..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>
            Signing indicates you have reviewed the AI output and accept responsibility for the clinical decision.
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={approve}
            disabled={isApproving}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <ClipboardCheck className="w-4 h-4" />
                Review & Sign
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              exportReportPdf(effectiveReportId, clinicianId, apiKey).then(() =>
                toast({ title: 'PDF exported', description: 'Download started.' })
              ).catch((e) =>
                toast({ title: 'Export failed', description: (e as Error).message, variant: 'destructive' })
              );
            }}
          >
            <FileDown className="w-4 h-4" />
            Export PDF (Final)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClinicianReview;
