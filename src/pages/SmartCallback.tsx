/**
 * SMART-on-FHIR OAuth callback. EHR redirects here with ?code=...&state=...&iss=...
 * Exchanges code via backend, stores token in sessionStorage (no PHI), redirects to app.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const BACKEND =
  import.meta.env.VITE_PEDISCREEN_BACKEND_URL ||
  import.meta.env.VITE_MEDGEMMA_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");

const FHIR_TOKEN_KEY = "pediscreen_fhir_token";
const FHIR_PATIENT_KEY = "pediscreen_fhir_patient";
const FHIR_ISS_KEY = "pediscreen_fhir_iss";

export function getStoredFhirToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(FHIR_TOKEN_KEY);
}

export function getStoredFhirPatient(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(FHIR_PATIENT_KEY);
}

export function getStoredFhirIss(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(FHIR_ISS_KEY);
}

export function clearStoredFhirContext(): void {
  sessionStorage.removeItem(FHIR_TOKEN_KEY);
  sessionStorage.removeItem(FHIR_PATIENT_KEY);
  sessionStorage.removeItem(FHIR_ISS_KEY);
}

export default function SmartCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const iss = searchParams.get("iss") || "";

    if (!code) {
      setError("Missing authorization code");
      return;
    }
    if (!BACKEND) {
      setError("Backend URL not configured");
      return;
    }

    const params = new URLSearchParams({ code, iss });
    if (state) params.set("state", state);
    const url = `${BACKEND.replace(/\/$/, "")}/api/fhir/callback?${params.toString()}`;

    fetch(url, { method: "GET", credentials: "omit" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.detail || data.error || "Token exchange failed");
          return;
        }
        const token = data.access_token;
        const patient = data.patient;
        if (token && typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(FHIR_TOKEN_KEY, token);
          if (patient) sessionStorage.setItem(FHIR_PATIENT_KEY, String(patient));
          if (iss) sessionStorage.setItem(FHIR_ISS_KEY, iss);
        }
        navigate("/pediscreen", { replace: true });
      })
      .catch(() => setError("Network error"));
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 p-4">
        <p className="text-destructive">{error}</p>
        <button
          type="button"
          className="rounded bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => navigate("/pediscreen", { replace: true })}
        >
          Continue to PediScreen
        </button>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 p-4">
      <div className="animate-pulse text-muted-foreground">Connecting to Epic…</div>
      <p className="text-sm text-muted-foreground">Completing sign-in.</p>
    </div>
  );
}
