// src/components/iot/DeviceAlertStream.tsx
import { AnimatePresence, motion } from "framer-motion";
import type { WebSocketMessage, AlertPayload } from "@/types/websocket";

interface DeviceAlertStreamProps {
  alerts: WebSocketMessage<AlertPayload>[];
}

export function DeviceAlertStream({ alerts }: DeviceAlertStreamProps) {
  const recentAlerts = alerts.slice(0, 5);

  if (!recentAlerts.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">
        Live critical alerts
      </h3>
      <AnimatePresence initial={false}>
        {recentAlerts.map((alert) => (
          <motion.div
            key={alert.sequence}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-xs shadow-sm dark:border-red-900/50 dark:bg-red-900/15"
          >
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-red-900 dark:text-red-100">
                {alert.payload.title}
              </div>
              <div className="truncate text-red-800 dark:text-red-200">
                {alert.payload.message}
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-red-600/80 dark:text-red-200/90">
                <span className="capitalize">{alert.payload.severity}</span>
                <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default DeviceAlertStream;

