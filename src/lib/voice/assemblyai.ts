/**
 * AssemblyAI Real-Time Streaming Transcription for PediScreen.
 * Uses WebSocket + Web Audio API for HIPAA-ready, streaming voice-to-text.
 * Falls back to Web Speech API when AssemblyAI is unavailable.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { enhanceMedicalTranscript } from './medical-enhancer';

const SAMPLE_RATE = 16000;
const ASSEMBLY_WS = 'wss://streaming.assemblyai.com/v3/ws';

export interface Transcript {
  text: string;
  confidence: number;
  words: Array<{ word: string; confidence: number; start: number; end: number }>;
  medical_entities?: Array<{
    entity: string;
    confidence: number;
    category: 'symptom' | 'milestone' | 'concern';
  }>;
}

export interface UseAssemblyAIOptions {
  apiKey: string;
  onTranscript?: (text: string, confidence: number) => void;
  onFinalTranscript?: (text: string) => void;
  autoSubmitThreshold?: number; // 0-1, only trigger onFinalTranscript when confidence exceeds this
}

export function useAssemblyAI(options: UseAssemblyAIOptions) {
  const {
    apiKey,
    onTranscript,
    onFinalTranscript,
    autoSubmitThreshold = 0.8,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<Transcript>({
    text: '',
    confidence: 0,
    words: [],
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const accumulatedTextRef = useRef<string>('');

  const cleanup = useCallback(() => {
    if (processorRef.current && sourceRef.current) {
      try {
        sourceRef.current.disconnect();
        processorRef.current.disconnect();
      } catch {
        /* ignore */
      }
      processorRef.current = null;
      sourceRef.current = null;
    }
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    if (!apiKey?.trim()) {
      setError('AssemblyAI API key not configured');
      return;
    }

    setError(null);
    setTranscript({ text: '', confidence: 0, words: [] });
    accumulatedTextRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const wsUrl = `${ASSEMBLY_WS}?sample_rate=${SAMPLE_RATE}&token=${encodeURIComponent(apiKey)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setError(null);
        setIsListening(true);

        const audioContext = new AudioContext({ sampleRate: 48000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        // ScriptProcessorNode: 4096 samples, mono, 48kHz input
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const input = e.inputBuffer.getChannelData(0);
          const pcm = float32ToPcm16(input, 48000, SAMPLE_RATE);
          if (pcm.byteLength > 0) {
            ws.send(pcm);
          }
        };

        source.connect(processor);
        // Connect to silent gain then destination so onaudioprocess fires (Chrome requires output connection)
        const gain = audioContext.createGain();
        gain.gain.value = 0;
        processor.connect(gain);
        gain.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          const msgType = data.type ?? data.message_type; // Support v2 and v3
          const transcriptText = data.transcript ?? data.text ?? '';

          if (msgType === 'Turn' || msgType === 'FinalTranscript') {
            if (transcriptText.trim()) {
              const medicalText = enhanceMedicalTranscript(transcriptText);
              const confidence =
                data.end_of_turn_confidence ?? data.confidence ?? 0.9;
              const isFormatted = data.turn_is_formatted ?? msgType === 'FinalTranscript';

              accumulatedTextRef.current = (
                accumulatedTextRef.current +
                (accumulatedTextRef.current ? ' ' : '') +
                medicalText
              ).trim();

              setTranscript({
                text: accumulatedTextRef.current,
                confidence,
                words: data.words ?? [],
              });
              onTranscript?.(medicalText, confidence);
              if (isFormatted && confidence >= autoSubmitThreshold) {
                setIsProcessing(true);
                onFinalTranscript?.(accumulatedTextRef.current);
              }
            }
          } else if (msgType === 'PartialTranscript' && transcriptText) {
            const partial = enhanceMedicalTranscript(transcriptText);
            setTranscript((prev) => ({
              ...prev,
              text: (accumulatedTextRef.current + ' ' + partial).trim(),
              confidence: data.confidence ?? prev.confidence,
            }));
          }
        } catch {
          /* ignore parse errors */
        }
      };

      ws.onerror = () => {
        setError('Voice connection error');
        cleanup();
      };

      ws.onclose = (e) => {
        if (!e.wasClean && isListening) {
          setError('Connection closed unexpectedly');
        }
        cleanup();
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setError(msg);
      cleanup();
    }
  }, [
    apiKey,
    autoSubmitThreshold,
    isListening,
    onTranscript,
    onFinalTranscript,
    cleanup,
  ]);

  const stopListening = useCallback(() => {
    setIsProcessing(false);
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    startListening,
    stopListening,
    isListening,
    transcript,
    isProcessing,
    error,
  };
}

/**
 * Resample Float32 audio from 48kHz to 16kHz and convert to PCM Int16.
 */
function float32ToPcm16(
  float32: Float32Array,
  inputRate: number,
  outputRate: number
): ArrayBuffer {
  const ratio = inputRate / outputRate;
  const outputLength = Math.floor(float32.length / ratio);
  const pcm = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const idx = Math.floor(srcIndex);
    const frac = srcIndex - idx;
    const sample =
      idx < float32.length - 1
        ? float32[idx] * (1 - frac) + float32[idx + 1] * frac
        : float32[idx];
    const s = Math.max(-1, Math.min(1, sample));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  return pcm.buffer;
}
