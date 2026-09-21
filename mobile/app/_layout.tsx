import { useEffect } from "react";
import { I18nManager } from "react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
} from "@expo-google-fonts/heebo";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/src/auth";
import { LockOverlay } from "@/src/LockOverlay";
import { EventProvider } from "@/src/event";
import { ImportDraftProvider } from "@/src/importDraft";
import { colors } from "@/src/theme";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_600SemiBold,
    Heebo_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <EventProvider>
        <ImportDraftProvider>
          <StatusBar style="dark" />
          <LockOverlay />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.card },
              headerTintColor: colors.brownText,
              headerTitleStyle: { fontFamily: "Heebo_700Bold" },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.cream },
              headerBackTitle: "חזרה",
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="forgot-password" options={{ title: "שחזור סיסמה" }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        </ImportDraftProvider>
      </EventProvider>
    </AuthProvider>
  );
}
