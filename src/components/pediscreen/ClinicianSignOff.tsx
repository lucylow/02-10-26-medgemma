/**
 * ClinicianSignOff — minimal explicit sign-off for human-in-the-loop.
 * Requires clinician note (auditable) before finalizing.
 */
import React, { useState } from 'react';
import { toast } from 'sonner';

const API_BASE =
  import.meta.env.VITE_MEDGEMMA_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://api.pediscreen.ai/v1');
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-example-key';

export interface ClinicianSignOffProps {
  reportId: string;
  onSigned: () => void;
  apiKey?: string;
  authToken?: string;
  className?: string;
}

export default function ClinicianSignOff({
  reportId,
  onSigned,
  apiKey,
  authToken,
  className = '',
}: ClinicianSignOffProps) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  async function sign() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sign_note: note,
        clinician_id: 'clinician',
      });
      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      if (apiKey) headers['x-api-key'] = apiKey;

      const res = await fetch(`${API_BASE}/reports/${reportId}/approve`, {
        method: 'POST',
        headers,
        body: params,
      });
      if (res.ok) {
        onSigned();
        toast.success("Sign-off recorded");
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.detail || 'Sign-off failed';
        toast.error("Sign-off failed", { description: msg });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error. Please try again.";
      toast.error("Sign-off failed", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`p-3 border rounded ${className}`}>
      <label htmlFor="clinician-signoff-note" className="text-xs font-medium">Clinician sign-off note (required)</label>
      <input
        id="clinician-signoff-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full border p-2 rounded mt-1"
        placeholder="Add context, corrections, or clinical observations..."
      />
      <div className="mt-2 text-right">
        <button
          className="px-3 py-2 rounded bg-primary text-white disabled:opacity-50"
          onClick={sign}
          disabled={!note.trim() || loading}
        >
          {loading ? 'Signing...' : 'Sign & Finalize'}
        </button>
      </div>
    </div>
  );
}
