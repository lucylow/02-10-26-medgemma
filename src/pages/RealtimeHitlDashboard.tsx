/**
 * RealtimeHitlDashboard — Real-time HITL clinician dashboard
 * Live WebSocket updates, case queue, and streaming notifications
 */
import React, { useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, Activity, Eye, Loader2 } from "lucide-react";
import { LiveStatusBar } from "@/components/pediscreen/LiveStatusBar";
import { LiveCaseCard } from "@/components/pediscreen/LiveCaseCard";
import { useRealtimeHitl } from "@/hooks/useRealtimeHitl";
import { usePendingHitlCases } from "@/hooks/usePendingHitlCases";
import { toast } from "sonner";

const DEFAULT_CLINIC_ID = "default";

export default function RealtimeHitlDashboard() {
  const userRole = "clinician";
  const clinicId = DEFAULT_CLINIC_ID;

  const realtime = useRealtimeHitl(userRole, clinicId, {
    onNotification: useCallback((caseId, message) => {
      toast.info(message, { description: `Case ${caseId.slice(-6)}` });
    }, []),
  });

  const {
    cases,
    highPriority,
    mediumPriority,
    lowPriority,
    refetch,
    isFetching,
    isLoading,
  } = usePendingHitlCases({
    limit: 50,
    refetchInterval: realtime.isConnected ? 30000 : 60000,
  });

  const handleRefresh = async () => {
    await refetch();
    if (realtime.isConnected) realtime.reconnect();
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Live status bar */}
      <LiveStatusBar
        isConnected={realtime.isConnected}
        pendingCases={realtime.pendingCases || cases.length}
        queuePosition={realtime.queuePosition}
        activeClinicians={realtime.activeClinicians}
        heartbeat={realtime.heartbeat}
      />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
          {/* Queue priority cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Discuss
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-900">{highPriority}</p>
                <p className="text-xs text-amber-700">High priority</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Elevated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-900">{mediumPriority}</p>
                <p className="text-xs text-orange-700">Medium priority</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-800">{lowPriority}</p>
                <p className="text-xs text-slate-600">Low priority</p>
              </CardContent>
            </Card>
          </div>

          {/* Live case list */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Live Case Queue</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : cases.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-slate-500">
                No cases pending HITL review.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {cases.map((c, i) => (
                <LiveCaseCard
                  key={c.caseId}
                  caseData={{
                    caseId: c.caseId,
                    screening_id: c.screening_id,
                    risk: c.risk,
                    confidence: c.confidence,
                    observations: c.observations,
                    createdAt: c.createdAt,
                    report: c.report,
                  }}
                  isLive={realtime.isConnected}
                  position={i + 1}
                  clinicId={clinicId}
                  userRole={userRole}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
