/**
 * Collaborative editor wrapper — shared draft editing, chat, presence.
 * Wire onLocalSave to POST /api/reports/{id}/patch for persistence.
 */
import React, { useEffect, useState, useCallback } from "react";
import { useCollab } from "@/hooks/useCollab";
import ConfidenceMeter from "@/components/pediscreen/ConfidenceMeter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, Unlock, Save, RotateCcw, Send, Users } from "lucide-react";

type Props = {
  reportId: string;
  user: { userId: string; name: string; role?: string };
  initialDraft: Record<string, unknown>;
  onLocalSave?: (draft: Record<string, unknown>) => void;
};

type DraftWithMeta = Record<string, unknown> & {
  _lastUpdate?: Record<string, number>;
};

export default function CollabEditor({
  reportId,
  user,
  initialDraft,
  onLocalSave,
}: Props) {
  const collab = useCollab(reportId, user);
  const [draft, setDraft] = useState<DraftWithMeta>(
    (initialDraft || {}) as DraftWithMeta
  );
  const [chatInput, setChatInput] = useState("");

  // Subscribe to incoming draft updates for this report
  useEffect(() => {
    function onUpdate(e: CustomEvent<{ reportId: string; field: string; value: unknown; ts: number }>) {
      const upd = e.detail;
      if (upd.reportId !== reportId) return;
      setDraft((d) => {
        const localTs = d._lastUpdate?.[upd.field] ?? 0;
        if (upd.ts >= localTs) {
          const copy = { ...d, [upd.field]: upd.value };
          copy._lastUpdate = { ...(copy._lastUpdate ?? {}), [upd.field]: upd.ts };
          return copy;
        }
        return d;
      });
    }
    const handler = onUpdate as EventListener;
    window.addEventListener(
      `collab:draft_update:${reportId}`,
      handler
    );
    return () =>
      window.removeEventListener(
        `collab:draft_update:${reportId}`,
        handler
      );
  }, [reportId]);

  // Push local edits to collab hook and optionally local save
  const pushUpdate = useCallback(
    (field: string, value: unknown) => {
      const ts = Date.now();
      collab.sendDraftUpdate(field, value);
      setDraft((d) => {
        const next = { ...d, [field]: value };
        next._lastUpdate = { ...(next._lastUpdate ?? {}), [field]: ts };
        return next;
      });
      const nextDraft = { ...draft, [field]: value };
      delete (nextDraft as DraftWithMeta)._lastUpdate;
      onLocalSave?.(nextDraft);
    },
    [collab, draft, onLocalSave]
  );

  const sendChat = () => {
    if (!chatInput.trim()) return;
    collab.sendChatMessage(chatInput.trim());
    setChatInput("");
  };

  const presenceList = Object.values(collab.participants);
  const domainsFromRisk =
    draft?.riskAssessment && typeof draft.riskAssessment === "object"
      ? (draft.riskAssessment as { domains?: Record<string, { confidence?: number }> }).domains
      : null;
  const domainsArray = draft?.domains as Array<{ domain?: string; confidence?: number }> | undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">Draft — Collaborative Editor</h3>
            <p className="text-xs text-muted-foreground">
              Participants: {presenceList.map((p) => p.name).join(", ") || "You only"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                collab.connected
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {collab.connected ? "Connected" : "Disconnected"}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => collab.requestLock("clinical_summary")}
            >
              <Lock className="w-3 h-3" />
              Lock
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => collab.releaseLock("clinical_summary")}
            >
              <Unlock className="w-3 h-3" />
              Unlock
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Clinical summary (editable)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Changes sync in real-time with collaborators.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={(draft.clinical_summary as string) ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, clinical_summary: e.target.value }))
              }
              onBlur={() =>
                pushUpdate("clinical_summary", draft.clinical_summary)
              }
              className="min-h-[120px]"
              placeholder="Clinical summary..."
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  pushUpdate("clinical_summary", draft.clinical_summary)
                }
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDraft(initialDraft as DraftWithMeta)}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Revert to server
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Technical details</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={(draft.technical_summary as string) ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, technical_summary: e.target.value }))
              }
              onBlur={() =>
                pushUpdate("technical_summary", draft.technical_summary)
              }
              className="min-h-[100px]"
              placeholder="Technical summary..."
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Confidence per domain</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {domainsFromRisk &&
                Object.entries(domainsFromRisk).map(([k, v]) => (
                  <div key={k}>
                    <ConfidenceMeter
                      domain={k}
                      confidence={
                        typeof v === "object" && v && "confidence" in v
                          ? Math.max(0.1, (v.confidence ?? 0.6))
                          : 0.6
                      }
                      size="sm"
                    />
                  </div>
                ))}
              {(!domainsFromRisk || Object.keys(domainsFromRisk).length === 0) &&
                domainsArray?.map((d, i) => (
                  <div key={i}>
                    <ConfidenceMeter
                      domain={(d.domain as string) ?? `Domain ${i + 1}`}
                      confidence={Math.max(0.1, d.confidence ?? 0.6)}
                      size="sm"
                    />
                  </div>
                ))}
              {(!domainsFromRisk || Object.keys(domainsFromRisk).length === 0) &&
                (!domainsArray || domainsArray.length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    No domain confidence data yet.
                  </p>
                )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="w-4 h-4" />
              Chat with collaborators
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 max-h-[220px] -mx-4 px-4">
              <div className="space-y-2">
                {collab.chat.map((m, i) => (
                  <div key={i} className="text-sm">
                    <div className="text-xs text-muted-foreground">
                      {m.from.name} •{" "}
                      {new Date(m.ts).toLocaleTimeString()}
                    </div>
                    <div>{m.message}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2 mt-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message the team..."
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
              />
              <Button size="sm" onClick={sendChat}>
                Send
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Presence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {Object.values(collab.participants).map((p) => (
                <li key={p.userId} className="text-sm">
                  {p.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({p.role ?? "participant"})
                  </span>
                </li>
              ))}
              {Object.values(collab.participants).length === 0 && (
                <li className="text-sm text-muted-foreground">
                  No one else here
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
