import React, { useState, useCallback } from 'react';
import { Volume2, Type, Contrast, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const ACCESSIBILITY_STORAGE_KEY = 'pediscreen-accessibility';

interface AccessibilityState {
  highContrast: boolean;
  fontSize: 'normal' | 'large' | 'xlarge';
}

const defaultState: AccessibilityState = {
  highContrast: false,
  fontSize: 'normal',
};

const getStoredState = (): AccessibilityState => {
  try {
    const stored = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    if (stored) {
      return { ...defaultState, ...JSON.parse(stored) };
    }
  } catch {
    /* ignore */
  }
  return defaultState;
};

const saveState = (state: AccessibilityState) => {
  try {
    localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
};

export const useAccessibility = () => {
  const [state, setState] = useState<AccessibilityState>(getStoredState);

  const applyHighContrast = useCallback((enabled: boolean) => {
    document.documentElement.classList.toggle('high-contrast', enabled);
    setState((prev) => {
      const next = { ...prev, highContrast: enabled };
      saveState(next);
      return next;
    });
  }, []);

  const setFontSize = useCallback((size: AccessibilityState['fontSize']) => {
    document.documentElement.classList.remove('font-size-normal', 'font-size-large', 'font-size-xlarge');
    document.documentElement.classList.add(`font-size-${size}`);
    setState((prev) => {
      const next = { ...prev, fontSize: size };
      saveState(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    document.documentElement.classList.remove('high-contrast', 'font-size-normal', 'font-size-large', 'font-size-xlarge');
    document.documentElement.classList.add('font-size-normal');
    setState(defaultState);
    saveState(defaultState);
  }, []);

  return { state, applyHighContrast, setFontSize, reset };
};

export const initializeAccessibility = () => {
  const stored = getStoredState();
  if (stored.highContrast) {
    document.documentElement.classList.add('high-contrast');
  }
  document.documentElement.classList.remove('font-size-normal', 'font-size-large', 'font-size-xlarge');
  document.documentElement.classList.add(`font-size-${stored.fontSize}`);
};

interface AccessibilityBarProps {
  readAloudTarget?: string;
  readAloudText?: string;
  className?: string;
}

const AccessibilityBar: React.FC<AccessibilityBarProps> = ({
  readAloudTarget,
  readAloudText,
  className,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { state, applyHighContrast, setFontSize, reset } = useAccessibility();

  const handleReadAloud = () => {
    const text =
      readAloudText ??
      (readAloudTarget
        ? document.querySelector(readAloudTarget)?.textContent
        : document.body.innerText) ??
      '';

    if (!text.trim()) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text.slice(0, 5000));
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const cycleFontSize = () => {
    const order: AccessibilityState['fontSize'][] = ['normal', 'large', 'xlarge'];
    const idx = order.indexOf(state.fontSize);
    setFontSize(order[(idx + 1) % order.length]);
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center gap-1 rounded-full bg-muted/80 p-1 backdrop-blur-sm',
          className
        )}
        role="toolbar"
        aria-label="Accessibility options"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 rounded-full text-muted-foreground hover:text-foreground',
                isSpeaking && 'text-primary'
              )}
              onClick={handleReadAloud}
              aria-pressed={isSpeaking}
              aria-label={isSpeaking ? 'Stop reading aloud' : 'Read aloud'}
            >
              <Volume2 className={cn('h-4 w-4', isSpeaking && 'animate-pulse')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Read aloud</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={cycleFontSize}
              aria-label="Adjust text size"
            >
              <Type className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            Text size: {state.fontSize === 'normal' ? 'Normal' : state.fontSize === 'large' ? 'Large' : 'Extra large'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 rounded-full text-muted-foreground hover:text-foreground',
                state.highContrast && 'bg-primary/20 text-primary'
              )}
              onClick={() => applyHighContrast(!state.highContrast)}
              aria-pressed={state.highContrast}
              aria-label="High contrast mode"
            >
              <Contrast className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">High contrast</TooltipContent>
        </Tooltip>

        {(state.highContrast || state.fontSize !== 'normal') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={reset}
                aria-label="Reset accessibility settings"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Reset</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default AccessibilityBar;
