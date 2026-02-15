/**
 * EHRExportButton — "Send to EHR" with consent dialog and export format dropdown.
 * Triggers FHIR bundle export or push to EHR.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ExternalLink, Loader2 } from 'lucide-react';
import { exportFhirBundle, exportPdf, exportHl7v2, pushBundleToEhr, EHR_CONSENT_COPY } from '@/services/interopApi';

type Props = {
  caseId: string;
  screeningId?: string;
  fhirBaseUrl?: string;
  fhirToken?: string;
  apiKey?: string;
  onSuccess?: (exportId?: string) => void;
  onError?: (err: Error) => void;
  className?: string;
};

const EHRExportButton: React.FC<Props> = ({
  caseId,
  screeningId,
  fhirBaseUrl,
  fhirToken,
  apiKey,
  onSuccess,
  onError,
  className,
}) => {
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<'export' | 'push' | 'pdf' | 'hl7' | null>(null);

  const id = caseId || screeningId;

  const handleExportPdf = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const blob = await exportPdf(id, apiKey);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `pediscreen_report_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      onSuccess?.();
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleExportHl7 = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const text = await exportHl7v2(id, apiKey);
      const blob = new Blob([text], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `pediscreen_${id}.hl7`;
      a.click();
      URL.revokeObjectURL(a.href);
      onSuccess?.();
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleExportFhir = () => {
    if (!id) return;
    setPendingAction('export');
    setConsentOpen(true);
  };

  const handlePush = () => {
    if (!id || !fhirBaseUrl || !fhirToken) {
      onError?.(new Error('FHIR URL and token required to push to EHR'));
      return;
    }
    setPendingAction('push');
    setConsentOpen(true);
  };

  const onConsentConfirm = async () => {
    if (!id) return;
    setLoading(true);
    try {
      if (pendingAction === 'export') {
        const bundle = await exportFhirBundle(id, true, apiKey);
        onSuccess?.();
        // Optionally download as JSON
        const blob = new Blob([JSON.stringify(bundle, null, 2)], {
          type: 'application/json',
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `pediscreen-fhir-${id}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      } else if (pendingAction === 'push' && fhirBaseUrl && fhirToken) {
        const res = await pushBundleToEhr(
          {
            case_id: id,
            fhir_base_url: fhirBaseUrl,
            fhir_token: fhirToken,
            consent_given: true,
          },
          apiKey
        );
        onSuccess?.(res.export_id);
      }
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
      setConsentOpen(false);
      setPendingAction(null);
    }
  };

  const onConsentCancel = () => {
    setConsentOpen(false);
    setPendingAction(null);
    setConsentGiven(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={className} size="sm">
            <ExternalLink className="w-4 h-4 mr-2" />
            Send to EHR
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportFhir}>
            Export FHIR (JSON)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportPdf}>
            Export PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportHl7}>
            Export HL7 v2
          </DropdownMenuItem>
          {fhirBaseUrl && fhirToken && (
            <DropdownMenuItem onClick={handlePush}>
              Push to EHR (SMART)
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={consentOpen} onOpenChange={(o) => !o && onConsentCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>EHR Sharing Consent</AlertDialogTitle>
            <AlertDialogDescription>
              {EHR_CONSENT_COPY}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onConsentCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setConsentGiven(true);
                onConsentConfirm();
              }}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              I agree
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EHRExportButton;
