import type { Meta, StoryObj } from '@storybook/react';
import { AgentCommunicationsPanel } from './AgentCommunicationsPanel';

const meta: Meta<typeof AgentCommunicationsPanel> = {
  title: 'Agents/AgentCommunicationsPanel',
  component: AgentCommunicationsPanel,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof AgentCommunicationsPanel>;

export const Default: Story = {};
