/**
 * FeedbackList — Display past feedback per inference/case (Page 7)
 */
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Star, Loader2 } from "lucide-react";
import { getFeedbackForInference, getFeedbackForCase, type FeedbackItem } from "@/services/feedbackService";

export interface FeedbackListProps {
  inferenceId?: string;
  caseId?: string;
  apiKey?: string;
}

const FeedbackList: React.FC<FeedbackListProps> = ({
  inferenceId,
  caseId,
  apiKey,
}) => {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inferenceId && !caseId) return;
    setLoading(true);
    setError(null);
    const fetchData = async () => {
      try {
        if (inferenceId) {
          const res = await getFeedbackForInference(inferenceId, apiKey);
          setItems(res.feedback);
        } else if (caseId) {
          const res = await getFeedbackForCase(caseId, apiKey);
          setItems(res.feedback);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load feedback");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [inferenceId, caseId, apiKey]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading feedback...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-4 text-destructive text-sm">{error}</CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          No feedback yet for this inference.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Feedback History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((f) => (
            <li
              key={f.feedback_id}
              className="p-3 rounded-lg border bg-muted/30 text-sm"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium text-muted-foreground">
                  Clinician • {new Date(f.provided_at).toLocaleString()}
                </span>
                {f.rating != null && (
                  <span className="flex items-center gap-0.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {f.rating}
                  </span>
                )}
              </div>
              {f.corrected_risk && (
                <p>
                  <span className="text-muted-foreground">Corrected risk:</span>{" "}
                  {f.corrected_risk}
                </p>
              )}
              {f.comment && <p className="mt-1">{f.comment}</p>}
              {f.corrected_summary && (
                <p className="mt-1 text-muted-foreground italic">
                  {f.corrected_summary}
                </p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default FeedbackList;
