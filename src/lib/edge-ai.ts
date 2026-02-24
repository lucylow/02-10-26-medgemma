import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type {
  DeploymentTarget,
  EdgeAIHardware,
  EdgeDeviceHealthStatus,
  EdgeDeviceMetrics,
  EdgeHardwareTier,
} from "@/types/edge-ai";

/**
 * Static Edge AI hardware catalog with PediScreen-specific metrics.
 * This is safe to ship to the frontend (no PHI).
 */
export const HARDWARE_CATALOG: EdgeAIHardware[] = [
  {
    id: "jetson-orin-nano-8gb",
    name: "NVIDIA Jetson Orin Nano 8GB",
    vendor: "NVIDIA",
    series: "Jetson Orin",
    model: "Orin Nano 8GB",
    tier: "tier1",
    specs: {
      ai_tops_int8: 40,
      power_watt_min: 7,
      power_watt_max: 25,
      ram_gb: 8,
      flash_gb: 64,
      form_factor: "module",
      size_mm: { w: 69, h: 45 },
      price_usd: 499,
      connectivity: ["wifi", "eth", "usb"],
    },
    pediscreen_capabilities: {
      cry_detection_f1: 0.94,
      medgemma_inference: true,
      simultaneous_infants: 12,
      battery_hours: 8,
      latency_ms: 0.4,
    },
    deployment_status: "available",
  },
  {
    id: "jetson-orin-nx-16gb",
    name: "NVIDIA Jetson Orin NX 16GB",
    vendor: "NVIDIA",
    series: "Jetson Orin",
    model: "Orin NX 16GB",
    tier: "tier1",
    specs: {
      ai_tops_int8: 100,
      power_watt_min: 10,
      power_watt_max: 40,
      ram_gb: 16,
      flash_gb: 128,
      form_factor: "module",
      size_mm: { w: 72, h: 45 },
      price_usd: 699,
      connectivity: ["wifi", "eth", "usb"],
    },
    pediscreen_capabilities: {
      cry_detection_f1: 0.95,
      medgemma_inference: true,
      simultaneous_infants: 24,
      battery_hours: 6,
      latency_ms: 0.35,
    },
    deployment_status: "available",
  },
  {
    id: "hailo-8-m2",
    name: "Hailo-8 M.2 Wearable Hub",
    vendor: "Hailo",
    series: "Hailo-8",
    model: "Hailo-8 M.2",
    tier: "tier2",
    specs: {
      ai_tops_int8: 26,
      power_watt_min: 2.5,
      power_watt_max: 8,
      ram_gb: 4,
      flash_gb: 16,
      form_factor: "m2",
      size_mm: { w: 22, h: 80 },
      price_usd: 349,
      connectivity: ["ble", "wifi", "usb"],
    },
    pediscreen_capabilities: {
      cry_detection_f1: 0.93,
      medgemma_inference: false,
      simultaneous_infants: 8,
      battery_hours: 24,
      latency_ms: 0.7,
    },
    deployment_status: "available",
  },
  {
    id: "hailo-8-wearable-patch",
    name: "Hailo-8 Smart Patch",
    vendor: "Hailo",
    series: "Hailo-8",
    model: "Wearable Patch",
    tier: "tier2",
    specs: {
      ai_tops_int8: 18,
      power_watt_min: 1.5,
      power_watt_max: 4,
      ram_gb: 2,
      flash_gb: 8,
      form_factor: "soc",
      size_mm: { w: 35, h: 35 },
      price_usd: 199,
      connectivity: ["ble"],
    },
    pediscreen_capabilities: {
      cry_detection_f1: 0.93,
      medgemma_inference: false,
      simultaneous_infants: 4,
      battery_hours: 72,
      latency_ms: 0.8,
    },
    deployment_status: "available",
  },
  {
    id: "coral-dev-board",
    name: "Google Coral Dev Board",
    vendor: "Google",
    series: "Coral Edge TPU",
    model: "Dev Board",
    tier: "tier2",
    specs: {
      ai_tops_int8: 4,
      power_watt_min: 2,
      power_watt_max: 10,
      ram_gb: 1,
      flash_gb: 8,
      form_factor: "dev_kit",
      size_mm: { w: 88, h: 60 },
      price_usd: 149,
      connectivity: ["wifi", "eth", "usb"],
    },
    pediscreen_capabilities: {
      cry_detection_f1: 0.9,
      medgemma_inference: false,
      simultaneous_infants: 3,
      battery_hours: 10,
      latency_ms: 1.2,
    },
    deployment_status: "available",
  },
  {
    id: "coral-usb-accelerator",
    name: "Google Coral USB Accelerator",
    vendor: "Google",
    series: "Coral Edge TPU",
    model: "USB Accelerator",
    tier: "tier2",
    specs: {
      ai_tops_int8: 4,
      power_watt_min: 1,
      power_watt_max: 5,
      ram_gb: 0.5,
      flash_gb: 0,
      form_factor: "usb",
      size_mm: { w: 40, h: 65 },
      price_usd: 99,
      connectivity: ["usb"],
    },
    pediscreen_capabilities: {
      cry_detection_f1: 0.9,
      medgemma_inference: false,
      simultaneous_infants: 2,
      battery_hours: 20,
      latency_ms: 1.5,
    },
    deployment_status: "available",
  },
  {
    id: "arm-ethos-u55-mcu",
    name: "Arm Ethos-U55 MCU",
    vendor: "Arm",
    series: "Ethos-U",
    model: "Ethos-U55",
    tier: "tier3",
    specs: {
      ai_tops_int8: 0.5,
      power_watt_min: 0.05,
      power_watt_max: 0.5,
      ram_gb: 0.25,
      flash_gb: 2,
      form_factor: "soc",
      size_mm: { w: 15, h: 15 },
      price_usd: 15,
      connectivity: ["i2c"],
    },
    pediscreen_capabilities: {
      cry_detection_f1: 0.88,
      medgemma_inference: false,
      simultaneous_infants: 1,
      battery_hours: 720, // 30 days on coin cell
      latency_ms: 5,
    },
    deployment_status: "available",
  },
  {
    id: "syntiant-ndp120",
    name: "Syntiant NDP120",
    vendor: "Syntiant",
    series: "NDP",
    model: "NDP120",
    tier: "tier3",
    specs: {
      ai_tops_int8: 0.1,
      power_watt_min: 0.01,
      power_watt_max: 0.1,
      ram_gb: 0.0625,
      flash_gb: 1,
      form_factor: "soc",
      size_mm: { w: 7, h: 7 },
      price_usd: 9,
      connectivity: ["i2c"],
    },
    pediscreen_capabilities: {
      cry_detection_f1: 0.9,
      medgemma_inference: false,
      simultaneous_infants: 1,
      battery_hours: 1440, // 60 days ultra-low-power
      latency_ms: 0.7,
    },
    deployment_status: "available",
  },
];

