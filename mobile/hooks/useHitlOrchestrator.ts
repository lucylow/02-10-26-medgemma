import { useReducer, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  type MedGemmaOutput,
  type HitlDecision,
  type HitlStatus,
  type AuditEvent,
  type HitlState,
} from "@/types/hitl";
import { logAuditEvent, finalizeCase } from "@/lib/api";

const HITL_STORAGE_KEY = "pediscreen_hitl_state";

function initialHitlState(caseId: string): HitlState {
  return {
    caseId,
    agentOutput: {
      summary: "",
      risk: "monitor",
      recommendations: [],
      confidence: 0,
    },
    clinicianNotes: [],
    decision: null,
    confidenceThreshold: 0.85,
    status: "draft",
    auditTrail: [],
    feedbackScore: null,
  };
}

type HitlAction =
  | { type: "ENTER_HITL"; output: MedGemmaOutput }
  | {
      type: "SET_DECISION";
      decision: HitlDecision;
      notes?: string;
      finalOutput: MedGemmaOutput;
    }
  | { type: "UPDATE_COLLABORATION"; update: Partial<HitlState> }
  | { type: "SET_FEEDBACK"; score: number }
  | { type: "LOAD_STATE"; state: HitlState };

function applyClinicianEdits(
  output: MedGemmaOutput,
  notes: string
): MedGemmaOutput {
  return {
    ...output,
    summary: notes.trim() || output.summary,
    recommendations: notes
      ? notes.split("\n").filter(Boolean)
      : output.recommendations,
  };
}

function hitlReducer(state: HitlState, action: HitlAction): HitlState {
  switch (action.type) {
    case "ENTER_HITL":
      return {
        ...state,
        agentOutput: action.output,
        status: "pending_review",
        auditTrail: [
          ...state.auditTrail,
          {
            action: "entered_hitl",
            confidence: action.output.confidence,
            timestamp: new Date().toISOString(),
            caseId: state.caseId,
          },
        ],
      };

    case "SET_DECISION":
      return {
        ...state,
        decision: action.decision,
        clinicianNotes: action.notes
          ? [...state.clinicianNotes, action.notes]
          : state.clinicianNotes,
        status:
          action.decision === "approve"
            ? "approved"
            : action.decision === "reject"
              ? "rejected"
              : "edited",
        auditTrail: [
          ...state.auditTrail,
          {
            action: action.decision,
            clinicianNotes: action.notes,
            confidence: state.agentOutput.confidence,
            timestamp: new Date().toISOString(),
            caseId: state.caseId,
          },
        ],
      };

    case "UPDATE_COLLABORATION":
      return { ...state, ...action.update };

    case "SET_FEEDBACK":
      return { ...state, feedbackScore: action.score };

    case "LOAD_STATE":
      return action.state;

    default:
      return state;
  }
}

export function useHitlOrchestrator(
  caseId: string,
  options?: { authToken?: string; apiKey?: string }
) {
  const [state, dispatch] = useReducer(
    hitlReducer,
    initialHitlState(caseId)
  );

  useEffect(() => {
    if (!caseId) return;
    AsyncStorage.getItem(`${HITL_STORAGE_KEY}_${caseId}`)
      .then((raw) => {
        if (raw) {
          try {
            const loaded = JSON.parse(raw) as HitlState;
            if (loaded.caseId === caseId) {
              dispatch({ type: "LOAD_STATE", state: loaded });
            }
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {});
  }, [caseId]);

  const checkHitlRequired = useCallback(
    async (output: MedGemmaOutput): Promise<boolean> => {
      const needsReview =
        output.confidence < 0.85 ||
        output.risk === "discuss" ||
        output.risk === "elevated" ||
        output.risk === "refer";

      if (needsReview) {
        dispatch({ type: "ENTER_HITL", output });
        try {
          const toSave: HitlState = {
            caseId,
            agentOutput: output,
            clinicianNotes: [],
            decision: null,
            confidenceThreshold: 0.85,
            status: "pending_review",
            auditTrail: [
              {
                action: "entered_hitl",
                confidence: output.confidence,
                timestamp: new Date().toISOString(),
                caseId,
              },
            ],
            feedbackScore: null,
          };
          await AsyncStorage.setItem(
            `${HITL_STORAGE_KEY}_${caseId}`,
            JSON.stringify(toSave)
          );
        } catch {
          // ignore storage errors
        }
      }

      return needsReview;
    },
    [caseId]
  );

  const makeDecision = useCallback(
    async (decision: HitlDecision, notes?: string) => {
      const finalOutput =
        decision === "approve"
          ? state.agentOutput
          : applyClinicianEdits(state.agentOutput, notes || "");

      dispatch({
        type: "SET_DECISION",
        decision,
        notes,
        finalOutput,
      });

      try {
        await logAuditEvent(
          {
            caseId,
            action: decision,
            clinicianNotes: notes,
            confidence: state.agentOutput.confidence,
          },
          options?.authToken,
          options?.apiKey
        );

        await finalizeCase(
          { caseId, decision, finalOutput },
          options?.authToken,
          options?.apiKey
        );
      } catch (err) {
        console.warn("Audit/finalize failed:", err);
      }

      try {
        await AsyncStorage.removeItem(`${HITL_STORAGE_KEY}_${caseId}`);
      } catch {
        // ignore
      }
    },
    [state.agentOutput, caseId, options?.authToken, options?.apiKey]
  );

  const subscribeToUpdates = useCallback(() => {
    // WebSocket for live clinician collaboration
    const base = process.env.EXPO_PUBLIC_WS_URL || "ws://api.pediscreen.ai";
    const wsUrl = `${base}/hitl/${caseId}`;
    try {
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data as string);
          dispatch({ type: "UPDATE_COLLABORATION", update });
        } catch {
          // ignore parse errors
        }
      };
      return () => ws.close();
    } catch {
      return () => {};
    }
  }, [caseId]);

  const setFeedback = useCallback((score: number) => {
    dispatch({ type: "SET_FEEDBACK", score });
  }, []);

  return {
    state,
    checkHitlRequired,
    makeDecision,
    subscribeToUpdates,
    setFeedback,
    isPendingReview: state.status === "pending_review",
    clinicianFeedback: state.feedbackScore,
  };
}
