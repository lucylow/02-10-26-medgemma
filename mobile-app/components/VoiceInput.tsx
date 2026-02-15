/**
 * Voice input component for PediScreen - React Native.
 * Simulates real-time speech recognition for demo; integrate AssemblyAI for production.
 */

import React, { useState, useRef } from 'react';
import { YStack, XStack, Button, Text, Card } from 'tamagui';
import { Mic, StopCircle, Volume2 } from 'lucide-react-native';

export interface VoiceInputProps {
  onTranscript?: (text: string) => void;
  disabled?: boolean;
}

const DEMO_PHRASES = [
  '24 month old says about 10 words',
  'not making eye contact when name called',
  'stacks 2 blocks but not more',
];

export function VoiceInput({ onTranscript, disabled = false }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startListening = () => {
    if (disabled) return;
    setIsListening(true);
    setTranscript('');
    setConfidence(0);

    let index = 0;
    intervalRef.current = setInterval(() => {
      if (index < DEMO_PHRASES.length) {
        const nextTranscript = DEMO_PHRASES.slice(0, index + 1).join(' ');
        setTranscript(nextTranscript);
        setConfidence(0.85 + Math.random() * 0.1);
        index++;
      }
      if (index >= DEMO_PHRASES.length) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsListening(false);
        const fullText = DEMO_PHRASES.join(' ');
        onTranscript?.(fullText);
      }
    }, 1200);
  };

  const stopListening = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsListening(false);
    if (transcript.trim()) {
      onTranscript?.(transcript);
    }
  };

  return (
    <YStack space="$4">
      <XStack ai="center" jc="center">
        <Button
          size="$7"
          circular
          bg={isListening ? '#EF4444' : '#10B981'}
          color="white"
          onPress={isListening ? stopListening : startListening}
          disabled={disabled}
          icon={
            isListening ? (
              <StopCircle size={28} color="white" />
            ) : (
              <Mic size={28} color="white" />
            )
          }
        />
      </XStack>

      {transcript ? (
        <Card bg="#F0FDF4" p="$4" br="$4" borderWidth={1} borderColor="#BBF7D0">
          <XStack ai="center" space="$2" mb="$2">
            <Volume2 size={16} color="#16A34A" />
            <Text fontSize="$4" color="#15803D">
              {Math.round(confidence * 100)}% confidence
            </Text>
          </XStack>
          <Text fontSize="$5" color="#166534">
            {transcript}
          </Text>
        </Card>
      ) : null}
    </YStack>
  );
}
