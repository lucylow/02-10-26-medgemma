// src/types/iot.ts - Pediatric IoT Remote Patient Monitoring types
// NOTE: These types are frontend-only and intentionally avoid any PHI identifiers.

export interface PediatricVitalSigns {
  timestamp: string; // ISO 8601
  heartRate: number; // bpm (0-300)
  respiratoryRate: number; // breaths/min (0-100)
  oxygenSaturation: number; // SpO2 % (0-100)
  bodyTemperature: number; // Celsius (20-45)
  activityLevel: "resting" | "light" | "moderate" | "vigorous" | "sleep";
  bloodPressure?: {
    systolic: number; // 30-250
    diastolic: number; // 20-150
  };
  deviceBattery: number; // 0-100%
  signalStrength: number; // -100 to -50 dBm
}

export type IoTDeviceType =
  | "wearable"
  | "bedside"
  | "chest_strap"
  | "smart_patch"
  | "camera";

export type IoTConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "error";

export interface IoTDevice {
  id: string;
  name: string;
  type: IoTDeviceType;
  model: string;
  macAddress: string;
  connectionStatus: IoTConnectionStatus;
  lastSeen: string; // ISO 8601
  batteryLevel: number; // 0-100
  firmwareVersion: string;
  /**
   * Pseudonymous identifier – should not contain PHI.
   * Use hashed or pseudorandom IDs only.
   */
  patientId?: string;
}

export type VitalAlertType = "critical" | "warning" | "info";

export interface VitalAlertThreshold {
  min: number;
  max: number;
}

export interface VitalAlert {
  id: string;
  type: VitalAlertType;
  vital: keyof PediatricVitalSigns;
  currentValue: number;
  threshold: VitalAlertThreshold;
  duration: number; // seconds above threshold
  timestamp: string; // ISO 8601
  acknowledged: boolean;
  /**
   * Clinician identifier, if applicable.
   * Must be non-PHI (e.g., staff ID, not name).
   */
  assignedTo?: string;
}

export interface PediatricAgeGroup {
  months: number;
  ageLabel: string; // "Newborn", "Infant", "Toddler", etc.
  vitalRanges: {
    heartRate: { min: number; max: number };
    respiratoryRate: { min: number; max: number };
    oxygenSaturation: { min: number; max: number };
    temperature: { min: number; max: number };
  };
}

// Predefined pediatric vital ranges (age-specific, approximate clinical norms)
// Keys are representative age in months for each bucket.
export const PEDIATRIC_VITAL_RANGES: Record<number, PediatricAgeGroup> = {
  0: {
    // Newborn
    months: 0,
    ageLabel: "Newborn (0-1 mo)",
    vitalRanges: {
      heartRate: { min: 100, max: 205 },
      respiratoryRate: { min: 30, max: 60 },
      oxygenSaturation: { min: 95, max: 100 },
      temperature: { min: 36.5, max: 37.5 },
    },
  },
  3: {
    months: 3,
    ageLabel: "Infant (1-3 mo)",
    vitalRanges: {
      heartRate: { min: 100, max: 190 },
      respiratoryRate: { min: 30, max: 60 },
      oxygenSaturation: { min: 95, max: 100 },
      temperature: { min: 36.5, max: 37.5 },
    },
  },
  6: {
    months: 6,
    ageLabel: "Infant (3-6 mo)",
    vitalRanges: {
      heartRate: { min: 90, max: 180 },
      respiratoryRate: { min: 30, max: 60 },
      oxygenSaturation: { min: 95, max: 100 },
      temperature: { min: 36.5, max: 37.5 },
    },
  },
  9: {
    months: 9,
    ageLabel: "Infant (6-12 mo)",
    vitalRanges: {
      heartRate: { min: 80, max: 160 },
      respiratoryRate: { min: 30, max: 53 },
      oxygenSaturation: { min: 95, max: 100 },
      temperature: { min: 36.5, max: 37.5 },
    },
  },
  12: {
    months: 12,
    ageLabel: "Toddler (1-2 yr)",
    vitalRanges: {
      heartRate: { min: 80, max: 150 },
      respiratoryRate: { min: 24, max: 40 },
      oxygenSaturation: { min: 95, max: 100 },
      temperature: { min: 36.5, max: 37.5 },
    },
  },
  24: {
    months: 24,
    ageLabel: "Toddler (2-3 yr)",
    vitalRanges: {
      heartRate: { min: 80, max: 140 },
      respiratoryRate: { min: 22, max: 34 },
      oxygenSaturation: { min: 95, max: 100 },
      temperature: { min: 36.5, max: 37.5 },
    },
  },
  36: {
    months: 36,
    ageLabel: "Preschool (3-5 yr)",
    vitalRanges: {
      heartRate: { min: 80, max: 140 },
      respiratoryRate: { min: 22, max: 34 },
      oxygenSaturation: { min: 95, max: 100 },
      temperature: { min: 36.5, max: 37.5 },
    },
  },
  60: {
    months: 60,
    ageLabel: "School-age (6-8 yr)",
    vitalRanges: {
      heartRate: { min: 70, max: 120 },
      respiratoryRate: { min: 18, max: 30 },
      oxygenSaturation: { min: 95, max: 100 },
      temperature: { min: 36.5, max: 37.5 },
    },
  },
  96: {
    months: 96,
    ageLabel: "School-age (9-12 yr)",
    vitalRanges: {
      heartRate: { min: 60, max: 110 },
      respiratoryRate: { min: 18, max: 30 },
      oxygenSaturation: { min: 95, max: 100 },
      temperature: { min: 36.5, max: 37.5 },
    },
  },
  144: {
    months: 144,
    ageLabel: "Adolescent (13+ yr)",
    vitalRanges: {
      heartRate: { min: 60, max: 100 },
      respiratoryRate: { min: 12, max: 20 },
      oxygenSaturation: { min: 95, max: 100 },
      temperature: { min: 36.5, max: 37.5 },
    },
  },
};

