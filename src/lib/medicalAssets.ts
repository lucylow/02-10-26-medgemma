/**
 * HAI-DEF multimodal medical assets — curated image and audio visual paths.
 *
 * This builds on top of the existing medical asset pipeline in `images.ts`
 * and adds opinionated groupings for ROP, Xray, dermatology, and audio
 * spectrograms used by the multimodal demo components.
 *
 * All paths are rooted under `public/images/medical/` and are safe to use
 * even when the underlying assets are not yet present (the UI components
 * provide graceful fallbacks).
 */

import { medicalImage as baseMedicalImage } from "@/lib/images";

/**
 * Canonical multimodal image map for clinical demos.
 *
 * NOTE: The concrete files (e.g. `rop/zone1/stage3.png`) are expected to be
 * populated by the asset pipeline described in `public/images/medical/README.md`.
 * Until then, components should rely on `onError` fallbacks.
 */
export const MEDICAL_IMAGES = {
  ROP: {
    zone1: {
      stage1: baseMedicalImage("rop/zone1/stage1.png"),
      stage3: baseMedicalImage("rop/zone1/stage3.png"),
      stage5: baseMedicalImage("rop/zone1/stage5.png"),
      normal: baseMedicalImage("rop/zone1/normal.png"),
    },
    zone2: {
      stage3: baseMedicalImage("rop/zone2/stage3.png"),
      normal: baseMedicalImage("rop/zone2/normal.png"),
    },
    zone3: {
      normal: baseMedicalImage("rop/zone3/normal.png"),
    },
  },
  XRAY: {
    pneumonia: baseMedicalImage("xray/pneumonia.png"),
    normal_chest: baseMedicalImage("xray/normal_chest.png"),
    abdomen_obstruction: baseMedicalImage("xray/abdomen_obstruction.png"),
  },
  DERMATOLOGY: {
    atopic_dermatitis: baseMedicalImage("dermatology/atopic_dermatitis.png"),
    impetigo: baseMedicalImage("dermatology/impetigo.png"),
  },
  AUDIO_WAVEFORMS: {
    cry_hunger: baseMedicalImage("audio-waveforms/cry_hunger.png"),
    cry_pain: baseMedicalImage("audio-waveforms/cry_pain.png"),
    lung_crackles: baseMedicalImage("audio-waveforms/lung_crackles.png"),
  },
  MOCK_EMBEDDINGS: {
    medsiglip_256: baseMedicalImage("mock-embeddings/medsiglip_256.png"),
  },
} as const;

/**
 * Thin wrapper retained for future width/quality-aware loaders (e.g. CDN).
 * For now, this simply delegates to the base `medicalImage` helper.
 */
export function medicalImage(path: string, _width = 512): string {
  return baseMedicalImage(path);
}

/**
 * Mock embedding metadata used when simulating the MedSigLIP → MedGemma-2B
 * pipeline. This mirrors the shape used by `inferWithEmbedding`.
 */
export interface MockHAIEmbedding {
  embedding_b64: string;
  shape: [1, 256];
  clinical_features: {
    rop_zone: "zone1" | "zone2" | "zone3";
    stage: 0 | 1 | 2 | 3 | 4 | 5;
    confidence: number;
  };
}

