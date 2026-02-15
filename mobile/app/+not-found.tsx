import { Link, Stack } from "expo-router";
import { YStack, Text, Button } from "tamagui";

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
        <Text fontSize="$8" fontWeight="800" color="#1E293B">
          404
        </Text>
        <Text fontSize="$4" color="$gray11" marginTop="$2">
          Page not found
        </Text>
        <Link href="/" asChild>
          <Button marginTop="$6" backgroundColor="#3B82F6" color="white">
            Go Home
          </Button>
        </Link>
      </YStack>
    </>
  );
}
