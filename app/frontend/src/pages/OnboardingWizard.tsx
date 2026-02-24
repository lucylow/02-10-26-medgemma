import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Hospital, MapPin, Users, Shield, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

const STEPS = [
  { title: "Clinic details", description: "Name, country/region, and care setting." },
  { title: "Team roles", description: "Who will use PediScreen AI day to day." },
  { title: "Data & consent", description: "How you collect consent and share results." },
  { title: "Integrations", description: "Optional EHR, Apple Health, and smart home links." },
  { title: "Review & launch", description: "Confirm settings and start first pilot cases." },
] as const;

const OnboardingWizard: React.FC = () => {
  const [step, setStep] = useState(0);
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Hospital className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Clinic onboarding
          </h1>
          <p className="text-muted-foreground text-sm">
            A short setup to tailor PediScreen AI to your workflow.
          </p>
        </div>
        <Badge variant="outline" className="ml-auto hidden sm:inline-flex rounded-full text-[11px]">
          ~5 minutes
        </Badge>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <CardTitle className="text-lg">{STEPS[step].title}</CardTitle>
              <CardDescription>{STEPS[step].description}</CardDescription>
            </div>
            <span className="text-xs text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 0 && (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Tell us where PediScreen AI will be used so we can align content with regional
                guidelines.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Clinic or hospital name</li>
                <li>Country/region</li>
                <li>Primary care setting (clinic, home visiting, school, etc.)</li>
              </ul>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>Decide who will create screenings and who will review and sign off.</p>
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-primary" />
                <span>Typical mix: pediatricians, nurse practitioners, CHWs, therapists.</span>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Confirm how caregiver consent is captured and how summaries are shared back with
                families, including any passive home monitoring.
              </p>
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>We never use data for training without explicit consent.</span>
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li>Document how you obtain consent for nursery cameras, wearables, and home audio.</li>
                <li>
                  Decide whether home data is used only for local context or also shared in clinician
                  summaries.
                </li>
                <li>
                  Align language with your institutional review board (IRB) or ethics committee where
                  applicable.
                </li>
              </ul>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Choose which integrations you want for the pilot: EHR launch links, Apple Health
                sharing, or smart home posture data from devices families already own.
              </p>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-sky-600" />
                <span>All integrations are optional and can be disabled at any time.</span>
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li>Nest / nursery cam for tummy time, rolling, and sitting summaries (edge only).</li>
                <li>Ring doorbell for stranger-anxiety and approach / avoidance patterns.</li>
                <li>Ecobee thermostat for cry patterns and comfort context (no raw audio stored).</li>
              </ul>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                You&apos;re ready to start a small pilot.
              </p>
              <div className="flex items-center gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Start with a limited number of families, gather feedback, and adjust workflows
                  before scaling.
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t mt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 rounded-xl"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1 rounded-xl"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            >
              {step === STEPS.length - 1 ? "Finish" : "Next"}
              {step < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingWizard;

