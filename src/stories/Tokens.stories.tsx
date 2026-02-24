import type { Meta, StoryObj } from "@storybook/react";
import { tokens } from "@/styles/tokens";

const meta: Meta = {
  title: "Design System/Tokens",
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj;

export const ColorSwatches: Story = {
  render: () => (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <h2 style={{ marginBottom: 16 }}>Risk hierarchy (medical priority)</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 8,
              background: tokens.colors.referral,
              marginBottom: 4,
            }}
          />
          <span style={{ fontSize: 12 }}>referral</span>
        </div>
        <div>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 8,
              background: tokens.colors.urgent,
              marginBottom: 4,
            }}
          />
          <span style={{ fontSize: 12 }}>urgent</span>
        </div>
        <div>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 8,
              background: tokens.colors.monitor,
              marginBottom: 4,
            }}
          />
          <span style={{ fontSize: 12 }}>monitor</span>
        </div>
        <div>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 8,
              background: tokens.colors.ontrack,
              marginBottom: 4,
            }}
          />
          <span style={{ fontSize: 12 }}>ontrack</span>
        </div>
      </div>
      <h2 style={{ marginTop: 24, marginBottom: 16 }}>Primary & surface</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 8,
              background: tokens.colors.primary,
              marginBottom: 4,
            }}
          />
          <span style={{ fontSize: 12 }}>primary</span>
        </div>
        <div>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 8,
              background: tokens.colors.surface,
              border: "1px solid #eee",
              marginBottom: 4,
            }}
          />
          <span style={{ fontSize: 12 }}>surface</span>
        </div>
        <div>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 8,
              background: tokens.colors.card,
              border: "1px solid #eee",
              marginBottom: 4,
            }}
          />
          <span style={{ fontSize: 12 }}>card</span>
        </div>
      </div>
      <h2 style={{ marginTop: 24, marginBottom: 16 }}>Spacing</h2>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        {(["xs", "sm", "md", "lg", "xl", "xxl"] as const).map((key) => (
          <div key={key} style={{ textAlign: "center" }}>
            <div
              style={{
                width: tokens.spacing[key],
                height: tokens.spacing[key],
                background: tokens.colors.primary,
                opacity: 0.7,
                borderRadius: 4,
              }}
            />
            <span style={{ fontSize: 11 }}>{key}</span>
          </div>
        ))}
      </div>
      <h2 style={{ marginTop: 24, marginBottom: 16 }}>Radii</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {(["sm", "md", "lg", "full"] as const).map((key) => (
          <div key={key} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: tokens.radii[key] === 9999 ? "50%" : tokens.radii[key],
                background: tokens.colors.primary,
                opacity: 0.8,
              }}
            />
            <span style={{ fontSize: 11 }}>{key}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};
