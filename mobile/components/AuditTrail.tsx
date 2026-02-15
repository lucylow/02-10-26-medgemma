import React from "react";
import { YStack, Text, Card } from "tamagui";
import type { AuditEvent } from "@/types/hitl";
import { CheckCircle, XCircle, Edit3, ShieldAlert, FileText } from "lucide-react-native";

interface AuditTrailProps {
  events: AuditEvent[];
}

function getEventColor(action: AuditEvent["action"]) {
  switch (action) {
    case "approve":
      return "#10B981";
    case "reject":
      return "#EF4444";
    case "edit":
      return "#3B82F6";
    case "escalate":
      return "#F59E0B";
    case "entered_hitl":
      return "#6366F1";
    default:
      return "#64748B";
  }
}

function getEventIcon(action: AuditEvent["action"]) {
  switch (action) {
    case "approve":
      return <CheckCircle size={14} color={getEventColor(action)} />;
    case "reject":
      return <XCircle size={14} color={getEventColor(action)} />;
    case "edit":
      return <Edit3 size={14} color={getEventColor(action)} />;
    case "escalate":
      return <ShieldAlert size={14} color={getEventColor(action)} />;
    default:
      return <FileText size={14} color={getEventColor(action)} />;
  }
}

function AuditEventRow({ event }: { event: AuditEvent }) {
  const color = getEventColor(event.action);
  const time = new Date(event.timestamp).toLocaleTimeString();

  return (
    <YStack
      padding="$2"
      backgroundColor="$background"
      borderRadius="$2"
      borderLeftWidth={3}
      borderLeftColor={color}
    >
      <YStack flexDirection="row" alignItems="center" gap="$2">
        {getEventIcon(event.action)}
        <Text fontSize="$2" fontWeight="600" textTransform="capitalize">
          {event.action.replace("_", " ")}
        </Text>
        <Text fontSize="$1" color="$gray10">
          {time}
        </Text>
      </YStack>
      {event.clinicianNotes && (
        <Text fontSize="$2" color="$gray11" marginTop="$1">
          {event.clinicianNotes}
        </Text>
      )}
      {event.confidence != null && (
        <Text fontSize="$1" color="$gray10" marginTop="$1">
          Confidence: {Math.round(event.confidence * 100)}%
        </Text>
      )}
    </YStack>
  );
}

export function AuditTrail({ events }: AuditTrailProps) {
  return (
    <Card backgroundColor="#F8FAFC" padding="$5" borderRadius="$3">
      <Text fontSize="$6" fontWeight="600" marginBottom="$4">
        Audit Trail
      </Text>
      <YStack space="$2">
        {events.length === 0 ? (
          <Text fontSize="$3" color="$gray10">
            No events yet
          </Text>
        ) : (
          events.map((event, i) => (
            <AuditEventRow key={`${event.timestamp}-${i}`} event={event} />
          ))
        )}
      </YStack>
    </Card>
  );
}
