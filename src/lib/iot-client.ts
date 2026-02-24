/**
 * Lightweight IoT/WebSocket client for PediScreen Edge AI dashboards.
 * - Uses VITE_IOT_WS_URL when available.
 * - Falls back to a no-op client when running outside the browser.
 */

export type EdgeIoTMessage = {
  type: string;
  [key: string]: unknown;
};

export type EdgeIoTListener = (message: EdgeIoTMessage) => void;

export class PediScreenIoTClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<EdgeIoTListener>();
  private reconnectAttempts = 0;
  private reconnectTimeout?: ReturnType<typeof setTimeout>;

  constructor(private path: string = "/vitals") {}

  private getBaseUrl(): string | null {
    const configured = import.meta.env.VITE_IOT_WS_URL;
    if (configured) return configured;
    // Sensible default for demo; production should set VITE_IOT_WS_URL.
    return import.meta.env.DEV ? "ws://localhost:5002" : null;
  }

  connect(): void {
    if (typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const baseUrl = this.getBaseUrl();
    if (!baseUrl) return;

    const url = `${baseUrl.replace(/^http/, "ws")}${this.path}`;

    try {
      this.ws = new WebSocket(url);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("PediScreenIoTClient: error creating WebSocket", error);
      return;
    }

    const ws = this.ws;

    ws.onopen = () => {
      this.reconnectAttempts = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as EdgeIoTMessage;
        for (const listener of this.listeners) {
          listener(message);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("PediScreenIoTClient: failed to parse message", error);
      }
    };

    ws.onclose = () => {
      if (this.reconnectAttempts < 5) {
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectAttempts += 1;
          this.connect();
        }, delay);
      }
    };

    ws.onerror = () => {
      // Let onclose handle reconnection logic.
    };
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this.ws = null;
  }

  onMessage(listener: EdgeIoTListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Send vitals or device telemetry to the backend over HTTP.
   * The exact payload shape is intentionally generic to avoid coupling to a specific API.
   */
  async ingest(payload: Record<string, unknown>): Promise<void> {
    try {
      await fetch("/api/v1/iot/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("PediScreenIoTClient: failed to ingest vitals", error);
    }
  }
}

/**
 * Deploy models OTA via Supabase Edge Functions / Lovable Edge Functions.
 * This uses the same pattern as other Edge Function calls in the codebase.
 */
export async function deployModelOTA(deviceId: string, model: Uint8Array, targetHardware: string = "hailo-8") {
  const buffer = model.buffer.slice(model.byteOffset, model.byteOffset + model.byteLength);
  const modelData = btoa(String.fromCharCode(...new Uint8Array(buffer)));

  const body = {
    device_id: deviceId,
    model_name: "cry_detector_v2",
    model_data: modelData,
    target_hardware: targetHardware,
  };

  await fetch("/api/edge/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

