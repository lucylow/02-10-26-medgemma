/**
 * AI Result Card — HAI-structured output: risk, confidence, uncertainty,
 * evidence (expandable), rationale, recommended_actions, manual_review_required badge.
 */
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Shield, AlertTriangle, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AIResultCardResult {
  risk: string;
  confidence: number;
  uncertainty?: number;
  evidence?: { type?: string; detail?: string }[];
  rationale?: string[];
  recommended_actions?: string[];
  manual_review_required?: boolean;
}

interface AIResultCardProps {
  result: AIResultCardResult;
  className?: string;
}

const riskVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "secondary",
  monitor: "outline",
  refer: "destructive",
  high: "destructive",
};

export function AIResultCard({ result, className }: AIResultCardProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const {
    risk,
    confidence,
    uncertainty = 1 - confidence,
    evidence = [],
    rationale = [],
    recommended_actions = [],
    manual_review_required = false,
  } = result;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            AI Draft Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={riskVariant[risk] ?? "outline"}>{risk}</Badge>
            {manual_review_required && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                Review required
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Confidence</p>
            <Progress value={confidence * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(confidence * 100)}% confidence
              {uncertainty != null && uncertainty > 0 && (
                <span className="ml-2"> · {Math.round(uncertainty * 100)}% uncertainty</span>
              )}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {rationale.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Rationale</p>
            <ul className="text-sm list-disc ml-4 space-y-0.5">
              {rationale.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        {evidence.length > 0 && (
          <Collapsible open={evidenceOpen} onOpenChange={setEvidenceOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {evidenceOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Evidence ({evidence.length})
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="text-sm list-disc ml-4 mt-1 space-y-0.5 text-muted-foreground">
                {evidence.map((e, i) => (
                  <li key={i}>
                    {e.type && <span className="font-medium">{e.type}: </span>}
                    {e.detail ?? (e as { summary?: string }).summary}
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}
        {recommended_actions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Recommended actions</p>
            <ul className="text-sm list-disc ml-4 space-y-0.5">
              {recommended_actions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AIResultCard;
