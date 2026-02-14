/**
 * InferenceFeedbackForm — Clinician feedback on AI outputs (Pages 5, 6, 14)
 * Structured feedback tied to inference IDs for model improvement.
 */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Star, Loader2, Send, Shield } from "lucide-react";
import {
  submitFeedback,
  type FeedbackCreate,
  type RiskLevel,
} from "@/services/feedbackService";
import { useToast } from "@/hooks/use-toast";

const RISK_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: "low", label: "Low / On Track" },
  { value: "monitor", label: "Monitor" },
  { value: "refer", label: "Refer" },
  { value: "on_track", label: "On Track" },
  { value: "high", label: "High" },
];

export interface InferenceFeedbackFormProps {
  inferenceId: string;
  caseId: string;
  aiRisk?: string;
  aiSummary?: string;
  onSuccess?: () => void;
  apiKey?: string;
}

const InferenceFeedbackForm: React.FC<InferenceFeedbackFormProps> = ({
  inferenceId,
  caseId,
  aiRisk,
  aiSummary,
  onSuccess,
  apiKey,
}) => {
  const { toast } = useToast();
  const [correctedRisk, setCorrectedRisk] = useState<string>(aiRisk || "");
  const [correctedSummary, setCorrectedSummary] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [clinicianNotes, setClinicianNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctedRisk && !rating && !comment && !correctedSummary) {
      toast({
        title: "Please provide feedback",
        description: "Add at least one field: corrected risk, rating, or comment.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: FeedbackCreate = {
        inference_id: inferenceId,
        case_id: caseId,
        feedback_type: "correction",
        corrected_risk: correctedRisk as RiskLevel,
        corrected_summary: correctedSummary || undefined,
        rating: rating ?? undefined,
        comment: comment || undefined,
        clinician_notes: clinicianNotes || undefined,
      };
      if (rating && !correctedRisk && !comment) {
        payload.feedback_type = "rating";
      } else if (comment && !correctedRisk && !rating) {
        payload.feedback_type = "comment";
      }

      await submitFeedback(payload, apiKey);
      toast({
        title: "Feedback submitted",
        description: "Your feedback helps improve future AI predictions.",
      });
      onSuccess?.();
      setCorrectedRisk("");
      setCorrectedSummary("");
      setRating(null);
      setComment("");
      setClinicianNotes("");
    } catch (err) {
      toast({
        title: "Failed to submit feedback",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Provide Feedback on AI Output
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Your feedback helps improve future AI predictions. Feedback is
          confidential and used only for model refinement.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="corrected-risk">Correct Risk?</Label>
            <Select
              value={correctedRisk || aiRisk || "none"}
              onValueChange={(v) => setCorrectedRisk(v === "none" ? "" : v)}
            >
              <SelectTrigger id="corrected-risk" aria-label="Select corrected risk level">
                <SelectValue placeholder="Select risk level (or affirm AI)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Affirm AI result —</SelectItem>
                {RISK_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="corrected-summary">Suggested Summary / Comments</Label>
            <Textarea
              id="corrected-summary"
              placeholder="Suggest edits to the AI summary or add comments..."
              value={correctedSummary}
              onChange={(e) => setCorrectedSummary(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Rating (1–5 stars)</Label>
            <div className="flex gap-1" role="group" aria-label="Rate this output">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  aria-label={`Rate ${n} stars`}
                >
                  <Star
                    className={`w-6 h-6 ${
                      rating !== null && n <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Additional Comments</Label>
            <Textarea
              id="comment"
              placeholder="Any other feedback..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinician-notes">Clinician Notes (internal)</Label>
            <Textarea
              id="clinician-notes"
              placeholder="Optional internal notes..."
              value={clinicianNotes}
              onChange={(e) => setClinicianNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit Feedback
          </Button>
        </form>

        <div className="flex gap-2 text-[10px] text-muted-foreground pt-2 border-t">
          <Shield className="w-3 h-3 shrink-0 mt-0.5" />
          <span>
            Feedback is confidential and used only for model refinement.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default InferenceFeedbackForm;
