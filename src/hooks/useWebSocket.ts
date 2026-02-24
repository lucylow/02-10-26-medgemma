// src/hooks/useWebSocket.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { WebSocketMessage } from "@/types/websocket";

interface UseWebSocketOptions {
  url: string;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  onMessage?: (data: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
}

type TimeoutHandle = ReturnType<typeof setTimeout>;

export function useWebSocket({
  url,
  reconnectDelay = 3000,
  heartbeatInterval = 30000,
  onMessage,
  onConnect,
  onDisconnect,
  autoReconnect = true,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastPingTimestamp, setLastPingTimestamp] = useState<number | null>(
    null,
  );

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<TimeoutHandle | null>(null);
  const heartbeatTimeoutRef = useRef<TimeoutHandle | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnects = 10;

  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const scheduleHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    heartbeatTimeoutRef.current = setTimeout(() => {
      sendMessage({ type: "heartbeat", timestamp: Date.now() });
      setLastPingTimestamp(Date.now());
    }, heartbeatInterval);
  }, [heartbeatInterval, sendMessage]);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    clearTimers();

    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      onConnect?.();
      scheduleHeartbeat();
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        onMessage?.(data);
        scheduleHeartbeat();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("WebSocket message parse error:", error);
      }
    };

    ws.onclose = (event: CloseEvent) => {
      setIsConnected(false);
      onDisconnect?.();
      clearTimers();

      if (autoReconnect && reconnectAttemptsRef.current < maxReconnects) {
        const attempt = reconnectAttemptsRef.current + 1;
        const delay = Math.min(
          reconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current),
          30000,
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current = attempt;
          connect();
        }, delay);
      }
    };

    ws.onerror = (error: Event) => {
      // eslint-disable-next-line no-console
      console.error("WebSocket error:", error);
    };
  }, [
    autoReconnect,
    clearTimers,
    onConnect,
    onDisconnect,
    onMessage,
    reconnectDelay,
    scheduleHeartbeat,
    url,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    connect();

    return () => {
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [clearTimers, connect]);

  const lastPingAgeMs =
    lastPingTimestamp === null ? null : Date.now() - lastPingTimestamp;

  return {
    isConnected,
    lastPingMs: lastPingAgeMs,
    sendMessage,
    connect,
    disconnect: () => {
      clearTimers();
      wsRef.current?.close();
      wsRef.current = null;
    },
  };
}

