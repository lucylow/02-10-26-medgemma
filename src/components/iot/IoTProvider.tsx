import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
} from "react";
import type {
  PediatricVitalSigns,
  IoTDevice,
  VitalAlert,
} from "@/types/iot";

interface IoTState {
  devices: IoTDevice[];
  currentVitals: PediatricVitalSigns | null;
  vitalHistory: PediatricVitalSigns[];
  alerts: VitalAlert[];
  isConnected: boolean;
  patientAgeMonths: number;
}

type IoTAction =
  | { type: "VITALS_UPDATE"; payload: PediatricVitalSigns }
  | { type: "DEVICE_UPDATE"; payload: IoTDevice }
  | { type: "ALERTS_REPLACE"; payload: VitalAlert[] }
  | { type: "ALERT_UPSERT"; payload: VitalAlert }
  | { type: "ALERT_ACK"; payload: { id: string } }
  | { type: "CONNECTION_STATUS"; payload: boolean }
  | { type: "SET_PATIENT_AGE"; payload: number };

interface IoTProviderProps {
  children: React.ReactNode;
  /**
   * Pseudonymous identifier for the monitored child.
   * This should never be direct PHI (no names, MRNs, etc.).
   */
  patientId?: string;
  /**
   * Age in months used for pediatric vital thresholds.
   */
  patientAgeMonths?: number;
}

interface IoTContextValue {
  state: IoTState;
  dispatch: React.Dispatch<IoTAction>;
}

const initialState: IoTState = {
  devices: [],
  currentVitals: null,
  vitalHistory: [],
  alerts: [],
  isConnected: false,
  patientAgeMonths: 12,
};

const IoTContext = createContext<IoTContextValue | null>(null);

function iotReducer(state: IoTState, action: IoTAction): IoTState {
  switch (action.type) {
    case "VITALS_UPDATE": {
      const nextHistory = [...state.vitalHistory, action.payload];
      // Keep a bounded history in memory to avoid unbounded growth
      const trimmedHistory =
        nextHistory.length > 500 ? nextHistory.slice(-500) : nextHistory;
      return {
        ...state,
        currentVitals: action.payload,
        vitalHistory: trimmedHistory,
      };
    }
    case "DEVICE_UPDATE": {
      const idx = state.devices.findIndex(
        (d) => d.id === action.payload.id,
      );
      if (idx === -1) {
        return { ...state, devices: [...state.devices, action.payload] };
      }
      const nextDevices = [...state.devices];
      nextDevices[idx] = { ...nextDevices[idx], ...action.payload };
      return { ...state, devices: nextDevices };
    }
    case "ALERTS_REPLACE": {
      return { ...state, alerts: action.payload };
    }
    case "ALERT_UPSERT": {
      const idx = state.alerts.findIndex(
        (a) => a.id === action.payload.id,
      );
      if (idx === -1) {
        return { ...state, alerts: [action.payload, ...state.alerts] };
      }
      const nextAlerts = [...state.alerts];
      nextAlerts[idx] = { ...nextAlerts[idx], ...action.payload };
      return { ...state, alerts: nextAlerts };
    }
    case "ALERT_ACK": {
      return {
        ...state,
        alerts: state.alerts.map((a) =>
          a.id === action.payload.id ? { ...a, acknowledged: true } : a,
        ),
      };
    }
    case "CONNECTION_STATUS": {
      return { ...state, isConnected: action.payload };
    }
    case "SET_PATIENT_AGE": {
      return { ...state, patientAgeMonths: action.payload };
    }
    default:
      return state;
  }
}

export const IoTProvider: React.FC<IoTProviderProps> = ({
  children,
  patientId = "demo-child-001",
  patientAgeMonths = 24,
}) => {
  const [state, dispatch] = useReducer(iotReducer, {
    ...initialState,
    patientAgeMonths,
  });

  useEffect(() => {
    dispatch({ type: "SET_PATIENT_AGE", payload: patientAgeMonths });
  }, [patientAgeMonths]);

  useEffect(() => {
    if (!patientId) {
      dispatch({ type: "CONNECTION_STATUS", payload: false });
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const baseUrl =
      import.meta.env.VITE_IOT_WS_URL ||
      "wss://api.pediscreen.ai/iot/stream";
    const token = import.meta.env.VITE_IOT_WS_TOKEN;
    const url = `${baseUrl}/${encodeURIComponent(patientId)}${
      token ? `?token=${encodeURIComponent(token)}` : ""
    }`;

    const connect = () => {
      try {
        ws = new WebSocket(url);
      } catch (error) {
        console.error("IoT WebSocket error creating connection", error);
        dispatch({ type: "CONNECTION_STATUS", payload: false });
        return;
      }

      dispatch({ type: "CONNECTION_STATUS", payload: false });

      ws.onopen = () => {
        dispatch({ type: "CONNECTION_STATUS", payload: true });
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleIoTMessage(message, dispatch);
        } catch (error) {
          console.error("Failed to parse IoT WebSocket message", error);
        }
      };

      ws.onclose = () => {
        dispatch({ type: "CONNECTION_STATUS", payload: false });

        // Auto-reconnect with exponential backoff, capped to 30s
        if (reconnectAttempts < 5) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts),
            30000,
          );
          reconnectTimeout = setTimeout(connect, delay);
          reconnectAttempts += 1;
        }
      };

      ws.onerror = () => {
        dispatch({ type: "CONNECTION_STATUS", payload: false });
      };
    };

    connect();

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [patientId]);

  const value = useMemo<IoTContextValue>(
    () => ({ state, dispatch }),
    [state],
  );

  return <IoTContext.Provider value={value}>{children}</IoTContext.Provider>;
};

export const useIoTContext = (): IoTContextValue => {
  const ctx = useContext(IoTContext);
  if (!ctx) {
    throw new Error("useIoTContext must be used within an IoTProvider");
  }
  return ctx;
};

// Internal helper to handle normalized IoT messages from the backend.
// Message format is intentionally generic to support multiple backends.
type IoTMessage =
  | { type: "vitals"; vitals: PediatricVitalSigns }
  | { type: "device"; device: IoTDevice }
  | { type: "devices"; devices: IoTDevice[] }
  | { type: "alerts"; alerts: VitalAlert[] }
  | { type: "alert"; alert: VitalAlert }
  | { type: "ping" }
  | { type: string; [key: string]: unknown };

function handleIoTMessage(message: IoTMessage, dispatch: React.Dispatch<IoTAction>) {
  switch (message.type) {
    case "vitals":
      if (message.vitals) {
        dispatch({ type: "VITALS_UPDATE", payload: message.vitals as PediatricVitalSigns });
      }
      break;
    case "device":
      if (message.device) {
        dispatch({ type: "DEVICE_UPDATE", payload: message.device as IoTDevice });
      }
      break;
    case "devices":
      if (Array.isArray(message.devices)) {
        for (const device of message.devices) {
          dispatch({ type: "DEVICE_UPDATE", payload: device as IoTDevice });
        }
      }
      break;
    case "alerts":
      if (Array.isArray(message.alerts)) {
        dispatch({ type: "ALERTS_REPLACE", payload: message.alerts as VitalAlert[] });
      }
      break;
    case "alert":
      if (message.alert) {
        dispatch({ type: "ALERT_UPSERT", payload: message.alert as VitalAlert });
      }
      break;
    case "ping":
      // Connection keepalive; no-op on client.
      break;
    default:
      // Unknown message types are ignored but logged for observability.
      if (import.meta.env.DEV) {
        console.debug("Unhandled IoT message", message);
      }
  }
}

