import { useEffect, useMemo, useState } from "react";
import {
  type ActivityLevel,
  type MockIoTDevice,
  type MockIoTDeviceKind,
  type MockIoTDeviceStatus,
  type PatientAnomalyEvent,
  type PatientComplianceEntry,
  type PatientMockDataBundle,
  type PatientVital,
  type PediatricPatientProfile,
  type UseMockIoTDataResult,
  type VitalAlert,
} from "@/types/iot";

interface UseMockIoTDataState {
  loading: boolean;
  error: Error | null;
  data: UseMockIoTDataResult | null;
}

const MOCK_PATIENTS: PediatricPatientProfile[] = [
  {
    id: "p-emma-02y9m",
    displayName: "Emma",
    ageMonths: 33,
    avatarSeed: "emma-joyful",
    primaryCondition: "History of late preterm birth",
    caregiverRole: "mother",
  },
  {
    id: "p-luca-03y1m",
    displayName: "Luca",
    ageMonths: 37,
    avatarSeed: "luca-curious",
    primaryCondition: "Speech delay in monitoring",
    caregiverRole: "father",
  },
  {
    id: "p-aya-04y0m",
    displayName: "Aya",
    ageMonths: 48,
    avatarSeed: "aya-explorer",
    primaryCondition: "Recurrent wheeze (asthma risk)",
    caregiverRole: "grandparent",
  },
  {
    id: "p-zoe-02y3m",
    displayName: "Zoe",
    ageMonths: 27,
    avatarSeed: "zoe-dreamer",
    primaryCondition: "High-risk social screen follow-up",
    caregiverRole: "guardian",
  },
  {
    id: "p-ali-05y0m",
    displayName: "Ali",
    ageMonths: 60,
    avatarSeed: "ali-adventurer",
    primaryCondition: "Motor delay under therapy",
    caregiverRole: "mother",
  },
];

// Simple deterministic pseudo-random helper so stories and tests stay stable.
const makeRng = (seed: number) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const choose = <T,>(rng: () => number, items: readonly T[]): T =>
  items[Math.floor(rng() * items.length)];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const getActivityForTime = (date: Date): ActivityLevel => {
  const hour = date.getHours();

  // Simple toddler schedule:
  // - 20:00–06:00 sleep
  // - 12:00–14:00 nap/light
  // - Other times mix of light/moderate/vigorous
  if (hour >= 20 || hour < 6) return "sleep";
  if (hour >= 12 && hour < 14) return "resting";
  if (hour >= 9 && hour < 18) {
    if (hour === 10 || hour === 16) return "vigorous";
    return "moderate";
  }
  return "light";
};

interface VitalPatternOptions {
  baseHr: number;
  hrAmplitude: number;
  spo2Base: number;
  tempBase: number;
  rrBase: number;
}

const generateVitalSample = (
  date: Date,
  rng: () => number,
  opts: VitalPatternOptions,
): PatientVital => {
  const hour = date.getHours();
  const minutes = date.getMinutes();
  const t = hour + minutes / 60;

  const activityLevel = getActivityForTime(date);

  // Heart rate pattern: nocturnal dip, daytime peaks
  const circadian =
    -Math.cos(((t - 4) / 24) * 2 * Math.PI) * opts.hrAmplitude + opts.baseHr;

  const activityBoost =
    activityLevel === "vigorous"
      ? 20
      : activityLevel === "moderate"
        ? 10
        : activityLevel === "light"
          ? 5
          : activityLevel === "resting"
            ? -5
            : -10;

  const randomNoise = (rng() - 0.5) * 8;
  const heartRate = clamp(
    circadian + activityBoost + randomNoise,
    70,
    160,
  );

  // Respiratory rate tracks HR loosely
  const respiratoryRate = clamp(
    opts.rrBase +
      (heartRate - opts.baseHr) / 10 +
      (rng() - 0.5) * 4,
    18,
    40,
  );

  // SpO2 mostly normal with occasional dips during activity
  let spo2 = opts.spo2Base + (rng() - 0.5) * 1.2;
  if (activityLevel === "vigorous" && rng() < 0.25) {
    spo2 -= 2 + rng() * 2;
  }
  spo2 = clamp(spo2, 92, 100);

  // Temperature baseline with very mild circadian and rare spikes
  let temperature =
    opts.tempBase + 0.15 * Math.sin(((t - 16) / 24) * 2 * Math.PI);
  if (rng() < 0.01 && hour >= 18 && hour <= 23) {
    // Simulate evening teething/viral fever episodes
    temperature += 1.2 + rng() * 0.6;
  }
  temperature = clamp(temperature, 36.0, 40.0);

  const deviceBattery = clamp(
    100 - (date.getHours() % 24) * (0.2 + rng() * 0.3),
    10,
    100,
  );
  const signalStrength = -60 - rng() * 20;

  return {
    timestamp: new Date(date),
    heartRate,
    respiratoryRate,
    oxygenSaturation: spo2,
    bodyTemperature: temperature,
    activityLevel,
    bloodPressure: undefined,
    deviceBattery,
    signalStrength,
  };
};

