/**
 * Multi-adapter system (HF Hub registry) — HAI-DEF Page 3.
 * Dynamic model/adapter selection for PediScreen and ROP use cases.
 */

export interface Adapter {
  id: string;
  hf_model: string;
  purpose: string;
  validation_n: number;
  sensitivity: number;
  specificity: number;
}

export const ADAPTER_REGISTRY: Adapter[] = [
  {
    id: 'pediscreen_v1',
    hf_model: 'lucylow/pediscreen-asq3-v1',
    purpose: 'ASQ-3 communication/motor calibrated',
    validation_n: 5000,
    sensitivity: 0.92,
    specificity: 0.88,
  },
  {
    id: 'rop_detector_v1',
    hf_model: 'google/medgemma-rop-zone2',
    purpose: 'ROP Zone/Stage classification',
    validation_n: 1200,
    sensitivity: 0.96,
    specificity: 0.91,
  },
  {
    id: 'asq3_calibrated',
    hf_model: 'lucylow/pediscreen-asq3-calibrated',
    purpose: 'ASQ-3 domain scoring with Platt calibration',
    validation_n: 5000,
    sensitivity: 0.91,
    specificity: 0.89,
  },
];

/**
 * Resolve adapter by id. Throws if not found.
 */
export async function getAdapter(adapterId: string): Promise<Adapter> {
  const adapter = ADAPTER_REGISTRY.find((a) => a.id === adapterId);
  if (!adapter) throw new Error(`Unknown adapter: ${adapterId}`);
  return adapter;
}

/**
 * Sync lookup (for use in non-async contexts). Returns undefined if not found.
 */
export function getAdapterSync(adapterId: string): Adapter | undefined {
  return ADAPTER_REGISTRY.find((a) => a.id === adapterId);
}

/**
 * List all registered adapter ids.
 */
export function listAdapterIds(): string[] {
  return ADAPTER_REGISTRY.map((a) => a.id);
}