export const findAgeGroupForMonths = (
  ageMonths: number,
): PediatricAgeGroup | undefined => {
  if (Number.isNaN(ageMonths) || ageMonths < 0) return undefined;
  const keys = Object.keys(PEDIATRIC_VITAL_RANGES)
    .map((k) => Number(k))
    .sort((a, b) => a - b);

  let selectedKey: number | undefined;
  for (const key of keys) {
    if (ageMonths >= key) {
      selectedKey = key;
    } else {
      break;
    }
  }

  if (selectedKey === undefined) return undefined;
  return PEDIATRIC_VITAL_RANGES[selectedKey];
};

/**
 * Rich vital sample used by the IoT dashboard mock data generator.
 * Extends the normalized wire format with a real Date instance so charts
 * and time-based components can work ergonomically.
 */
export type PatientVital = Omit<PediatricVitalSigns, "timestamp"> & {
  timestamp: Date;
};

export type ActivityLevel = PatientVital["activityLevel"];

export type MockIoTDeviceKind = "pi5" | "wearable" | "camera" | "glucometer";

export type MockIoTDeviceStatus = "online" | "warning" | "offline" | "updating";

export interface MockIoTDevice extends IoTDevice {
  kind: MockIoTDeviceKind;
  status: MockIoTDeviceStatus;
  cpuLoad?: number;
  memoryUsageMb?: number;
  networkLatencyMs?: number;
  roomLocation?: string;
}

export interface PatientComplianceEntry {
  timestamp: Date;
  type: "medication" | "therapy" | "followup" | "device_wear";
  label: string;
  completed: boolean;
}

export interface PatientAnomalyEvent {
  id: string;
  patientId: string;
  timestamp: Date;
  kind:
    | "tachycardia"
    | "bradycardia"
    | "desaturation"
    | "fever"
    | "apnea_like"
    | "activity_drop";
  severity: VitalAlertType;
  summary: string;
  details?: string;
}

export interface GrowthPercentilePoint {
  ageMonths: number;
  heightCm: number;
  weightKg: number;
  headCircumferenceCm?: number;
  heightPercentile: number;
  weightPercentile: number;
}

export interface PediatricPatientProfile {
  id: string;
  displayName: string;
  ageMonths: number;
  avatarSeed: string;
  primaryCondition?: string;
  caregiverRole?: "mother" | "father" | "grandparent" | "guardian" | "sibling";
}

export interface PatientMockDataBundle {
  patient: PediatricPatientProfile;
  devices: MockIoTDevice[];
  realtimeVitals: PatientVital[];
  vitals24h: PatientVital[];
  vitals7d: PatientVital[];
  growthTimeline: GrowthPercentilePoint[];
  alerts: VitalAlert[];
  anomalies: PatientAnomalyEvent[];
  compliance: PatientComplianceEntry[];
}

export interface UseMockIoTDataResult {
  patients: PatientMockDataBundle[];
  allDevices: MockIoTDevice[];
  latestVitalsByPatient: Record<string, PatientVital | undefined>;
  alertsByPatient: Record<string, VitalAlert[]>;
}