const makeDevicesForPatient = (
  patient: PediatricPatientProfile,
  rng: () => number,
): MockIoTDevice[] => {
  const kinds: MockIoTDeviceKind[] = [
    "wearable",
    "wearable",
    "camera",
    "pi5",
  ];

  const statuses: MockIoTDeviceStatus[] = [
    "online",
    "online",
    "warning",
    "offline",
  ];

  const rooms = ["Nursery", "Living room", "Bedroom", "Play area"];

  return kinds.map((kind, idx) => {
    const id = `${patient.id}-dev-${idx + 1}`;
    const status = choose(statuses, statuses);
    const now = new Date();
    const lastSeen = new Date(
      now.getTime() - Math.floor(rng() * 20 * 60 * 1000),
    );

    return {
      id,
      name:
        kind === "wearable"
          ? `${patient.displayName} band`
          : kind === "camera"
            ? `${patient.displayName} cam`
            : "Edge Pi5 hub",
      type:
        kind === "pi5"
          ? "bedside"
          : kind === "camera"
            ? "camera"
            : "wearable",
      model:
        kind === "pi5"
          ? "Raspberry Pi 5 + MoveNet"
          : kind === "camera"
            ? "Nanit Pro"
            : "PediBand v2",
      macAddress: `AA:BB:${Math.floor(rng() * 255)
        .toString(16)
        .padStart(2, "0")}:${Math.floor(rng() * 255)
        .toString(16)
        .padStart(2, "0")}:${Math.floor(rng() * 255)
        .toString(16)
        .padStart(2, "0")}:${Math.floor(rng() * 255)
        .toString(16)
        .padStart(2, "0")}`,
      connectionStatus:
        status === "offline"
          ? "disconnected"
          : status === "warning"
            ? "connecting"
            : "connected",
      lastSeen: lastSeen.toISOString(),
      batteryLevel: clamp(100 - rng() * 30, 5, 100),
      firmwareVersion: "1.2." + Math.floor(rng() * 10),
      patientId: patient.id,
      kind,
      status,
      cpuLoad: kind === "pi5" ? 25 + rng() * 40 : undefined,
      memoryUsageMb: kind === "pi5" ? 512 + rng() * 1024 : undefined,
      networkLatencyMs: 20 + rng() * 50,
      roomLocation: choose(rng, rooms),
    };
  });
};

const generateAlerts = (
  patientId: string,
  vitals: PatientVital[],
  rng: () => number,
): VitalAlert[] => {
  const alerts: VitalAlert[] = [];

  for (const sample of vitals) {
    if (sample.heartRate < 70 || sample.heartRate > 150) {
      if (rng() < 0.2) {
        alerts.push({
          id: `${patientId}-hr-${alerts.length}`,
          type:
            sample.heartRate < 70 || sample.heartRate > 155
              ? "critical"
              : "warning",
          vital: "heartRate",
          currentValue: sample.heartRate,
          threshold: { min: 80, max: 140 },
          duration: 60 + Math.floor(rng() * 600),
          timestamp: sample.timestamp.toISOString(),
          acknowledged: rng() < 0.6,
          assignedTo: rng() < 0.4 ? "RN-27" : undefined,
        });
      }
    }

    if (sample.oxygenSaturation < 94 && rng() < 0.2) {
      alerts.push({
        id: `${patientId}-spo2-${alerts.length}`,
        type: sample.oxygenSaturation < 92 ? "critical" : "warning",
        vital: "oxygenSaturation",
        currentValue: sample.oxygenSaturation,
        threshold: { min: 95, max: 100 },
        duration: 30 + Math.floor(rng() * 300),
        timestamp: sample.timestamp.toISOString(),
        acknowledged: rng() < 0.3,
        assignedTo: rng() < 0.5 ? "RT-05" : undefined,
      });
    }

    if (sample.bodyTemperature > 38.5 && rng() < 0.5) {
      alerts.push({
        id: `${patientId}-temp-${alerts.length}`,
        type: sample.bodyTemperature > 39.3 ? "critical" : "warning",
        vital: "bodyTemperature",
        currentValue: sample.bodyTemperature,
        threshold: { min: 36.5, max: 37.8 },
        duration: 600 + Math.floor(rng() * 1800),
        timestamp: sample.timestamp.toISOString(),
        acknowledged: rng() < 0.8,
        assignedTo: rng() < 0.5 ? "MD-14" : undefined,
      });
    }
  }

  // Keep a manageable but rich history
  return alerts.slice(-80).reverse();
};

