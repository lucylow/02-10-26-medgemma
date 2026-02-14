/**
 * Design Review — full flow: capture → infer → results
 * Demonstrates risk levels and evidence toggles with knobs
 */
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { MedGemmaCard } from "@/components/medgemma/Card/Card";
import { MedGemmaButton } from "@/components/medgemma/Button/Button";
import { RiskChip } from "@/components/medgemma/RiskChip/RiskChip";

const meta: Meta = {
  title: "MedGemma/Flow",
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj;

export const Home: Story = {
  render: () => (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <MedGemmaCard title="PediScreen AI — Quick Screening">
        <p style={{ marginBottom: 16 }}>
          Start a developmental screening for your child.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <MedGemmaButton variant="primary">Start screening</MedGemmaButton>
          <MedGemmaButton variant="secondary">Clinician Dashboard</MedGemmaButton>
          <MedGemmaButton variant="outline">Settings</MedGemmaButton>
        </div>
      </MedGemmaCard>
    </div>
  ),
};

export const ResultsOnTrack: Story = {
  render: () => (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <MedGemmaCard title="Screening Results">
        <div style={{ marginBottom: 16 }}>
          <RiskChip risk="on_track" aria-label="Risk level: On Track" />
        </div>
        <p style={{ marginBottom: 12 }}>
          Your child demonstrates age-appropriate development. Continue regular
          monitoring.
        </p>
        <ul style={{ marginLeft: 20, marginBottom: 16 }}>
          <li>Try 5 minutes of language modeling daily</li>
          <li>Rescreen in 3 months</li>
        </ul>
        <MedGemmaButton variant="primary">Share</MedGemmaButton>
      </MedGemmaCard>
    </div>
  ),
};

export const ResultsMonitor: Story = {
  render: () => (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <MedGemmaCard title="Screening Results">
        <div style={{ marginBottom: 16 }}>
          <RiskChip risk="monitor" aria-label="Risk level: Monitor" />
        </div>
        <p style={{ marginBottom: 12 }}>
          Some areas may benefit from a closer look. See clinician if concerns
          persist.
        </p>
        <ul style={{ marginLeft: 20, marginBottom: 16 }}>
          <li>Parental report: few words</li>
          <li>Drawing: age-typical</li>
        </ul>
        <MedGemmaButton variant="primary">Request Referral</MedGemmaButton>
      </MedGemmaCard>
    </div>
  ),
};

export const ResultsRefer: Story = {
  render: () => (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <MedGemmaCard title="Screening Results">
        <div style={{ marginBottom: 16 }}>
          <RiskChip risk="refer" aria-label="Risk level: Refer" />
        </div>
        <p style={{ marginBottom: 12 }}>
          This screening suggests it may be helpful to check in with a
          specialist or pediatrician.
        </p>
        <ul style={{ marginLeft: 20, marginBottom: 16 }}>
          <li>Significant delay indicators present</li>
          <li>Professional evaluation recommended</li>
        </ul>
        <MedGemmaButton variant="primary">Save PDF</MedGemmaButton>
      </MedGemmaCard>
    </div>
  ),
};