const MOCK_DEPLOYMENTS: DeploymentTarget[] = [
  {
    id: "deployment-clinic-3-orin-nano",
    hardware: HARDWARE_CATALOG[0],
    patient_count: 32,
    location: "CHW Clinic #3",
    uptime_hours: 72,
    last_heartbeat: new Date(),
    models_loaded: ["cry_detector_int8", "medgemma_2b_q4"],
    status: "healthy",
    tags: ["clinic", "tablet", "pilot"],
  },
  {
    id: "deployment-rural-hub-hailo8",
    hardware: HARDWARE_CATALOG[2],
    patient_count: 18,
    location: "Rural Health Post - North Valley",
    uptime_hours: 240,
    last_heartbeat: new Date(),
    models_loaded: ["cry_detector_int8", "pain_classifier_tflite"],
    status: "warning",
    tags: ["wearable", "battery-optimized"],
  },
];

export type EdgeDeploymentUpdateListener = (deployments: DeploymentTarget[]) => void;

export class EdgeAIDeviceManager {
  private tierOrder: EdgeHardwareTier[] = ["tier1", "tier2", "tier3"];
  private listeners = new Set<EdgeDeploymentUpdateListener>();
  private unsubscribeSupabase?: () => void;

  getHardwareCatalog(): EdgeAIHardware[] {
    return HARDWARE_CATALOG;
  }

  filterByTier(tier: EdgeHardwareTier | "all"): EdgeAIHardware[] {
    if (tier === "all") return HARDWARE_CATALOG;
    return HARDWARE_CATALOG.filter((h) => h.tier === tier);
  }

