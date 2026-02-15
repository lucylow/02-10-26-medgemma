import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0F172A" },
        headerTintColor: "#fff",
      }}
    >
      <Stack.Screen name="clinician" options={{ title: "Clinician Login" }} />
      <Stack.Screen name="parent" options={{ title: "Parent Portal" }} />
    </Stack>
  );
}
