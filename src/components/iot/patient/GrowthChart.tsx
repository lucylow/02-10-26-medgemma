import React from "react";

// Placeholder growth chart – in a real deployment, this would be backed by WHO/CDC curves.
export const GrowthChart: React.FC = () => {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-500">
      Pediatric growth chart integration placeholder. Plot weight, length, and
      head circumference percentiles against age using WHO/CDC references.
    </div>
  );
};

