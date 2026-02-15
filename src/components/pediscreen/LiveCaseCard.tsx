/**
 * LiveCaseCard — HITL case card with WebSocket updates and smooth interactions
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { RiskChip } from "@/components/medgemma/RiskChip/RiskChip";
import type { RiskLevel } from "@/components/medgemma/RiskChip/RiskChip";
import { useRealtimeHitl } from "@/hooks/useRealtimeHitl";
import { cn } from "@/lib/utils";

export interface LiveCaseData {
  caseId: string;
  screening_id?: string;
  risk?: string;
  confidence?: number;
  observations?: string | null;
  createdAt?: string;
  report?: { riskLevel?: string; summary?: string };
}

export interface LiveCaseCardProps {
  caseData: LiveCaseData;
  isLive?: boolean;
  position: number;
  clinicId?: string;
  userRole?: string;
}

export function LiveCaseCard({
  caseData,
  isLive = true,
  position,
  clinicId = "default",
  userRole = "clinician",
}: LiveCaseCardProps) {
  const navigate = useNavigate();
  const { sendMessage } = useRealtimeHitl(userRole, clinicId);

  const caseId = caseData.caseId || caseData.screening_id || "";
  const risk = (caseData.risk || caseData.report?.riskLevel || "unknown") as RiskLevel;
  const observations = caseData.observations || caseData.report?.summary || "";
  const createdAt = caseData.createdAt || "";

  const handlePress = () => {
    sendMessage({
      type: "case_selected",
      caseId,
      clinicianId: "current_user",
    });
    navigate(`/pediscreen/case/${caseId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md border-slate-200"
        onClick={handlePress}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-slate-800">
              Case #{caseId.slice(-6)}
            </span>
            <div className="flex items-center gap-2">
              {isLive && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  LIVE
                </Badge>
              )}
              <span className="text-sm text-slate-500">#{position}</span>
            </div>
          </div>

          <div className="mb-2">
            <RiskChip risk={risk} />
          </div>

          <p
            className="text-sm text-slate-600 line-clamp-2 mb-3"
            title={observations}
          >
            {observations}
          </p>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            {createdAt && (
              <span>{new Date(createdAt).toLocaleTimeString()}</span>
            )}
            {isLive && <Activity className="w-3 h-3 text-emerald-500" />}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
