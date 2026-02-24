// src/utils/mockWebSocketData.ts
// Frontend-only mock stream for live WebSocket-style device telemetry.
import type {
  MockIoTDeviceKind,
  PatientVital,
  VitalAlert,
} from "@/types/iot";
import type {
  AlertPayload,
  TelemetryPayload,
  WebSocketMessage,
} from "@/types/websocket";

export interface MockWebSocketStreamOptions {
  deviceIds: string[];
  /**
   * Optional mapping from deviceId prefix to kind, e.g. { "pi5": "pi5" }.
   * Falls back to simple heuristics based on the id.
   */
  kindByPrefix?: Record<string, MockIoTDeviceKind>;
  onMessage: (msg: WebSocketMessage<TelemetryPayload | AlertPayload>) => void;
  telemetryIntervalMs?: number;
  alertChance?: number;
}

interface InternalDeviceState {
  sequence: number;
  lastVital: PatientVital | null;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const makeRng = (seed: number) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const inferKindFromId = (id: string, fallback: MockIoTDeviceKind): MockIoTDeviceKind => {
  const lower = id.toLowerCase();
  if (lower.includes("pi5")) return "pi5";
  if (lower.includes("wear")) return "wearable";
  if (lower.includes("cam") || lower.includes("camera")) return "camera";
  if (lower.includes("glu")) return "glucometer";
  return fallback;
};

const generateVitalSample = (
  now: Date,
  rng: () => number,
  base: PatientVital | null,
): PatientVital => {
  const baseHr = base?.heartRate ?? 105 + rng() * 10;
  const baseSpo2 = base?.oxygenSaturation ?? 97.5 + (rng() - 0.5);
  const baseTemp = base?.bodyTemperature ?? 36.7 + (rng() - 0.5) * 0.2;
  const baseRr = base?.respiratoryRate ?? 26 + rng() * 4;

  const heartRate = clamp(
    baseHr + (rng() - 0.5) * 6,
    80,
    170,
  );

  const respiratoryRate = clamp(
    baseRr + (heartRate - baseHr) / 12 + (rng() - 0.5) * 3,
    18,
    42,
  );

  let spo2 = baseSpo2 + (rng() - 0.5) * 1.2;
  if (rng() < 0.08) {
    spo2 -= 1 + rng() * 2;
  }
  spo2 = clamp(spo2, 92, 100);

  let temperature = baseTemp + (rng() - 0.5) * 0.08;
  if (rng() < 0.01) {
    temperature += 0.6 + rng() * 0.4;
  }
  temperature = clamp(temperature, 36.0, 40.5);

  const deviceBattery = clamp(
    (base?.deviceBattery ?? 100) - (rng() * 0.2 + 0.05),
    8,
    100,
  );
  const signalStrength = -60 - rng() * 18;

  return {
    timestamp: now,
    heartRate,
    respiratoryRate,
    oxygenSaturation: spo2,
    bodyTemperature: temperature,
    activityLevel: "moderate",
    bloodPressure: undefined,
    deviceBattery,
    signalStrength,
  };
};

const maybeGenerateAlert = (
  deviceId: string,
  vital: PatientVital,
  rng: () => number,
  existing: VitalAlert[],
): AlertPayload | null => {
  const alerts: Array<{
    vital: keyof PatientVital;
    condition: boolean;
    severity: VitalAlert["type"];
    title: string;
    message: string;
  }> = [
    {
      vital: "heartRate",
      condition: vital.heartRate > 150,
      severity: "critical",
      title: "High heart rate detected",
      message: "Sustained tachycardia above 150 bpm.",
    },
    {
      vital: "oxygenSaturation",
      condition: vital.oxygenSaturation < 94,
      severity: vital.oxygenSaturation < 92 ? "critical" : "warning",
      title: "Low SpO₂ episode",
      message: "Possible desaturation event, review recent activity.",
    },
    {
      vital: "bodyTemperature",
      condition: vital.bodyTemperature > 38.5,
      severity: vital.bodyTemperature > 39.3 ? "critical" : "warning",
      title: "Fever pattern emerging",
      message: "Evening temperature spike consistent with viral illness.",
    },
  ];

  const candidates = alerts.filter((a) => a.condition);
  if (!candidates.length) return null;
  if (rng() < 0.6) return null;

  const choice = candidates[Math.floor(rng() * candidates.length)];

  // De-duplicate very recent alerts of same title
  const hasRecent = existing.some(
    (a) => a.vital === choice.vital && a.timestamp > new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  );
  if (hasRecent) return null;

  return {
    title: choice.title,
    message: choice.message,
    severity: choice.severity,
    code: `${deviceId}-${choice.vital}`,
  };
};

export function startMockWebSocketStream({
  deviceIds,
  kindByPrefix,
  onMessage,
  telemetryIntervalMs = 1000,
}: MockWebSocketStreamOptions): () => void {
  const stateByDevice = new Map<string, InternalDeviceState>();
  const rng = makeRng(42);

  const interval = setInterval(() => {
    const now = Date.now();

    deviceIds.forEach((deviceId, index) => {
      const kind =
        kindByPrefix?.[
          Object.keys(kindByPrefix).find((k) =>
            deviceId.toLowerCase().startsWith(k.toLowerCase()),
          ) ?? ""
        ] ?? inferKindFromId(deviceId, "wearable");

      const state = stateByDevice.get(deviceId) ?? {
        sequence: 0,
        lastVital: null,
      };

      const vital = generateVitalSample(new Date(now), rng, state.lastVital);

      const telemetry: TelemetryPayload = {
        deviceType: kind,
        cpu: kind === "pi5" ? clamp(35 + rng() * 40, 10, 98) : undefined,
        memory: kind === "pi5" ? clamp(45 + rng() * 35, 10, 99) : undefined,
        battery: vital.deviceBattery,
        signal: vital.signalStrength,
        temperature: vital.bodyTemperature,
        inferenceTime: kind === "pi5" ? 900 + rng() * 700 : undefined,
        queueLength: Math.floor(rng() * (index % 3 === 0 ? 4 : 2)),
        uptime: "2d 14h",
        status: "online",
        vitals:
          kind === "wearable" || kind === "glucometer"
            ? {
                heartRate: Math.round(vital.heartRate),
                spo2: Math.round(vital.oxygenSaturation),
                respiratoryRate: Math.round(vital.respiratoryRate),
                temperature: parseFloat(vital.bodyTemperature.toFixed(1)),
              }
            : undefined,
      };

      const seq = state.sequence + 1;

      const telemetryMsg: WebSocketMessage<TelemetryPayload> = {
        type: "telemetry",
        deviceId,
        timestamp: now,
        payload: telemetry,
        sequence: seq,
      };

      onMessage(telemetryMsg);

      stateByDevice.set(deviceId, {
        sequence: seq,
        lastVital: vital,
      });
    });
  }, telemetryIntervalMs);

  return () => {
    clearInterval(interval);
  };
}