const generateAnomalies = (
  patientId: string,
  vitals: PatientVital[],
  alerts: VitalAlert[],
  rng: () => number,
): PatientAnomalyEvent[] => {
  const anomalies: PatientAnomalyEvent[] = [];

  const alertByTime = new Map<string, VitalAlert[]>();
  alerts.forEach((a) => {
    const key = new Date(a.timestamp).toISOString().slice(0, 13);
    const bucket = alertByTime.get(key) ?? [];
    bucket.push(a);
    alertByTime.set(key, bucket);
  });

  vitals.forEach((sample, idx) => {
    const hourKey = sample.timestamp.toISOString().slice(0, 13);
    const relatedAlerts = alertByTime.get(hourKey) ?? [];
    if (!relatedAlerts.length) return;
    if (rng() > 0.25) return;

    const template = choose(rng, relatedAlerts);

    let kind: PatientAnomalyEvent["kind"] = "tachycardia";
    if (template.vital === "oxygenSaturation") {
      kind = "desaturation";
    } else if (template.vital === "bodyTemperature") {
      kind = "fever";
    } else if (template.vital === "respiratoryRate") {
      kind = "apnea_like";
    } else if (template.vital === "heartRate" && sample.heartRate < 70) {
      kind = "bradycardia";
    }

    const severity = template.type;

    const summaryMap: Record<typeof kind, string> = {
      tachycardia: "Sustained tachycardia during active play window",
      bradycardia: "Bradycardia cluster during overnight period",
      desaturation: "Brief desaturation episodes with rapid recovery",
      fever: "Evening febrile spike consistent with viral illness",
      apnea_like: "Irregular respiratory pattern suggestive of apnea-like pauses",
      activity_drop: "Sudden drop in activity level with stable vitals",
    };

    anomalies.push({
      id: `${patientId}-anom-${idx}`,
      patientId,
      timestamp: sample.timestamp,
      kind,
      severity,
      summary: summaryMap[kind],
      details:
        kind === "fever"
          ? "Recommend antipyretic per protocol and close telehealth follow-up."
          : kind === "desaturation"
            ? "Consider adjusting asthma action plan or inhaler technique review."
            : undefined,
    });
  });

  return anomalies.slice(-40).reverse();
};

const generateCompliance = (
  patient: PediatricPatientProfile,
  now: Date,
  rng: () => number,
): PatientComplianceEntry[] => {
  const entries: PatientComplianceEntry[] = [];
  const daysBack = 7;
  const baseMedHours = [8, 20];

  for (let d = daysBack; d >= 0; d -= 1) {
    const dayDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - d,
    );

    baseMedHours.forEach((hour) => {
      const ts = new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        dayDate.getDate(),
        hour,
        Math.floor(rng() * 20),
      );
      const completed = rng() < 0.9;
      entries.push({
        timestamp: ts,
        type: "medication",
        label: "Controller medication",
        completed,
      });
    });

    const therapyChance = patient.primaryCondition?.includes("Motor")
      ? 0.8
      : 0.4;
    if (rng() < therapyChance) {
      const ts = new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        dayDate.getDate(),
        15,
        Math.floor(rng() * 30),
      );
      entries.push({
        timestamp: ts,
        type: "therapy",
        label: "Home PT/OT session",
        completed: rng() < 0.95,
      });
    }

    const wearTs = new Date(
      dayDate.getFullYear(),
      dayDate.getMonth(),
      dayDate.getDate(),
      9,
      Math.floor(rng() * 15),
    );
    entries.push({
      timestamp: wearTs,
      type: "device_wear",
      label: "Wearable placed on child",
      completed: rng() < 0.97,
    });
  }

  return entries;
};

