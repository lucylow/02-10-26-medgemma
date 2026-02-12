import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface DiffViewProps {
  aiText: string;
  editedText: string;
  splitView?: boolean;
}

function simpleDiff(oldStr: string, newStr: string) {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const maxLen = Math.max(oldLines.length, newLines.length);
  const lines: { oldLine: string; newLine: string; changed: boolean }[] = [];

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i] ?? '';
    const newLine = newLines[i] ?? '';
    lines.push({
      oldLine,
      newLine,
      changed: oldLine !== newLine,
    });
  }
  return lines;
}

export function DiffView({ aiText, editedText, splitView = true }: DiffViewProps) {
  const lines = simpleDiff(aiText, editedText);

  if (splitView) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/50 px-4 py-2 border-b text-sm font-medium flex justify-between">
          <span className="text-destructive/90">AI Draft (Left)</span>
          <span className="text-primary">Clinician Edited (Right)</span>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="font-mono text-sm">
            {lines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  'grid grid-cols-2 gap-0 border-b border-border/50',
                  line.changed && 'bg-amber-500/5'
                )}
              >
                <div
                  className={cn(
                    'p-2 border-r break-words',
                    line.changed && 'bg-destructive/5'
                  )}
                >
                  {line.oldLine || '\u00A0'}
                </div>
                <div
                  className={cn('p-2 break-words', line.changed && 'bg-green-500/5')}
                >
                  {line.newLine || '\u00A0'}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 border-b text-sm font-medium">
        AI Draft vs Clinician Edited
      </div>
      <ScrollArea className="h-[400px]">
        <div className="font-mono text-sm p-4 space-y-1">
          {lines.map((line, i) =>
            line.changed ? (
              <div key={i} className="flex gap-4">
                <span className="text-destructive line-through shrink-0 w-1/2">
                  {line.oldLine || '\u00A0'}
                </span>
                <span className="text-green-600 dark:text-green-400 flex-1">
                  {line.newLine || '\u00A0'}
                </span>
              </div>
            ) : (
              <div key={i}>{line.oldLine || '\u00A0'}</div>
            )
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
