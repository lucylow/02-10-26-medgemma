/**
 * Real-time HITL WebSocket hook for PediScreen AI (mobile-app)
 * Live clinician collaboration, case queue updates, and streaming notifications.
 * Optional - returns safe fallback when clinicId not provided or WebSocket unavailable.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export type WebSocketEvent =
  | 'case_update'
  | 'hitl_pending'
  | 'clinician_joined'
  | 'medgemma_stream'
  | 'decision_made'
  | 'queue_position'
  | 'queue_updated';

export interface RealtimeState {
  isConnected: boolean;
  pendingCases: number;
  queuePosition: number;
  activeClinicians: number;
  heartbeat: number;
}

export interface RealtimeHitlReturn extends RealtimeState {
  reconnect: () => void;
  sendMessage: (message: Record<string, unknown>) => void;
  isHealthy: boolean;
}

const HEARTBEAT_INTERVAL_MS = 30000;
const HEALTH_THRESHOLD_MS = 60000;
const MAX_RECONNECT_ATTEMPTS = 5;

function getWsBaseUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_MEDGEMMA_API_URL;
  if (apiUrl) return apiUrl.replace(/^http/, 'ws');
  return __DEV__ ? 'ws://localhost:5001' : '';
}

async function getAccessToken(): Promise<string | null> {
  try {
    const { getItemAsync } = await import('expo-secure-store');
    return await getItemAsync('authToken');
  } catch {
    return null;
  }
}

export function useRealtimeHitl(
  userRole: string,
  clinicId?: string,
  options?: {
    onNotification?: (caseId: string, message: string) => void;
    onStreamToken?: (token: string) => void;
  }
): RealtimeHitlReturn {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const reconnectAttempts = useRef(0);

  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    pendingCases: 0,
    queuePosition: 0,
    activeClinicians: 0,
    heartbeat: 0,
  });

  const handleWebSocketMessage = useCallback(
    (message: Record<string, unknown>) => {
      const type = message.type as WebSocketEvent;
      const data = (message.data as Record<string, unknown>) || {};

      switch (type) {
        case 'hitl_pending': {
          const payload = data as { count?: number; position?: number; caseId?: string };
          setState((prev) => ({
            ...prev,
            pendingCases: payload.count ?? prev.pendingCases,
            queuePosition: payload.position ?? prev.queuePosition,
          }));
          if (payload.caseId && options?.onNotification) {
            options.onNotification(
              String(payload.caseId),
              `New case pending HITL review (position ${payload.position ?? '—'})`
            );
          }
          break;
        }
        case 'case_update': {
          const caseId = data.caseId as string;
          const patientId = data.patientId as string;
          if (caseId) {
            queryClient.invalidateQueries({ queryKey: ['cases', caseId] });
            queryClient.invalidateQueries({ queryKey: ['screenings'] });
          }
          if (patientId) {
            queryClient.invalidateQueries({ queryKey: ['fhir', 'patient', patientId] });
          }
          break;
        }
        case 'medgemma_stream': {
          const token = data.token as string;
          if (token && options?.onStreamToken) options.onStreamToken(token);
          break;
        }
        case 'clinician_joined': {
          const active = data.activeClinicians as number;
          setState((prev) => ({ ...prev, activeClinicians: active ?? prev.activeClinicians }));
          break;
        }
        case 'decision_made':
        case 'queue_updated': {
          const payload = data as { count?: number; position?: number; queue?: string[] };
          setState((prev) => ({
            ...prev,
            pendingCases: payload.count ?? Math.max(0, prev.pendingCases - 1),
            queuePosition: payload.position ?? prev.queuePosition,
          }));
          break;
        }
      }
    },
    [queryClient, options]
  );

  const connectWebSocket = useCallback(async () => {
    const baseUrl = getWsBaseUrl();
    if (!baseUrl || !clinicId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = await getAccessToken();
    const path = `/hitl/clinician/${clinicId}`;
    const url = `${baseUrl}${path}?token=${encodeURIComponent(token || '')}`;

    try {
      wsRef.current = new WebSocket(url);
    } catch (err) {
      console.error('WebSocket connect error:', err);
      return;
    }

    const ws = wsRef.current;

    ws.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true }));
      reconnectAttempts.current = 0;

      ws.send(
        JSON.stringify({
          type: 'clinician_join',
          role: userRole,
          clinicId,
        })
      );

      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'heartbeat' }));
          setState((prev) => ({ ...prev, heartbeat: Date.now() }));
        }
      }, HEARTBEAT_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as Record<string, unknown>;
        handleWebSocketMessage(message);
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = undefined;
      }

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connectWebSocket();
        }, delay);
      }
    };

    ws.onerror = () => {};
  }, [userRole, clinicId, handleWebSocketMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = undefined;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState((prev) => ({ ...prev, isConnected: false }));
  }, []);

  useEffect(() => {
    if (!clinicId) return;
    connectWebSocket();
    return disconnect;
  }, [clinicId, connectWebSocket, disconnect]);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const isHealthy = state.isConnected && Date.now() - state.heartbeat < HEALTH_THRESHOLD_MS;

  return {
    ...state,
    reconnect: connectWebSocket,
    sendMessage,
    isHealthy: state.heartbeat === 0 ? state.isConnected : isHealthy,
  };
}
