// src/types/websocket.ts
// Shared WebSocket message contracts for live edge device streaming.
import type { MockIoTDeviceKind } from "./iot";

export type WebSocketMessageType =
  | "telemetry"
  | "alert"
  | "status"
  | "heartbeat";

export interface TelemetryPayload {
  deviceType: MockIoTDeviceKind;
  cpu?: number;
  memory?: number;
  battery?: number;
  signal?: number;
  temperature?: number;
  inferenceTime?: number;
  queueLength: number;
  uptime?: string;
  status?: "online" | "warning" | "offline";
  vitals?: {
    heartRate: number;
    spo2: number;
    respiratoryRate: number;
    temperature: number;
  };
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertPayload {
  title: string;
  message: string;
  severity: AlertSeverity;
  code?: string;
  meta?: Record<string, unknown>;
}

export interface StatusPayload {
  message: string;
  details?: string;
}

export interface HeartbeatPayload {
  latencyMs?: number;
}

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  deviceId: string;
  timestamp: number;
  payload: T;
  sequence: number;
}

