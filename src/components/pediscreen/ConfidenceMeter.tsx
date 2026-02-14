/**
 * Per-domain confidence meter — attractive, mobile-friendly with tooltips.
 */
import React from "react";
import { MODEL_CONFIDENCE_TOOLTIP } from "@/constants/disclaimers";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  domain: string;
  confidence: number; // 0..1
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

export default function ConfidenceMeter({
  domain,
  confidence,
  label,
  size = "md",
  className,
}: Props) {
  const percent = Math.round(confidence * 100);
  const color =
    confidence >= 0.75
      ? "bg-emerald-500"
      : confidence >= 0.45
        ? "bg-yellow-400"
        : "bg-rose-500";
  const barHeight = size === "sm" ? "h-2" : "h-3";

  const meter = (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-medium text-muted-foreground">
          {label ?? domain}
        </div>
        <div className="text-xs text-muted-foreground">{percent}%</div>
      </div>
      <div
        className={cn(
          "w-full bg-muted rounded-md overflow-hidden",
          barHeight
        )}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6 }}
          className={cn(barHeight, color)}
          style={{ borderRadius: 6 }}
          title={`${percent}% confidence`}
        />
      </div>
      <div className="text-xs text-muted-foreground/80 mt-1">
        {MODEL_CONFIDENCE_TOOLTIP.replace('%pct%', `${percent}%`)}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{meter}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{percent}% confidence for {label ?? domain}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
