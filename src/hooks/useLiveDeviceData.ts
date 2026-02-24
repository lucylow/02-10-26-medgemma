// src/hooks/useLiveDeviceData.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import type { WebSocketMessage } from "@/types/websocket";
import { useWebSocket } from "@/hooks/useWebSocket";
import { startMockWebSocketStream } from "@/utils/mockWebSocketData";
import type { TelemetryPayload, AlertPayload } from "@/types/websocket";

export interface DeviceTelemetry {
  deviceId: string;
  type: "pi5" | "wearable" | "camera" | "glucometer";
  cpu?: number;
  memory?: number;
  battery?: number;
  signal?: number;
  temperature?: number;
  inferenceTime?: number;
  queueLength: number;
  uptime?: string;
  lastSeen: number;
  status: "online" | "warning" | "offline";
  vitals?: {
    heartRate: number;
    spo2: number;
    respiratoryRate: number;
    temperature: number;
  };
}

interface UseLiveDeviceDataOptions {
  /**
   * Force use of frontend-only mock streaming.
   * By default this is enabled when VITE_WS_URL is not set.
   */
  useMockStream?: boolean;
}

export function useLiveDeviceData(
  deviceIds: string[],
  options?: UseLiveDeviceDataOptions,
) {
  const [devices, setDevices] = useState<Record<string, DeviceTelemetry>>({});
  const [alerts, setAlerts] = useState<WebSocketMessage<AlertPayload>[]>([]);

  const shouldUseMock =
    options?.useMockStream ?? !import.meta.env.VITE_WS_URL;

  const handleMessage = useCallback(
    (message: WebSocketMessage<TelemetryPayload | AlertPayload>) => {
      if (message.type === "telemetry") {
        const payload = message.payload as TelemetryPayload;

        const status: DeviceTelemetry["status"] =
          payload.queueLength > 5 || (payload.cpu && payload.cpu > 90)
            ? "warning"
            : "online";

        const telemetry: DeviceTelemetry = {
          deviceId: message.deviceId,
          type: payload.deviceType,
          cpu: payload.cpu,
          memory: payload.memory,
          battery: payload.battery,
          signal: payload.signal,
          temperature: payload.temperature,
          inferenceTime: payload.inferenceTime,
          queueLength: payload.queueLength,
          uptime: payload.uptime,
          vitals: payload.vitals,
          lastSeen: message.timestamp,
          status,
        };

        setDevices((prev) => ({
          ...prev,
          [message.deviceId]: telemetry,
        }));
      } else if (message.type === "alert") {
        setAlerts((prev) => [message as WebSocketMessage<AlertPayload>, ...prev.slice(0, 49)]);
      }
    },
    [],
  );

  const ws = useWebSocket({
    url: `${
      import.meta.env.VITE_WS_URL || "ws://localhost:8080"
    }/ws/telemetry`,
    onMessage: shouldUseMock ? undefined : handleMessage,
  });

  // Frontend-only mock streaming when no backend is configured.
  useEffect(() => {
    if (!shouldUseMock) return;

    const stop = startMockWebSocketStream({
      deviceIds,
      onMessage: handleMessage,
    });

    return () => {
      stop();
    };
  }, [deviceIds, handleMessage, shouldUseMock]);

  // Cleanup old devices (older than 2 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setDevices((prev) => {
        const updated: Record<string, DeviceTelemetry> = { ...prev };
        Object.entries(updated).forEach(([id, device]) => {
          if (now - device.lastSeen > 120_000) {
            updated[id] = { ...device, status: "offline" };
          }
        });
        return updated;
      });
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  const deviceList = useMemo(
    () => Object.values(devices).sort((a, b) => b.lastSeen - a.lastSeen),
    [devices],
  );

  return {
    devices: deviceList,
    alerts,
    isConnected: shouldUseMock ? true : ws.isConnected,
    sendCommand: ws.sendMessage,
    heartbeatMs: ws.lastPingMs,
  };
}

