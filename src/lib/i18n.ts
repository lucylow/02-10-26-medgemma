/**
 * i18n scaffold — wrap app with I18nextProvider when ready.
 * For now, strings are externalized in locales/en.json for future translation.
 */

export const t = (key: string, fallback?: string): string => {
  // Lazy load translations when i18next is integrated
  const translations: Record<string, string> = {
    "app.title": "PediScreen AI",
    "app.subtitle": "Quick Screening",
    "home.start": "Start screening",
    "home.clinician": "Clinician Dashboard",
    "home.settings": "Settings",
    "capture.photo": "Capture Photo",
    "capture.upload": "Upload Drawing",
    "capture.voice": "Record Voice",
    "results.share": "Share",
    "results.savePdf": "Save PDF",
    "results.referral": "Request Referral",
  };
  return translations[key] ?? fallback ?? key;
};
