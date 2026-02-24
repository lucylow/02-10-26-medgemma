import React, { useEffect, useState } from "react";
import type { VitalAlert } from "@/types/iot";
import { useIoTContext } from "@/components/iot/IoTProvider";
import { formatDuration, getUnit } from "./AlertCenter";
import styles from "../vitals/VitalSignsDashboard.module.css";

interface CriticalAlertProps {
  alert: VitalAlert;
}

export const CriticalAlert: React.FC<CriticalAlertProps> = ({ alert }) => {
  const { dispatch } = useIoTContext();
  const [acknowledged, setAcknowledged] = useState(alert.acknowledged);

  useEffect(() => {
    if (acknowledged) return;

    playCriticalAlertSound();
    triggerHapticFeedback();

    const timeout = setTimeout(() => {
      setAcknowledged(true);
    }, 30000);

    return () => clearTimeout(timeout);
  }, [acknowledged]);

  const handleAck = () => {
    setAcknowledged(true);
    dispatch({ type: "ALERT_ACK", payload: { id: alert.id } });
  };

  if (acknowledged) return null;

  return (
    <div className={styles.criticalAlert}>
      <div className={styles.criticalIcon}>🚨</div>
      <div className={styles.alertContent}>
        <h3 className={styles.criticalTitle}>
          CRITICAL: {String(alert.vital).toUpperCase()}
        </h3>
        <div className={styles.alertValue}>
          {alert.currentValue} {getUnit(alert.vital)}{" "}
          <span className={styles.alertThreshold}>
            (Limit {alert.threshold.max})
          </span>
        </div>
        <p className={styles.alertDuration}>
          {formatDuration(alert.duration)} above threshold
        </p>
      </div>
      <button
        type="button"
        className={styles.ackButton}
        onClick={handleAck}
      >
        ACKNOWLEDGE
      </button>
    </div>
  );
};

const playCriticalAlertSound = () => {
  try {
    const win = window as any;
    const AudioContextRef = win.AudioContext || win.webkitAudioContext;
    if (!AudioContextRef) return;
    const audioCtx = new AudioContextRef();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.15;

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      audioCtx.close();
    }, 300);
  } catch {
    // Swallow audio errors – alerts should never crash UI
  }
};

const triggerHapticFeedback = () => {
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
};

