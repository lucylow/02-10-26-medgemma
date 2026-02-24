import React from "react";
import type { VitalAlert } from "@/types/iot";
import { useIoTContext } from "@/components/iot/IoTProvider";
import { CriticalAlert } from "./CriticalAlert";
import styles from "../vitals/VitalSignsDashboard.module.css";

interface AlertCenterProps {
  alerts?: VitalAlert[];
}

export const AlertCenter: React.FC<AlertCenterProps> = ({ alerts }) => {
  const { state } = useIoTContext();
  const allAlerts = alerts ?? state.alerts;

  if (!allAlerts.length) return null;

  const criticalAlerts = allAlerts.filter((a) => a.type === "critical");
  const warningAlerts = allAlerts.filter((a) => a.type === "warning");

  return (
    <div className={styles.alertCenter}>
      {criticalAlerts.map((alert) => (
        <CriticalAlert key={alert.id} alert={alert} />
      ))}

      {warningAlerts.slice(0, 3).map((alert) => (
        <div key={alert.id} className={styles.alertCard}>
          <div className={styles.alertCardHeader}>
            <span className={styles.alertCardTitle}>
              Warning: {alert.vital}
            </span>
            <span className={styles.alertCardValue}>
              {alert.currentValue}{" "}
              <span className={styles.alertCardUnit}>
                {getUnit(alert.vital)}
              </span>
            </span>
          </div>
          <p className={styles.alertCardBody}>
            Above threshold for {formatDuration(alert.duration)}.
          </p>
        </div>
      ))}
    </div>
  );
};

export const getUnit = (vital: VitalAlert["vital"]): string => {
  switch (vital) {
    case "heartRate":
      return "bpm";
    case "respiratoryRate":
      return "breaths/min";
    case "oxygenSaturation":
      return "%";
    case "bodyTemperature":
      return "°C";
    default:
      return "";
  }
};

export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds < 60) {
    return `${Math.round(seconds || 0)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (minutes < 60) {
    return rem
      ? `${minutes}m ${Math.round(rem)}s`
      : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes
    ? `${hours}h ${remMinutes}m`
    : `${hours}h`;
};

