import type { Meta, StoryObj } from "@storybook/react";
import { OverviewCard } from "@/components/charts/OverviewCard";
import { Wifi, WifiOff, Zap, Clock, DollarSign } from "lucide-react";

const meta: Meta<typeof OverviewCard> = {
  title: "Telemetry/OverviewCard",
  component: OverviewCard,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof OverviewCard>;

export const Active: Story = {
  args: {
    icon: Wifi,
    iconClassName: "text-success",
    pulse: true,
    title: "AI Connection",
    value: "Active",
    subtitle: "Last used 2m ago",
  },
};

export const Inactive: Story = {
  args: {
    icon: WifiOff,
    title: "AI Connection",
    value: "Inactive",
    subtitle: "Last used 3d ago",
  },
};

export const TotalRequests: Story = {
  args: {
    icon: Zap,
    iconClassName: "text-primary",
    title: "Total Requests",
    value: 1274,
    subtitle: "98.5% success rate",
  },
};

export const Latency: Story = {
  args: {
    icon: Clock,
    iconClassName: "text-warning",
    title: "Avg Latency",
    value: "320ms",
    subtitle: "2 fallbacks",
  },
};

export const Cost: Story = {
  args: {
    icon: DollarSign,
    iconClassName: "text-success",
    title: "Est. Cost",
    value: "$0.0142",
    subtitle: "2 models used",
  },
};
