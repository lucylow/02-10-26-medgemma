import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StreamingResults } from "@/components/pediscreen/StreamingResults";
import type { StreamScreeningRequest } from "@/services/screeningApi";
import { Brain, Sparkles, Activity, Shield, ArrowRight } from "lucide-react";

const DEFAULT_REQUEST: StreamScreeningRequest = {
  childAge: "24",
  domain: "communication",
  observations:
    "My 2-year-old says about 10 words and points to what he wants. He follows simple instructions but doesn't use two-word phrases yet.",
};

const Agents: React.FC = () => {
  const [request] = React.useState<StreamScreeningRequest>(DEFAULT_REQUEST);
  const [hasCompleted, setHasCompleted] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Agent orchestrator
            </h1>
            <p className="text-muted-foreground text-sm">
              Watch the intake, embedding, temporal, MedGemma, and safety agents work together.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="rounded-full text-xs px-4 py-1">
          Demo stream • Uses mock or backend if available
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Example intake
            </CardTitle>
            <CardDescription>
              A sample caregiver description used to trigger the live pipeline demo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2">
              Age: <strong>24 months</strong> • Domain: <strong>Communication</strong>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {request.observations}
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-2 rounded-xl gap-2"
              onClick={() => {
                setHasCompleted(false);
                setErrorMessage(null);
              }}
            >
              Rerun pipeline
              <ArrowRight className="w-3 h-3" />
            </Button>
            {hasCompleted && !errorMessage && (
              <p className="text-xs text-emerald-700 flex items-center gap-1 mt-1">
                <Activity className="w-3 h-3" />
                Pipeline completed successfully.
              </p>
            )}
            {errorMessage && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <Shield className="w-3 h-3" />
                {errorMessage}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <StreamingResults
              request={request}
              onComplete={() => setHasCompleted(true)}
              onError={(err) => setErrorMessage(err)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Agents;

