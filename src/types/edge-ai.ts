// PediScreen Edge AI Hardware Deployment Types
// Frontend-only types describing edge accelerators, deployments, and live metrics.

export type EdgeHardwareVendor = "NVIDIA" | "Hailo" | "Google" | "Intel" | "Arm" | "Syntiant";

export type EdgeHardwareTier = "tier1" | "tier2" | "tier3";

export type EdgeHardwareFormFactor = "module" | "dev_kit" | "soc" | "m2" | "usb";

export type EdgeConnectivity = "ble" | "wifi" | "eth" | "usb" | "i2c";

export type EdgeDeploymentStatus = "available" | "deployed" | "provisioning";

export type EdgeDeviceHealthStatus = "healthy" | "warning" | "critical" | "offline";

export type EdgeAIHardware = {
  id: string;
  name: string;
  vendor: EdgeHardwareVendor;
  /**
   * High-level family/series, e.g. "Jetson Orin", "Hailo-8", "Coral Edge TPU".
   */
  series: string;
  /**
   * Specific SKU or module, e.g. "Orin Nano 8GB", "Hailo-8 M.2", "Dev Board".
   */
  model: string;
  /**
   * Logical tier for UI filtering.
   * - tier1: clinic workstations / CHW tablets (highest performance)
   * - tier2: wearables / bedside hubs (battery-focused)
   * - tier3: ultra-low-power MCUs (cost-optimized)
   */
  tier?: EdgeHardwareTier;
  specs: {
    ai_tops_int8: number; // 40 TOPS, 26 TOPS, etc.
    power_watt_min: number; // 2.5W, 7W, etc.
    power_watt_max: number;
    ram_gb: number;
    flash_gb: number;
    form_factor: EdgeHardwareFormFactor;
    size_mm: { w: number; h: number };
    price_usd: number;
    connectivity: EdgeConnectivity[];
  };
  pediscreen_capabilities: {
    /**
     * Cry detection F1 score (0-1) for this hardware profile.
     */
    cry_detection_f1: number;
    /**
     * Whether this device can run the full MedGemma model (quantized).
     */
    medgemma_inference: boolean;
    /**
     * Approximate number of simultaneous infants supported at target latency.
     */
    simultaneous_infants: number;
    /**
     * Typical battery life in hours for the intended deployment form (tablet, wearable, MCU).
     */
    battery_hours: number;
    /**
     * Median end-to-end inference latency in milliseconds for the primary model (cry or MedGemma).
     */
    latency_ms: number;
  };
  deployment_status: EdgeDeploymentStatus;
};

export type DeploymentTarget = {
  /**
   * Logical deployment identifier (not PHI).
   */
  id: string;
  /**
   * Reference to the hardware catalog entry.
   */
  hardware: EdgeAIHardware;
  /**
   * Approximate number of infants currently covered by this deployment.
   */
  patient_count: number;
  /**
   * Human-readable location label, e.g. "CHW Clinic #3", "Rural Health Post".
   */
  location: string;
  /**
   * Uptime in hours since last reboot.
   */
  uptime_hours: number;
  /**
   * Last heartbeat timestamp from the device.
   */
  last_heartbeat: Date;
  /**
   * Model identifiers currently loaded on-device.
   * Example: ["cry_detector_int8", "medgemma_2b_q4"]
   */
  models_loaded: string[];
  /**
   * Aggregated health status used for UI highlighting.
   */
  status?: EdgeDeviceHealthStatus;
  /**
    * Optional non-PHI tags for filtering in the dashboard.
    * Example: ["NICU", "wearable", "trial-cohort-a"]
    */
  tags?: string[];
};

export type EdgeDeviceMetrics = {
  deviceId: string;
  uptimeHours: number;
  cpuTempC: number;
  gpuTempC?: number;
  memoryUtilPercent: number;
  inferenceLatencyMs?: number;
  modelStatuses: string[];
  lastHeartbeat: Date;
};

export type EdgeModelConfig = {
  id: string;
  name: string;
  description: string;
  sizeMb: number;
  targetHardware: EdgeHardwareVendor[] | "any";
  fileName: string;
};

