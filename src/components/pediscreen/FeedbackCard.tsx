/**
 * FeedbackCard — Submit clinician feedback for an inference/screening (POST /api/feedback).
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Send, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createFeedback, type FeedbackType, type CorrectedRisk } from '@/api/feedback';

type FeedbackCardProps = {
  inferenceId: string;
  caseId: string;
  currentRisk?: string;
  apiKey?: string;
  className?: string;
};

const FEEDBACK_TYPES: { value: FeedbackType; label: string }[] = [
  { value: 'comment', label: 'Comment' },
  { value: 'rating', label: 'Rating (1–5)' },
  { value: 'correction', label: 'Correction' },
];

const RISK_OPTIONS: { value: CorrectedRisk; label: string }[] = [
  { value: 'on_track', label: 'On track' },
  { value: 'low', label: 'Low' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'refer', label: 'Refer' },
  { value: 'high', label: 'High' },
];

export function FeedbackCard({
  inferenceId,
  caseId,
  currentRisk,
  apiKey,
  className,
}: FeedbackCardProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('comment');
  const [rating, setRating] = useState<number | ''>(3);
  const [comment, setComment] = useState('');
  const [correctedRisk, setCorrectedRisk] = useState<CorrectedRisk | ''>('');
  const [correctedSummary, setCorrectedSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (feedbackType === 'rating' && (rating === '' || rating < 1 || rating > 5)) {
      toast({ title: 'Invalid rating', description: 'Choose 1–5', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await createFeedback({
        inference_id: inferenceId,
        case_id: caseId,
        feedback_type: feedbackType,
        ...(feedbackType === 'rating' && rating !== '' && { rating: Number(rating) }),
        ...(comment.trim() && { comment: comment.trim() }),
        ...(feedbackType === 'correction' && correctedRisk && { corrected_risk: correctedRisk }),
        ...(feedbackType === 'correction' && correctedSummary.trim() && { corrected_summary: correctedSummary.trim() }),
      });
      setSubmitted(true);
      toast({ title: 'Feedback submitted', description: 'Thank you for helping improve the model.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit feedback';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>Feedback recorded. You can submit more below.</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setSubmitted(false)}
          >
            Submit another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Clinician feedback
        </CardTitle>
        <p className="text-sm text-muted-foreground font-normal">
          Rate or correct this screening to improve AI (auditable).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={feedbackType} onValueChange={(v) => setFeedbackType(v as FeedbackType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FEEDBACK_TYPES.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {feedbackType === 'rating' && (
          <div className="space-y-2">
            <Label>Rating (1–5)</Label>
            <Select
              value={rating === '' ? '' : String(rating)}
              onValueChange={(v) => setRating(v === '' ? '' : Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {feedbackType === 'correction' && (
          <>
            {currentRisk && (
              <p className="text-xs text-muted-foreground">Current risk: {currentRisk}</p>
            )}
            <div className="space-y-2">
              <Label>Corrected risk</Label>
              <Select
                value={correctedRisk}
                onValueChange={(v) => setCorrectedRisk(v as CorrectedRisk)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {RISK_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Corrected summary (optional)</Label>
              <Textarea
                placeholder="Brief corrected summary"
                value={correctedSummary}
                onChange={(e) => setCorrectedSummary(e.target.value)}
                rows={2}
              />
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label>Comment (optional)</Label>
          <Textarea
            placeholder="Notes for audit"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="gap-2"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Submit feedback
        </Button>
      </CardContent>
    </Card>
  );
}
