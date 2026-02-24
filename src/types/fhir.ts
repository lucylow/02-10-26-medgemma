/**
 * Minimal FHIR R4 types used by the c-Free integration.
 * These are intentionally partial and focused on pediatrics / observations.
 */

export interface FHIRIdentifier {
  system?: string;
  value?: string;
}

export interface FHIRCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FHIRCodeableConcept {
  coding?: FHIRCoding[];
  text?: string;
}

export interface FHIRExtension {
  url: string;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
}

export interface FHIRReference {
  reference?: string;
  type?: string;
  identifier?: FHIRIdentifier;
  display?: string;
}

export interface FHIRPatient {
  resourceType: "Patient";
  id?: string;
  identifier?: FHIRIdentifier[];
  birthDate?: string;
  gender?: "male" | "female" | "other" | "unknown";
  extension?: FHIRExtension[];
}

export interface FHIRObservation {
  resourceType: "Observation";
  id?: string;
  status?: string;
  code?: FHIRCodeableConcept;
  subject?: FHIRReference;
  effectiveDateTime?: string;
  valueQuantity?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  interpretation?: FHIRCodeableConcept[];
  component?: FHIRObservation[];
}

export interface FHIRCondition {
  resourceType: "Condition";
  id?: string;
  code?: FHIRCodeableConcept;
  subject?: FHIRReference;
  onsetDateTime?: string;
  clinicalStatus?: FHIRCodeableConcept;
  verificationStatus?: FHIRCodeableConcept;
}

export interface FHIREncounter {
  resourceType: "Encounter";
  id?: string;
  status?: string;
  class?: FHIRCodeableConcept;
  subject?: FHIRReference;
  period?: {
    start?: string;
    end?: string;
  };
  serviceProvider?: FHIRReference;
}

export interface FHIRBundleEntry {
  fullUrl?: string;
  resource?: FHIRPatient | FHIRObservation | FHIRCondition | FHIREncounter;
}

export interface FHIRBundle {
  resourceType: "Bundle";
  type?: string;
  total?: number;
  entry?: FHIRBundleEntry[];
}

