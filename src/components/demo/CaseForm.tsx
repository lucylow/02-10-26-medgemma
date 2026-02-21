/**
 * Case form stub for demos — age, observations, submit.
 * Used in Storybook and E2E for clinician flow.
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface CaseFormProps {
  ageMonths?: number;
  observations?: string;
  onSubmit?: (payload: { ageMonths: number; observations: string }) => void;
  submitLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function CaseForm({
  ageMonths: initialAge = 24,
  observations: initialObs = "",
  onSubmit,
  submitLabel = "Run AI Agent",
  disabled = false,
  className,
}: CaseFormProps) {
  const [ageMonths, setAgeMonths] = React.useState(String(initialAge));
  const [observations, setObservations] = React.useState(initialObs);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const age = parseInt(ageMonths, 10) || 0;
    onSubmit?.({ ageMonths: age, observations: observations.trim() });
  };

  return (
    <Card className={cn("w-full max-w-lg", className)}>
      <CardHeader>
        <CardTitle>New screening case</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="age">Age (months)</Label>
            <Input
              id="age"
              type="number"
              min={0}
              max={240}
              value={ageMonths}
              onChange={(e) => setAgeMonths(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="obs">Observations</Label>
            <Textarea
              id="obs"
              placeholder="e.g. Delayed speech, limited words..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={4}
              disabled={disabled}
            />
          </div>
          <Button type="submit" disabled={disabled}>
            {submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default CaseForm;
