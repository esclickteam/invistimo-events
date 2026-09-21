import { Stack } from "expo-router";
import { colors } from "@/src/theme";

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.brownText,
        headerTitleStyle: { fontFamily: "Heebo_700Bold" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="index" options={{ title: "עוד" }} />
      <Stack.Screen name="security" options={{ title: "אבטחה" }} />
      <Stack.Screen name="event" options={{ title: "פרטי האירוע" }} />
      <Stack.Screen name="invitation" options={{ title: "הזמנה" }} />
      <Stack.Screen name="messages" options={{ title: "שליחת הודעות" }} />
      <Stack.Screen name="guest-messages" options={{ title: "הודעות מהאורחים" }} />
      <Stack.Screen name="transport" options={{ title: "ניהול הסעות" }} />
      <Stack.Screen name="challenges" options={{ title: "Wedding Challenges" }} />
      <Stack.Screen name="website" options={{ title: "אתר חתונה" }} />
      <Stack.Screen name="reports" options={{ title: "דוחות" }} />
    </Stack>
  );
}
