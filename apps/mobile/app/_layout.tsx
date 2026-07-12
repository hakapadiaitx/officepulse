import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ title: "OfficePulse", headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Sign In", headerBackTitle: "Back" }} />
        <Stack.Screen name="check-out" options={{ title: "Check Out", presentation: "modal" }} />
        <Stack.Screen name="check-in" options={{ title: "Check In", presentation: "modal" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
