/**
 * SMART-on-FHIR launch entry when opened from Epic (or other EHR).
 * URL: /smart/launch?iss=...&launch=...
 * Redirects to backend /api/fhir/launch to start OAuth flow.
 */
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const BACKEND =
  import.meta.env.VITE_PEDISCREEN_BACKEND_URL ||
  import.meta.env.VITE_MEDGEMMA_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");

export default function SmartLaunch() {
  const [searchParams] = useSearchParams();
  const iss = searchParams.get("iss");
  const launch = searchParams.get("launch");

  useEffect(() => {
    if (!BACKEND) {
      return;
    }
    if (iss && launch) {
      const url = `${BACKEND.replace(/\/$/, "")}/api/fhir/launch?${new URLSearchParams({
        iss,
        launch,
      }).toString()}`;
      window.location.href = url;
    }
  }, [iss, launch]);

  if (!BACKEND) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <p className="text-destructive">VITE_PEDISCREEN_BACKEND_URL or VITE_MEDGEMMA_API_URL not set.</p>
      </div>
    );
  }
  if (!iss || !launch) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <p className="text-muted-foreground">Missing iss or launch parameters from EHR.</p>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 p-4">
      <div className="animate-pulse text-muted-foreground">Redirecting to Epic…</div>
      <p className="text-sm text-muted-foreground">Connecting to EHR authorization.</p>
    </div>
  );
}
