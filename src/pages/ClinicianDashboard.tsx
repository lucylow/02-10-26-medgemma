import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ClipboardList, FileText, Shield } from "lucide-react";
import { DISCLAIMER_SHORT } from "@/constants/disclaimers";
import ClinicianReview from "@/components/pediscreen/ClinicianReview";
import { listDrafts } from "@/api/medgemma";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    googleToken?: string;
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (resp: { credential: string }) => void }) => void;
          prompt: () => void;
          renderButton: (el: HTMLElement, config: object) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function ClinicianDashboard() {
  const [drafts, setDrafts] = useState<{ report_id: string; screening_id?: string; created_at?: number }[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const { toast } = useToast();

  async function load() {
    const token = window.googleToken;
    if (!token) {
      setLoading(false);
      setSignedIn(false);
      return;
    }
    try {
      const j = await listDrafts(token);
      setDrafts(j.items || []);
      setSignedIn(true);
    } catch (e) {
      toast({
        title: "Could not load drafts",
        description: e instanceof Error ? e.message : "Authentication may have expired.",
        variant: "destructive",
      });
      setSignedIn(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (window.googleToken) {
      load();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (GOOGLE_CLIENT_ID && typeof window !== "undefined") {
      const initGoogle = () => {
        if (window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (resp) => {
              window.googleToken = resp.credential;
              setSignedIn(true);
              load();
            },
          });
          window.google.accounts.id.prompt();
          const el = document.getElementById("google-signin-button");
          if (el && window.google.accounts.id.renderButton) {
            window.google.accounts.id.renderButton(el, {
              type: "standard",
              theme: "outline",
              size: "large",
              text: "signin_with",
            });
          }
        }
      };
      const t = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(t);
          initGoogle();
        }
      }, 100);
      return () => clearInterval(t);
    }
  }, []);

  if (active) {
    return (
      <div className="container max-w-3xl py-6">
        <ClinicianReview
          reportId={active}
          onDone={() => {
            setActive(null);
            load();
          }}
          authToken={window.googleToken}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container max-w-3xl py-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!signedIn || !window.googleToken) {
    return (
      <div className="container max-w-md py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-6 h-6" />
              Clinician Dashboard
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in with your clinic Google account to review and sign draft reports.
            </p>
          </CardHeader>
          <CardContent>
            {GOOGLE_CLIENT_ID ? (
              <div id="google-signin-button" />
            ) : (
              <p className="text-sm text-amber-600">
                VITE_GOOGLE_CLIENT_ID not configured. Add it to your .env to enable clinician sign-in.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-6">
      <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-primary/5 border border-primary/10 text-sm text-muted-foreground">
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
        {DISCLAIMER_SHORT}
      </div>
      <h1 className="text-xl font-semibold flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5" />
        Draft Reports
      </h1>
      <ul className="space-y-3">
        {drafts.length === 0 ? (
          <li className="p-6 rounded-lg border border-dashed text-center text-muted-foreground">
            No draft reports to review.
          </li>
        ) : (
          drafts.map((d) => (
            <li
              key={d.report_id}
              className="p-4 rounded-lg border flex justify-between items-center hover:bg-muted/50 transition-colors"
            >
              <div>
                <div className="font-medium">{d.report_id}</div>
                <div className="text-xs text-muted-foreground">
                  {d.screening_id && `Screening: ${d.screening_id} · `}
                  {d.created_at ? new Date(d.created_at * 1000).toLocaleString() : ""}
                </div>
              </div>
              <Button
                onClick={() => setActive(d.report_id)}
                size="sm"
              >
                Review
              </Button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
