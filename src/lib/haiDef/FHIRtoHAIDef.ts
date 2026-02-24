import type { DeidentifiedPatient } from "@/lib/fhir/cFreeClient";
import type { FHIRObservation } from "@/types/fhir";
import type { HAIRiskLevel } from "@/types/hai";

export interface HAIDefEvidenceItem {
  modality: "text" | "pathology" | "cxr";
  source?: string;
  embedding_dim?: number;
  confidence: number;
}

export interface HAIDefRiskReport {
  patient_id: string;
  risk_level: "referral" | "urgent" | "monitor" | "ontrack";
  clinical_probability: number;
  evidence: HAIDefEvidenceItem[];
  fhir_provenance: {
    observations_used: number;
    deidentification_method: string;
    compliance: string;
  };
}

export interface HAIDefModelConfig {
  medgemma: string;
  pathFoundation?: string;
  cxrFoundation?: string;
}

interface ClinicalContext {
  text: string;
  pathology_image_b64?: string;
  cxr_image_b64?: string;
}

/**
 * Extracts a compact clinical summary from FHIR observations suitable for
 * MedGemma-style language models.
 */
function extractFHIRContext(patient: DeidentifiedPatient): ClinicalContext {
  const lines: string[] = [];

  lines.push(`Age (months): ${patient.age_months}`);
  lines.push(`Gender: ${patient.gender}`);

  const sortedObservations = [...patient.observations].sort((a, b) => {
    const da = a.effectiveDateTime ? Date.parse(a.effectiveDateTime) : 0;
    const db = b.effectiveDateTime ? Date.parse(b.effectiveDateTime) : 0;
    return da - db;
  });

  for (const obs of sortedObservations.slice(0, 50)) {
    const label = obs.code?.text ?? obs.code?.coding?.[0]?.display ?? "Observation";
    const when = obs.effectiveDateTime ?? "";
    if (obs.valueQuantity?.value != null) {
      lines.push(
        `OBS: ${label} = ${obs.valueQuantity.value} ${obs.valueQuantity.unit ?? ""} (${when})`,
      );
    } else if (obs.valueString) {
      lines.push(`OBS: ${label} = ${obs.valueString} (${when})`);
    } else {
      lines.push(`OBS: ${label} (${when})`);
    }
  }

  if (patient.conditions.length > 0) {
    const conditionLabels = patient.conditions
      .slice(0, 10)
      .map((c) => c.code?.text ?? c.code?.coding?.[0]?.display)
      .filter(Boolean);
    if (conditionLabels.length > 0) {
      lines.push(`Conditions: ${conditionLabels.join(", ")}`);
    }
  }

  return {
    text: lines.join("\n"),
  };
}

/**
 * Placeholder MedGemma inference – in production this would call the
 * existing backend /api/orchestrate or HAI-DEF runtime. Here we keep the
 * contract narrow so the pipeline can be easily wired to the real model.
 */
async function medGemmaInference(
  clinicalText: string,
  _modelId: string,
): Promise<{ risk: HAIRiskLevel; probability: number }> {
  const length = clinicalText.length;
  if (length === 0) {
    return { risk: "low", probability: 0.1 };
  }
  const probability = Math.min(0.99, 0.2 + Math.log10(length + 10) / 2);
  const risk: HAIRiskLevel =
    probability > 0.8 ? "urgent" : probability > 0.6 ? "referral" : probability > 0.4 ? "monitor" : "low";
  return { risk, probability };
}

async function pathFoundationEmbed(
  _imageB64: string | undefined,
  _modelId?: string,
): Promise<number[]> {
  return [];
}

async function cxrFoundationEmbed(
  _imageB64: string | undefined,
  _modelId?: string,
): Promise<number[]> {
  return [];
}

function mapRiskToOntrack(risk: HAIRiskLevel): HAIDefRiskReport["risk_level"] {
  if (risk === "low") return "ontrack";
  return risk;
}

export async function fhirToHAIDefInference(
  deidentifiedPatient: DeidentifiedPatient,
  haiDefModels: HAIDefModelConfig,
): Promise<HAIDefRiskReport> {
  const clinicalContext = extractFHIRContext(deidentifiedPatient);

  const [textResult, pathEmb, cxrEmb] = await Promise.all([
    medGemmaInference(clinicalContext.text, haiDefModels.medgemma),
    pathFoundationEmbed(clinicalContext.pathology_image_b64, haiDefModels.pathFoundation),
    cxrFoundationEmbed(clinicalContext.cxr_image_b64, haiDefModels.cxrFoundation),
  ]);

  const risk_level = mapRiskToOntrack(textResult.risk);
  const clinical_probability = textResult.probability;

  const evidence: HAIDefEvidenceItem[] = [
    {
      modality: "text",
      source: "FHIR Observation",
      confidence: clinical_probability,
    },
  ];

  if (pathEmb.length > 0) {
    evidence.push({
      modality: "pathology",
      embedding_dim: pathEmb.length,
      confidence: 0.3,
    });
  }

  if (cxrEmb.length > 0) {
    evidence.push({
      modality: "cxr",
      embedding_dim: cxrEmb.length,
      confidence: 0.3,
    });
  }

  return {
    patient_id: deidentifiedPatient.patient_id,
    risk_level,
    clinical_probability,
    evidence,
    fhir_provenance: {
      observations_used: deidentifiedPatient.observations.length,
      deidentification_method: "SHA256_MRN_hash",
      compliance: "HIPAA_SafeHarbor",
    },
  };
}

