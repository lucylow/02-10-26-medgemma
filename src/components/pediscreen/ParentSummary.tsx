/**
 * Parent-facing simplified UI — calm, plain-language view of the draft
 * with consent controls and share toggles.
 */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Download, MessageSquare, Shield } from "lucide-react";

type Props = {
  report: Record<string, unknown> | null;
  onSharePreference?: (share: boolean) => void;
  onDownload?: () => void;
  className?: string;
};

export default function ParentSummary({
  report,
  onSharePreference,
  onDownload,
  className,
}: Props) {
  const [share, setShare] = useState(true);

  if (!report) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">No summary yet.</p>
        </CardContent>
      </Card>
    );
  }

  const parentSummary =
    (report.parent_summary as string) ??
    (report.parentFriendlyExplanation as string) ??
    (report.summary as string) ??
    "";
  const recommendations = (report.recommendations as string[]) ?? [];

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">About this screening</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {parentSummary || "No summary available."}
        </p>

        {recommendations.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-2">
              Next steps (suggested)
            </div>
            <ul className="list-disc ml-5 space-y-1 text-sm text-foreground">
              {recommendations.slice(0, 3).map((r: string, i: number) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={share}
              onChange={(e) => {
                const checked = (e.target as HTMLInputElement).checked;
                setShare(checked);
                onSharePreference?.(checked);
              }}
              className="rounded border-input"
            />
            Share de-identified data to improve PediScreen
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              className="gap-2"
              onClick={() => onDownload?.()}
            >
              <Download className="w-4 h-4" />
              Download summary
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() =>
                alert("A clinician will review this and follow up.")
              }
            >
              <MessageSquare className="w-4 h-4" />
              Request clinician follow-up
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-2 pt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <Shield className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            You can change sharing preferences later at any time. Images are optional and never shared without consent.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
