import { VitalsDashboard as InternalVitalsDashboard } from "../VitalsDashboard";

// Medical domain-facing export for vitals monitoring dashboard.
// Keeps existing implementation in src/components/VitalsDashboard.tsx,
// but exposes a canonical path for the atomic medical library.
export const VitalsDashboard = InternalVitalsDashboard;

export default InternalVitalsDashboard;

