import React from "react";
import { useVitalSigns } from "@/components/iot/hooks/useVitalSigns";
import { useDeviceManager } from "@/components/iot/hooks/useDeviceManager";
import { DeviceConnectionStatus } from "@/components/iot/devices/DeviceConnectionStatus";
import { AlertCenter } from "@/components/iot/alerts/AlertCenter";
import { TrendChart } from "@/components/iot/vitals/TrendChart";
import {
  getPediatricAgeLabel,
  getVitalRangeForAge,
} from "@/components/iot/vitals/PediatricVitalRanges";
import styles from "./VitalSignsDashboard.module.css";

interface VitalSignsDashboardProps {
  patientId: string;
  ageMonths: number;
  patientDisplayName?: string;
}

export const VitalSignsDashboard: React.FC<VitalSignsDashboardProps> = ({
  patientId,
  ageMonths,
  patientDisplayName = "Monitored child",
}) => {
  const { current, history, isNormal } = useVitalSigns();
  const { devices } = useDeviceManager();

  const ageLabel = getPediatricAgeLabel(ageMonths);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div className={styles.patientInfo}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>🩺</span>
            <span>
              {patientDisplayName} • {ageLabel} ({ageMonths} mo)
            </span>
          </h1>
          <div className={styles.statusIndicator}>
            {isNormal ? (
              <span className={styles.statusNormal}>
                ✅ All vitals within expected pediatric range
              </span>
            ) : (
              <span className={styles.statusAbnormal}>
                ⚠️ Abnormal vitals detected – review now
              </span>
            )}
            <span className={styles.statusMeta}>
              Streaming via {devices.length || "0"} device
              {devices.length === 1 ? "" : "s"} • ID: {patientId}
            </span>
          </div>
        </div>
        <DeviceConnectionStatus />
      </div>

      <div className={styles.vitalsGrid}>
        <div className={styles.vitalItem}>
          <h2 className={styles.sectionLabel}>Core vitals</h2>
          <div className={styles.vitalCards}>
            <div className={styles.vitalCardWrapper}>
              <span className={styles.vitalChip}>Heart Rate</span>
              <div className={styles.vitalValuePrimary}>
                {current?.heartRate ?? "—"}
                <span className={styles.vitalUnitPrimary}>bpm</span>
              </div>
              <div className={styles.vitalSubText}>
                Range{" "}
                {getVitalRangeForAge(ageMonths, "heartRate")
                  ? `${getVitalRangeForAge(ageMonths, "heartRate")!.min}–${
                      getVitalRangeForAge(ageMonths, "heartRate")!.max
                    } bpm`
                  : "age-specific"}
              </div>
            </div>
            <div className={styles.vitalCardWrapper}>
              <span className={styles.vitalChip}>Respiratory</span>
              <div className={styles.vitalValuePrimary}>
                {current?.respiratoryRate ?? "—"}
                <span className={styles.vitalUnitPrimary}>br/min</span>
              </div>
              <div className={styles.vitalSubText}>
                Range{" "}
                {getVitalRangeForAge(ageMonths, "respiratoryRate")
                  ? `${
                      getVitalRangeForAge(ageMonths, "respiratoryRate")!.min
                    }–${
                      getVitalRangeForAge(ageMonths, "respiratoryRate")!.max
                    } br/min`
                  : "age-specific"}
              </div>
            </div>
            <div className={styles.vitalCardWrapper}>
              <span className={styles.vitalChip}>SpO₂</span>
              <div className={styles.vitalValuePrimary}>
                {current?.oxygenSaturation ?? "—"}
                <span className={styles.vitalUnitPrimary}>%</span>
              </div>
              <div className={styles.vitalSubText}>
                Target ≥{" "}
                {getVitalRangeForAge(ageMonths, "oxygenSaturation")?.min ??
                  95}
                %
              </div>
            </div>
            <div className={styles.vitalCardWrapper}>
              <span className={styles.vitalChip}>Temperature</span>
              <div className={styles.vitalValuePrimary}>
                {current?.bodyTemperature?.toFixed(1) ?? "—"}
                <span className={styles.vitalUnitPrimary}>°C</span>
              </div>
              <div className={styles.vitalSubText}>
                Range{" "}
                {getVitalRangeForAge(ageMonths, "bodyTemperature")
                  ? `${
                      getVitalRangeForAge(ageMonths, "bodyTemperature")!.min.toFixed(
                        1,
                      )
                    }–${getVitalRangeForAge(ageMonths, "bodyTemperature")!.max.toFixed(1)} °C`
                  : "36.5–37.5 °C"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.bottomSection}>
        <AlertCenter />
        <TrendChart
          data={history.slice(-48)}
          height={280}
          patientAgeMonths={ageMonths}
        />
      </div>
    </div>
  );
};

