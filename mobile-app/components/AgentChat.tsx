/**
 * Agent chat UI - streaming messages, typing indicator, medical-grade design.
 */

import React, { useState, useRef, useCallback } from 'react';
import { FlatList, Platform } from 'react-native';
import { YStack, XStack, Text, Input, Button, Badge } from 'tamagui';
import { Brain, Send } from 'lucide-react-native';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import type { Message } from './MessageBubble';

export interface AgentResponse {
  risk?: string;
  confidence?: number;
  summary?: string[];
  rationale?: string;
  recommendations?: string[];
}

export interface AgentChatProps {
  agentType?: string;
  onSendMessage?: (message: string) => Promise<AgentResponse | null | void>;
}

export function AgentChat({
  agentType = 'medgemma',
  onSendMessage,
}: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    scrollToBottom();

    setIsTyping(true);

    try {
      if (onSendMessage) {
        const result = await onSendMessage(text);
        if (result) {
          const content =
            result.rationale ||
            (result.summary?.length ? result.summary.join('\n• ') : '') ||
            'Analysis complete.';
          const recs = result.recommendations?.length
            ? '\n\nRecommendations:\n• ' + result.recommendations.join('\n• ')
            : '';
          setMessages((prev) => [
            ...prev,
            {
              id: `agent_${Date.now()}`,
              role: 'agent',
              content: content + recs,
              timestamp: new Date().toISOString(),
              confidence: result.confidence ?? 0.9,
              risk: (result.risk as 'low' | 'monitor' | 'elevated' | 'discuss') ?? 'low',
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `agent_${Date.now()}`,
              role: 'system',
              content: 'Analysis complete. View full results in Pipeline.',
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `agent_${Date.now()}`,
            role: 'agent',
            content: 'AI analysis would run here. Connect onSendMessage to your pipeline.',
            timestamp: new Date().toISOString(),
            confidence: 0.92,
            risk: 'low',
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'system',
          content: 'AI analysis unavailable. Using clinical rules.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: Message }) => <MessageBubble message={item} />,
    []
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <YStack flex={1} bg="#F8FAFC">
      {/* Header */}
      <XStack
        bg="white"
        px="$6"
        py="$4"
        ai="center"
        jc="space-between"
        borderBottomWidth={1}
        borderColor="#F1F5F9"
      >
        <XStack ai="center" space="$3">
          <YStack
            w={44}
            h={44}
            br={22}
            bg="#3B82F6"
            ai="center"
            jc="center"
          >
            <Brain size={22} color="white" />
          </YStack>
          <YStack>
            <Text fontSize="$6" fontWeight="800" color="#1E293B">
              MedGemma {agentType}
            </Text>
            <Text fontSize="$3" color="#64748B">
              Pediatric screening assistant
            </Text>
          </YStack>
        </XStack>

        <Badge size="$3" bg="#D1FAE5" color="#065F46">
          Live
        </Badge>
      </XStack>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          isTyping ? <TypingIndicator agentType={agentType} /> : null
        }
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        removeClippedSubviews={false}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      {/* Input */}
      <XStack
        bg="white"
        px="$4"
        py="$3"
        ai="center"
        space="$3"
        borderTopWidth={1}
        borderColor="#F1F5F9"
        style={
          Platform.OS === 'web'
            ? { position: 'absolute' as const, bottom: 0, left: 0, right: 0 }
            : undefined
        }
      >
        <Input
          flex={1}
          bg="#F8FAFC"
          borderColor="#E2E8F0"
          br="$6"
          px="$4"
          py="$3"
          fontSize="$4"
          placeholder="Describe observations (e.g. '24mo says 10 words, poor eye contact')"
          placeholderTextColor="#94A3B8"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
          editable={!isStreaming}
        />

        <Button
          size="$5"
          circular
          bg="#3B82F6"
          color="white"
          onPress={sendMessage}
          disabled={isStreaming || !inputText.trim()}
          opacity={isStreaming || !inputText.trim() ? 0.5 : 1}
          icon={<Send size={20} color="white" />}
        />
      </XStack>
    </YStack>
  );
}
