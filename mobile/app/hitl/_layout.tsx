import { Stack } from "expo-router";

export default function HitlLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0F172A" },
        headerTintColor: "#fff",
      }}
    >
      <Stack.Screen
        name="[caseId]/index"
        options={{ title: "HITL Review", headerShown: true }}
      />
    </Stack>
  );
}
