import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TechnicalWriterEditor } from '@/components/technical-writer/TechnicalWriterEditor';

export default function DetailedReportEditor() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  if (!reportId) {
    return (
      <div className="p-4 text-destructive">Missing report ID</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <TechnicalWriterEditor
        reportId={reportId}
        onFinalized={() => navigate('/pediscreen/results')}
      />
    </div>
  );
}
