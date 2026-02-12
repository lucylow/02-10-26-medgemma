import React from 'react';
import { Lock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type ReportSectionData = {
  id: string;
  title: string;
  content: string;
  locked: boolean;
};

interface EditableSectionProps {
  section: ReportSectionData;
  onChange: (sectionId: string, value: string) => void;
}

export function EditableSection({ section, onChange }: EditableSectionProps) {
  return (
    <div className="border rounded-lg p-4 mb-4 bg-card">
      <h3 className="font-semibold flex items-center justify-between gap-2">
        {section.title}
        {section.locked && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" />
            Locked
          </span>
        )}
      </h3>
      <Textarea
        disabled={section.locked}
        value={section.content}
        onChange={(e) => onChange(section.id, e.target.value)}
        className={cn(
          'w-full mt-3 min-h-[100px] font-mono text-sm',
          section.locked && 'bg-muted cursor-not-allowed'
        )}
        placeholder={section.locked ? '' : 'Edit content…'}
      />
    </div>
  );
}
