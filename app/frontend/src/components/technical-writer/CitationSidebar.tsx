import React from 'react';
import { FileSearch } from 'lucide-react';

interface CitationSidebarProps {
  placeholders: string[];
}

export function CitationSidebar({ placeholders }: CitationSidebarProps) {
  if (placeholders.length === 0) return null;

  return (
    <aside className="border-l p-4 w-64 shrink-0 bg-muted/30">
      <h4 className="font-semibold flex items-center gap-2 text-sm">
        <FileSearch className="w-4 h-4" />
        Citations
      </h4>
      <p className="text-xs text-muted-foreground mt-1 mb-3">
        Add references later — no fabricated citations
      </p>
      <div className="space-y-2">
        {placeholders.map((ref) => (
          <div key={ref} className="text-sm flex items-start gap-2">
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {ref}
            </code>
            <span className="text-muted-foreground italic">→ Add reference</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
