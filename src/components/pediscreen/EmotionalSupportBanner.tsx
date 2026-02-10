import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Heart, Phone, MapPin, ExternalLink, Sparkles, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type SupportTone = 'reassuring' | 'encouraging' | 'action-oriented' | 'informative';

interface EmotionalSupportBannerProps {
  riskLevel: 'on_track' | 'monitor' | 'refer';
  tone?: SupportTone;
  showActions?: boolean;
  className?: string;
}

const toneMessages = {
  on_track: {
    reassuring: {
      title: "Your child is doing great! 🌟",
      message: "The screening shows healthy developmental progress. Every child develops at their own pace, and yours is right on track.",
      subMessage: "Keep doing what you're doing — your engagement matters more than you know."
    },
    encouraging: {
      title: "Wonderful progress!",
      message: "Your observations and care are clearly making a difference. Continue nurturing their growth with play and connection.",
      subMessage: "Small moments of interaction build big developmental wins."
    },
  },
  monitor: {
    reassuring: {
      title: "We're here to support you 💙",
      message: "Some areas may benefit from a little extra attention, but this is quite common. Many children need time and the right activities to flourish.",
      subMessage: "Early awareness is a gift — it means you can help even more effectively."
    },
    encouraging: {
      title: "You're taking the right steps",
      message: "By screening early, you're giving your child the best chance to thrive. The recommendations below are simple activities you can start today.",
      subMessage: "Progress often happens faster than parents expect when given the right support."
    },
  },
  refer: {
    reassuring: {
      title: "You're not alone in this 🤝",
      message: "Early identification is a powerful gift. This screening suggests it's time to connect with specialists who can provide the right support during this critical window of development.",
      subMessage: "We're here to help you navigate next steps and turn these findings into a plan for your child's success."
    },
    'action-oriented': {
      title: "Let's take the next step together",
      message: "We've identified areas where professional expertise can make a real difference. The sooner you connect with specialists, the more support your child receives.",
      subMessage: "We're here to help you navigate what comes next."
    },
  },
};

const supportResources = [
  {
    icon: Phone,
    label: 'Schedule Telehealth',
    description: 'Talk to a specialist from home',
  },
  {
    icon: MapPin,
    label: 'Find Local Services',
    description: 'Early intervention near you',
  },
  {
    icon: Users,
    label: 'Parent Community',
    description: 'Connect with other families',
  },
];

const EmotionalSupportBanner: React.FC<EmotionalSupportBannerProps> = ({
  riskLevel,
  tone = 'reassuring',
  showActions = true,
  className,
}) => {
  const levelKey = riskLevel === 'on_track' ? 'on_track' : riskLevel === 'monitor' ? 'monitor' : 'refer';
  const messages = toneMessages[levelKey];
  const selectedTone = tone in messages ? tone : Object.keys(messages)[0] as SupportTone;
  const content = messages[selectedTone as keyof typeof messages];

  const bgGradients = {
    on_track: 'from-emerald-50 via-teal-50 to-cyan-50 border-emerald-100',
    monitor: 'from-amber-50 via-yellow-50 to-orange-50 border-amber-100',
    refer: 'from-rose-50 via-pink-50 to-purple-50 border-rose-100',
  };

  const iconColors = {
    on_track: 'text-emerald-500',
    monitor: 'text-amber-500',
    refer: 'text-rose-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn(
        'border-2 overflow-hidden shadow-lg',
        `bg-gradient-to-br ${bgGradients[levelKey]}`,
        className
      )}>
        <CardContent className="pt-6 pb-6 space-y-4">
          {/* Main Message */}
          <div className="flex items-start gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
                levelKey === 'on_track' && 'bg-emerald-100',
                levelKey === 'monitor' && 'bg-amber-100',
                levelKey === 'refer' && 'bg-rose-100'
              )}
            >
              <Heart className={cn('w-6 h-6', iconColors[levelKey])} />
            </motion.div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {content.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {content.message}
              </p>
              <p className="text-sm text-foreground/80 italic">
                {content.subMessage}
              </p>
            </div>
          </div>

          {/* Support Actions - Only for monitor/refer */}
          {showActions && levelKey !== 'on_track' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4"
            >
              {supportResources.map((resource, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className={cn(
                    'h-auto flex-col items-start p-4 gap-2 bg-background/60 backdrop-blur-sm hover:bg-background',
                    'border-2 hover:border-primary/30 transition-all'
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <resource.icon className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">{resource.label}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
                  </div>
                  <p className="text-xs text-muted-foreground text-left w-full">
                    {resource.description}
                  </p>
                </Button>
              ))}
            </motion.div>
          )}

          {/* Privacy & Trust Footer */}
          <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Your data stays private</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-assisted, human-reviewed</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default EmotionalSupportBanner;
