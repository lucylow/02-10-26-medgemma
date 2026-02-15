import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { router } from "expo-router";
import type { MedGemmaOutput } from "@/types/hitl";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useHitlNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    Notifications.requestPermissionsAsync();

    notificationListener.current =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          const caseId = response.notification.request.content.data?.caseId as
            | string
            | undefined;
          if (caseId) {
            router.push(`/hitl/${caseId}` as const);
          }
        }
      );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
    };
  }, []);

  return {
    notifyClinician: async (caseId: string, output: MedGemmaOutput) => {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `HITL Required: ${caseId.slice(-6)}`,
          body: `${output.risk.toUpperCase()} risk • ${Math.round(output.confidence * 100)}% confidence`,
          data: { caseId, action: "review" },
          sound: true,
          ...(Platform.OS === "ios" && { categoryIdentifier: "HITL_REVIEW" }),
        },
        trigger: { seconds: 1 },
      });
    },
  };
}
