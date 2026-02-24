import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AgentSwarmDashboard } from './AgentSwarmDashboard';
import { AgentCommunicationsPanel } from './AgentCommunicationsPanel';
import { useAgentSwarm } from '@/stores/agentSwarm';

const meta: Meta<typeof AgentSwarmDashboard> = {
  title: 'Agents/AgentSwarmDashboard',
  component: AgentSwarmDashboard,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AgentSwarmDashboard>;

export const Default: Story = {};

export const WithActivePatient: Story = {
  decorators: [
    (Story) => {
      useAgentSwarm.getState().startScreeningSession('demo-123');
      return <Story />;
    },
  ],
};
