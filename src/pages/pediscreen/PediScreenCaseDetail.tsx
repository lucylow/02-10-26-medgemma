/**
 * PediScreenCaseDetail — Medical case detail with agent chain transparency
 */

import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Brain, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAgents } from '@/contexts/AgentContext';
import { getScreening } from '@/services/screeningApi';
import { getDataQuality } from '@/api/dataQuality';
import { useQuery } from '@tanstack/react-query';
import { AgentNode } from '@/components/pediscreen/AgentNode';

export default function PediScreenCaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useAgents();

  const isActiveCase = state.currentCaseId === id;
  const pipeline = isActiveCase ? state.pipeline : [];

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['pediscreen-case', id],
    queryFn: () => getScreening(id!),
    enabled: !!id && !id.startsWith('case_'),
  });

  const { data: quality } = useQuery({
    queryKey: ['data-quality', id],
    queryFn: () => getDataQuality(id!),
    enabled: !!id && !id.startsWith('case_'),
  });

  if (!id) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-muted-foreground">Missing case ID</p>
        <Link to="/pediscreen/dashboard">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading && !caseData && !isActiveCase) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const report = caseData?.report ?? {};
  const hasPipeline = pipeline.length > 0;
  const observations = caseData?.observations ?? (isActiveCase ? 'In-progress pipeline' : '—');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button
        variant="ghost"
        className="gap-2 -ml-2"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Case #{id.slice(-8)}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {caseData?.domain ?? 'General'} • {caseData?.child_age_months ?? '—'} months
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Observations</h3>
              <p className="text-sm text-muted-foreground">
                {observations}
              </p>
            </div>
            {report.summary && (
              <div>
                <h3 className="font-medium mb-1">Summary</h3>
                <p className="text-sm text-muted-foreground">{report.summary}</p>
              </div>
            )}
            {report.riskLevel && (
              <div>
                <h3 className="font-medium mb-1">Risk Level</h3>
                <span
                  className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                    (report.riskLevel as string)?.toLowerCase() === 'on_track' ||
                    (report.riskLevel as string)?.toLowerCase() === 'low'
                      ? 'bg-emerald-100 text-emerald-800'
                      : (report.riskLevel as string)?.toLowerCase() === 'refer' ||
                          (report.riskLevel as string)?.toLowerCase() === 'high'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {String(report.riskLevel)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {!id.startsWith('case_') && quality && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {quality.completeness_score >= 0.8 ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
                Data quality
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Completeness: {Math.round(quality.completeness_score * 100)}%</p>
              {quality.missing_fields?.length > 0 && (
                <p className="text-amber-700">Missing: {quality.missing_fields.join(', ')}</p>
              )}
              {quality.warnings?.length > 0 && (
                <ul className="list-disc list-inside text-muted-foreground">
                  {quality.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
              {quality.consent_present != null && (
                <p className="text-muted-foreground">Consent: {quality.consent_present ? 'Yes' : 'No'}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Agent Chain Transparency */}
        {hasPipeline && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain size={20} />
                Agent Chain Evidence
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Pipeline execution for this case
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {pipeline.map((agent, index) => (
                  <AgentNode
                    key={agent.id}
                    agent={agent.id}
                    status={agent.status}
                    position={index + 1}
                    total={pipeline.length}
                    mode={state.mode}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/pediscreen/screening')}
            className="rounded-xl"
          >
            New Screening
          </Button>
          <Button
            onClick={() => navigate('/pediscreen/dashboard')}
            className="rounded-xl bg-primary"
          >
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
