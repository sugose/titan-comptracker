import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Competitions" }} />
        <Stack.Screen name="competition/[id]" options={{ title: "Match Schedule" }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
