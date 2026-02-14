/**
 * AI Visual Attention (Explainability) heatmap viewer.
 * FDA-appropriate labeling: non-diagnostic, clinician-only context.
 */
import { getExplainabilityImageUrl } from "@/services/radiologyApi";

interface ExplainabilityHeatmapProps {
  studyId: string;
  className?: string;
}

export default function ExplainabilityHeatmap({ studyId, className = "" }: ExplainabilityHeatmapProps) {
  const src = getExplainabilityImageUrl(studyId);

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold">AI Visual Attention (Explainability)</h3>
      <p className="text-xs text-muted-foreground mb-2">
        Highlighted regions influenced the AI triage suggestion. Not a diagnostic image.
      </p>
      <img
        src={src}
        className="rounded border max-w-full"
        alt="AI explainability heatmap"
      />
    </div>
  );
}