  /**
   * Fetch current deployments.
   * - Uses Supabase `edge_deployments` table when configured.
   * - Falls back to mock deployments for local/demo use.
   */
  async getLiveDeployments(): Promise<DeploymentTarget[]> {
    if (!isSupabaseConfigured) {
      return MOCK_DEPLOYMENTS;
    }

    try {
      const { data, error } = await supabase
        .from("edge_deployments")
        .select(
          "id, hardware_id, patient_count, location, uptime_hours, last_heartbeat, models_loaded, status, tags",
        );

      if (error || !data) {
        // eslint-disable-next-line no-console
        console.warn("edge-ai: falling back to mock deployments", error);
        return MOCK_DEPLOYMENTS;
      }

      type EdgeDeploymentRow = {
        id: string;
        hardware_id: string;
        patient_count?: number;
        location?: string;
        uptime_hours?: number;
        last_heartbeat?: string | null;
        models_loaded?: unknown;
        status?: string;
        tags?: unknown;
      };

      return data
        .map((row: EdgeDeploymentRow) => {
          const hardware = HARDWARE_CATALOG.find((h) => h.id === row.hardware_id);
          if (!hardware) return null;
          return {
            id: row.id,
            hardware,
            patient_count: row.patient_count ?? 0,
            location: row.location ?? "Unknown location",
            uptime_hours: row.uptime_hours ?? 0,
            last_heartbeat: row.last_heartbeat ? new Date(row.last_heartbeat) : new Date(),
            models_loaded: Array.isArray(row.models_loaded) ? row.models_loaded : [],
            status: (row.status ?? "healthy") as EdgeDeviceHealthStatus,
            tags: Array.isArray(row.tags) ? row.tags : undefined,
          } satisfies DeploymentTarget;
        })
        .filter(Boolean) as DeploymentTarget[];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("edge-ai: error fetching deployments, using mock data", err);
      return MOCK_DEPLOYMENTS;
    }
  }

  /**
   * Subscribe to Supabase realtime changes for `edge_deployments`.
   * When Supabase is not configured, this becomes a no-op with immediate mock emission.
   */
  async subscribeToLiveDeployments(listener: EdgeDeploymentUpdateListener): Promise<() => void> {
    this.listeners.add(listener);

    const initial = await this.getLiveDeployments();
    listener(initial);

    if (!isSupabaseConfigured) {
      // No realtime backend; just return unsubscribe for listener set.
      return () => {
        this.listeners.delete(listener);
      };
    }

    if (!this.unsubscribeSupabase) {
      const channel = supabase
        .channel("edge_deployments_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "edge_deployments",
          },
          async () => {
            const deployments = await this.getLiveDeployments();
            for (const l of this.listeners) {
              l(deployments);
            }
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            // eslint-disable-next-line no-console
            console.log("edge-ai: subscribed to edge_deployments realtime");
          }
        });

      this.unsubscribeSupabase = () => {
        supabase.removeChannel(channel);
      };
    }

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.unsubscribeSupabase) {
        this.unsubscribeSupabase();
        this.unsubscribeSupabase = undefined;
      }
    };
  }

  /**
   * Mocked device metrics for UI demos.
   * In production, this should be populated from the IoT backend (WebSocket or polling).
   */
  getMockMetricsForDeployment(deployment: DeploymentTarget): EdgeDeviceMetrics {
    const baseTemp = deployment.hardware.vendor === "NVIDIA" ? 55 : 40;
    const variance = deployment.status === "critical" ? 15 : deployment.status === "warning" ? 8 : 4;

    const cpuTempC = baseTemp + Math.random() * variance;

    return {
      deviceId: deployment.id,
      uptimeHours: deployment.uptime_hours,
      cpuTempC: Math.round(cpuTempC * 10) / 10,
      memoryUtilPercent: 40 + Math.random() * 40,
      inferenceLatencyMs: deployment.hardware.pediscreen_capabilities.latency_ms * (0.8 + Math.random() * 0.4),
      modelStatuses: deployment.models_loaded,
      lastHeartbeat: deployment.last_heartbeat,
    };
  }
}

