/**
 * Agent Chat screen - streaming MedGemma conversation UI.
 */

import React from 'react';
import { AgentChat } from '@/components/AgentChat';
import { useAI } from '@/contexts/AIAgentProvider';

export default function ChatScreen() {
  const { startPipelineForChat } = useAI();

  const handleSendMessage = async (message: string) => {
    return startPipelineForChat({
      age: 24,
      observations: message,
    });
  };

  return (
    <AgentChat
      agentType="medgemma"
      onSendMessage={handleSendMessage}
    />
  );
}