const generateVitalsSeries = (
  now: Date,
  rng: () => number,
): {
  realtimeVitals: PatientVital[];
  vitals24h: PatientVital[];
  vitals7d: PatientVital[];
} => {
  const vitals24h: PatientVital[] = [];
  const vitals7d: PatientVital[] = [];
  const realtimeVitals: PatientVital[] = [];

  const options: VitalPatternOptions = {
    baseHr: 105 + rng() * 10,
    hrAmplitude: 20 + rng() * 8,
    spo2Base: 97.5 + (rng() - 0.5),
    tempBase: 36.7 + (rng() - 0.5) * 0.2,
    rrBase: 26 + rng() * 4,
  };

  // 24h at 5-minute resolution
  for (let minutesAgo = 24 * 60; minutesAgo >= 0; minutesAgo -= 5) {
    const ts = new Date(now.getTime() - minutesAgo * 60 * 1000);
    vitals24h.push(generateVitalSample(ts, rng, options));
  }

  // Last 10 minutes as "realtime" queue (every 15s)
  for (let secondsAgo = 10 * 60; secondsAgo >= 0; secondsAgo -= 15) {
    const ts = new Date(now.getTime() - secondsAgo * 1000);
    realtimeVitals.push(generateVitalSample(ts, rng, options));
  }

  // 7 days, one sample per hour
  for (let hoursAgo = 7 * 24; hoursAgo >= 0; hoursAgo -= 1) {
    const ts = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    vitals7d.push(generateVitalSample(ts, rng, options));
  }

  return { realtimeVitals, vitals24h, vitals7d };
};

const generateGrowthTimeline = (
  patient: PediatricPatientProfile,
  rng: () => number,
): PatientMockDataBundle["growthTimeline"] => {
  const points: PatientMockDataBundle["growthTimeline"] = [];
  const startMonths = Math.max(12, patient.ageMonths - 24);

  for (let m = startMonths; m <= patient.ageMonths; m += 3) {
    const ageDelta = (m - startMonths) / 12;
    const baseHeight = 80 + ageDelta * 10 + (rng() - 0.5) * 2;
    const baseWeight = 11 + ageDelta * 2 + (rng() - 0.5);

    const heightPercentile = clamp(40 + rng() * 30, 5, 95);
    const weightPercentile = clamp(35 + rng() * 30, 5, 95);

    points.push({
      ageMonths: m,
      heightCm: parseFloat(baseHeight.toFixed(1)),
      weightKg: parseFloat(baseWeight.toFixed(1)),
      headCircumferenceCm:
        m <= 36 ? parseFloat((46 + ageDelta * 1.5 + (rng() - 0.5)).toFixed(1)) : undefined,
      heightPercentile,
      weightPercentile,
    });
  }

  return points;
};

export const buildMockIoTData = (now: Date = new Date()): UseMockIoTDataResult => {
  const bundles: PatientMockDataBundle[] = [];

  MOCK_PATIENTS.forEach((patient, index) => {
    const rng = makeRng(1000 + index * 97);
    const devices = makeDevicesForPatient(patient, rng);
    const { realtimeVitals, vitals24h, vitals7d } = generateVitalsSeries(
      now,
      rng,
    );
    const alerts = generateAlerts(patient.id, vitals24h, rng);
    const anomalies = generateAnomalies(
      patient.id,
      vitals24h,
      alerts,
      rng,
    );
    const compliance = generateCompliance(patient, now, rng);
    const growthTimeline = generateGrowthTimeline(patient, rng);

    bundles.push({
      patient,
      devices,
      realtimeVitals,
      vitals24h,
      vitals7d,
      growthTimeline,
      alerts,
      anomalies,
      compliance,
    });
  });

  const allDevices = bundles.flatMap((b) => b.devices);
  const latestVitalsByPatient: UseMockIoTDataResult["latestVitalsByPatient"] =
    {};
  const alertsByPatient: UseMockIoTDataResult["alertsByPatient"] = {};

  bundles.forEach((bundle) => {
    latestVitalsByPatient[bundle.patient.id] =
      bundle.realtimeVitals[bundle.realtimeVitals.length - 1];
    alertsByPatient[bundle.patient.id] = bundle.alerts;
  });

  return {
    patients: bundles,
    allDevices,
    latestVitalsByPatient,
    alertsByPatient,
  };
};

export function useMockIoTData(): UseMockIoTDataState & UseMockIoTDataResult {
  const [state, setState] = useState<UseMockIoTDataState>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    // Simulate async load to exercise skeleton states in the UI and Storybook.
    const timeout = setTimeout(() => {
      try {
        const data = buildMockIoTData();
        setState({ loading: false, error: null, data });
      } catch (error) {
        setState({
          loading: false,
          error:
            error instanceof Error
              ? error
              : new Error("Failed to generate mock IoT data"),
          data: null,
        });
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, []);

  const resolved = useMemo<UseMockIoTDataResult>(
    () =>
      state.data ?? {
        patients: [],
        allDevices: [],
        latestVitalsByPatient: {},
        alertsByPatient: {},
      },
    [state.data],
  );

  return {
    ...state,
    ...resolved,
  };
}

