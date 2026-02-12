/**
 * WebSocket collaboration hook for CHW + clinician real-time editing.
 * Room: report:{reportId}. Set VITE_WS_URL in .env (e.g. wss://your-backend.example.com/ws/collab).
 */
import { useEffect, useRef, useState, useCallback } from "react";

export type Presence = {
  userId: string;
  name: string;
  role?: string;
  lastSeen?: number;
};

export type DraftUpdate = {
  reportId: string;
  field: string;
  value: unknown;
  ts: number;
  author?: Presence;
};

export type ChatMessage = {
  from: Presence;
  message: string;
  ts: number;
};

type CollabMessage =
  | { type: "presence"; payload: Presence }
  | { type: "draft_update"; payload: DraftUpdate }
  | { type: "chat_message"; payload: ChatMessage }
  | { type: "lock"; payload: { field: string; userId: string } }
  | { type: "unlock"; payload: { field: string; userId: string } }
  | { type: "approved"; payload: { reportId: string; by: Presence; ts: number } };

export function useCollab(reportId: string | null, user: Presence | null) {
  const wsUrl =
    import.meta.env.VITE_WS_URL ||
    (import.meta.env.DEV ? "ws://localhost:5001/ws/collab" : "");
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<Record<string, Presence>>({});
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [locks, setLocks] = useState<Record<string, string>>({}); // field -> userId

  const handleMessage = useCallback((ev: MessageEvent) => {
    try {
      const msg: CollabMessage = JSON.parse(ev.data);
      switch (msg.type) {
        case "presence": {
          const p = msg.payload as Presence;
          setParticipants((s) => ({
            ...s,
            [p.userId]: { ...p, lastSeen: Date.now() },
          }));
          break;
        }
        case "chat_message": {
          setChat((c) => [...c, msg.payload as ChatMessage]);
          break;
        }
        case "draft_update": {
          const detail = msg.payload as DraftUpdate;
          window.dispatchEvent(
            new CustomEvent(`collab:draft_update:${detail.reportId}`, {
              detail,
            })
          );
          break;
        }
        case "lock": {
          const obj = msg.payload as { field: string; userId: string };
          setLocks((s) => ({ ...s, [obj.field]: obj.userId }));
          break;
        }
        case "unlock": {
          const obj = msg.payload as { field: string; userId: string };
          setLocks((s) => {
            const copy = { ...s };
            delete copy[obj.field];
            return copy;
          });
          break;
        }
        case "approved": {
          window.dispatchEvent(
            new CustomEvent(`collab:approved:${msg.payload.reportId}`, {
              detail: msg.payload,
            })
          );
          break;
        }
      }
    } catch (e) {
      console.error("Malformed collab message", e);
    }
  }, []);

  useEffect(() => {
    if (!reportId || !user || !wsUrl) return;
    const url = new URL(wsUrl);
    url.searchParams.set("room", `report:${reportId}`);
    url.searchParams.set("uid", user.userId);
    wsRef.current = new WebSocket(url.toString());

    const ws = wsRef.current;
    ws.onopen = () => {
      setConnected(true);
      const msg: CollabMessage = { type: "presence", payload: user };
      ws.send(JSON.stringify(msg));
    };
    ws.onmessage = handleMessage;
    ws.onclose = () => {
      setConnected(false);
      setParticipants({});
    };
    ws.onerror = (err) => {
      console.error("WS error", err);
    };
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      wsRef.current = null;
    };
  }, [reportId, user, wsUrl, handleMessage]);

  const sendDraftUpdate = useCallback(
    (field: string, value: unknown) => {
      if (
        !wsRef.current ||
        wsRef.current.readyState !== WebSocket.OPEN ||
        !user ||
        !reportId
      )
        return;
      const payload: DraftUpdate = {
        reportId,
        field,
        value,
        ts: Date.now(),
        author: user,
      };
      const msg: CollabMessage = { type: "draft_update", payload };
      wsRef.current.send(JSON.stringify(msg));
    },
    [user, reportId]
  );

  const sendChatMessage = useCallback(
    (message: string) => {
      if (!wsRef.current || !user) return;
      const payload: ChatMessage = { from: user, message, ts: Date.now() };
      const msg: CollabMessage = { type: "chat_message", payload };
      wsRef.current.send(JSON.stringify(msg));
      setChat((c) => [...c, payload]);
    },
    [user]
  );

  const requestLock = useCallback(
    (field: string) => {
      if (!wsRef.current) return;
      wsRef.current.send(
        JSON.stringify({
          type: "lock",
          payload: { field, userId: user?.userId ?? "" },
        })
      );
    },
    [user]
  );

  const releaseLock = useCallback(
    (field: string) => {
      if (!wsRef.current) return;
      wsRef.current.send(
        JSON.stringify({
          type: "unlock",
          payload: { field, userId: user?.userId ?? "" },
        })
      );
    },
    [user]
  );

  const finalize = useCallback(() => {
    if (!wsRef.current) return;
    wsRef.current.send(
      JSON.stringify({
        type: "approved",
        payload: { reportId: reportId!, by: user!, ts: Date.now() },
      })
    );
  }, [user, reportId]);

  return {
    connected,
    participants,
    chat,
    locks,
    sendDraftUpdate,
    sendChatMessage,
    requestLock,
    releaseLock,
    finalize,
  };
}
