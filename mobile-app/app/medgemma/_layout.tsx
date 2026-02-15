import { Stack } from 'expo-router';

export default function MedGemmaLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#1E3A8A' },
        headerTintColor: '#fff',
      }}
    />
  );
}
