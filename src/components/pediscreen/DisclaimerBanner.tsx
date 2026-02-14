/**
 * Disclaimer banner — shown prominently on screening and report pages.
 * Reinforces CDS / human-in-the-loop positioning for regulators.
 */
import { DISCLAIMER_SHORT } from '@/constants/disclaimers';

export default function DisclaimerBanner() {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200 rounded-lg mb-3">
      <strong>Note:</strong> {DISCLAIMER_SHORT}
    </div>
  );
}
