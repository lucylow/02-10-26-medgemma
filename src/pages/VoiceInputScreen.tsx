import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Volume2 } from 'lucide-react';
import { useAgents } from '@/contexts/AgentContext';
import { motion } from 'framer-motion';

const DEMO_WORDS = [
  'My',
  '2-year-old',
  'says',
  'about',
  '10',
  'words',
  "and",
  "doesn't",
  'respond',
  'to',
  'their',
  'name',
];

export default function VoiceInputScreen() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const { startPipeline } = useAgents();
  const navigate = useNavigate();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (transcript.length > 20 && confidence > 0.8 && !isListening) {
      startPipeline(transcript, 24);
      navigate('/pediscreen/agent-pipeline');
    }
  }, [transcript, confidence, isListening, startPipeline, navigate]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startVoice = () => {
    setIsListening(true);
    setTranscript('');
    setConfidence(0);

    let i = 0;
    intervalRef.current = setInterval(() => {
      if (i < DEMO_WORDS.length) {
        setTranscript((prev) => prev + (i === 0 ? '' : ' ') + DEMO_WORDS[i]);
        setConfidence(0.85 + Math.random() * 0.1);
        i++;
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsListening(false);
      }
    }, 300);
  };

  const stopVoice = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsListening(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center space-y-6"
      >
        <h2 className="text-2xl font-bold text-foreground text-center">
          Voice Screening (Demo)
        </h2>
        <p className="text-muted-foreground text-center text-sm">
          This screen simulates the on-device Siri / Google Assistant pipeline without capturing real audio or sending speech to the cloud.
        </p>
        <p className="text-muted-foreground text-center text-xs max-w-sm">
          In production, PediScreen listens through the phone&apos;s virtual assistant with a 15s rolling buffer and on-device feature extraction, then only shares compact scores with the PediScreen agents.
        </p>

        <Button
          size="lg"
          className={`h-24 w-24 rounded-full shadow-lg transition-all ${
            isListening ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
          }`}
          onClick={isListening ? stopVoice : startVoice}
        >
          {isListening ? (
            <StopCircle size={36} className="text-white" />
          ) : (
            <Mic size={36} className="text-white" />
          )}
        </Button>

        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-2"
          >
            <Volume2 size={24} className="text-emerald-500" />
            <p className="text-emerald-600 font-medium">
              Listening... {Math.round(confidence * 100)}% confidence
            </p>
          </motion.div>
        )}

        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md space-y-3"
          >
            <p className="font-semibold text-sm">Live Transcript</p>
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-4">
                <p className="text-foreground leading-relaxed">{transcript}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
