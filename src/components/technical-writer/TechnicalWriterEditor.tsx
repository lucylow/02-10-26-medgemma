import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, FileCheck, GitCompare } from 'lucide-react';
import {
  fetchReport,
  patchReport,
  finalizeReport,
  type TechnicalReportData,
} from '@/api/technicalWriter';
import { DiffView } from './DiffView';

interface TechnicalWriterEditorProps {
  reportId: string;
  clinicianToken?: string;
  onFinalized?: () => void;
}

export function TechnicalWriterEditor({
  reportId,
  onFinalized,
}: TechnicalWriterEditorProps) {
  const [report, setReport] = useState<TechnicalReportData | null>(null);
  const [edit, setEdit] = useState({
    clinical_summary: '',
    technical_summary: '',
    parent_summary: '',
    recommendations: '',
  });
  const [aiVersion, setAiVersion] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const data = report ?? (null as TechnicalReportData | null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetchReport(reportId);
        const draft: TechnicalReportData = (r.draft_json ?? r) as TechnicalReportData;
        if (cancelled) return;
        setReport(draft);
        setEdit({
          clinical_summary: draft.clinical_summary ?? '',
          technical_summary: draft.technical_summary ?? '',
          parent_summary: draft.parent_summary ?? '',
          recommendations: Array.isArray(draft.recommendations)
            ? draft.recommendations.join('\n')
            : '',
        });
        setAiVersion(draft.clinical_summary ?? '');
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  const handleSave = async () => {
    if (!reportId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await patchReport(reportId, {
        clinical_summary: edit.clinical_summary,
        technical_summary: edit.technical_summary,
        parent_summary: edit.parent_summary,
        recommendations: edit.recommendations.split('\n').filter(Boolean),
      });
      setReport(res.draft_json);
      setShowDiff(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    if (!reportId) return;
    setSigning(true);
    setError(null);
    try {
      await finalizeReport(reportId, 'Signed by clinician');
      onFinalized?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign failed');
    } finally {
      setSigning(false);
    }
  };

  const getEditedFullText = () => {
    return [
      edit.clinical_summary,
      edit.technical_summary,
      edit.parent_summary,
      edit.recommendations,
    ].join('\n\n');
  };

  const showProvenance = () => {
    const ev = data?.evidence ?? [];
    return ev.map((e) => (
      <div key={e.id} className="border rounded-lg p-2 my-2 bg-muted/30">
        <div className="text-xs text-muted-foreground">
          Provenance: {(e.provenance?.model as string) ?? 'baseline'}
        </div>
        <div className="text-sm mt-1">{e.summary}</div>
      </div>
    ));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">{error}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Technical Writer — Draft Review</CardTitle>
        <p className="text-sm text-muted-foreground">
          Report ID: {reportId} • Status: {data?.status ?? 'draft'}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <Tabs value={showDiff ? 'diff' : 'edit'} onValueChange={(v) => setShowDiff(v === 'diff')}>
          <TabsList>
            <TabsTrigger value="edit">Edit Draft</TabsTrigger>
            <TabsTrigger value="diff">AI vs Clinician Diff</TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="mt-4 space-y-4">
            <div className="grid gap-4">
              <div>
                <Label>Clinical Summary</Label>
                <Textarea
                  value={edit.clinical_summary}
                  onChange={(e) => setEdit((p) => ({ ...p, clinical_summary: e.target.value }))}
                  className="min-h-[100px] mt-1"
                />
              </div>
              <div>
                <Label>Technical Summary</Label>
                <Textarea
                  value={edit.technical_summary}
                  onChange={(e) => setEdit((p) => ({ ...p, technical_summary: e.target.value }))}
                  className="min-h-[120px] mt-1"
                />
              </div>
              <div>
                <Label>Parent Summary</Label>
                <Textarea
                  value={edit.parent_summary}
                  onChange={(e) => setEdit((p) => ({ ...p, parent_summary: e.target.value }))}
                  className="min-h-[80px] mt-1"
                />
              </div>
              <div>
                <Label>Recommendations (one per line)</Label>
                <Textarea
                  value={edit.recommendations}
                  onChange={(e) => setEdit((p) => ({ ...p, recommendations: e.target.value }))}
                  className="min-h-[100px] mt-1"
                  placeholder="Monitor and refer..."
                />
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Evidence & Provenance</Label>
              <div className="mt-2">{showProvenance()}</div>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-2">
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Edits
              </Button>
              <Button onClick={handleSign} disabled={signing} className="gap-2">
                {signing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileCheck className="w-4 h-4" />
                )}
                Sign & Finalize
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="diff" className="mt-4">
            <DiffView
              aiText={aiVersion}
              editedText={getEditedFullText()}
              splitView
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
