import { Stack } from "expo-router";
import { colors } from "@/src/theme";

export default function GuestsLayout() {
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
      <Stack.Screen name="index" options={{ title: "רשימת מוזמנים" }} />
      <Stack.Screen name="add" options={{ title: "הוספת מוזמן" }} />
      <Stack.Screen name="contacts" options={{ title: "ייבוא מאנשי קשר" }} />
      <Stack.Screen name="preview" options={{ title: "אישור ייבוא" }} />
      <Stack.Screen name="excel" options={{ title: "ייבוא מאקסל" }} />
      <Stack.Screen name="[id]" options={{ title: "מוזמן" }} />
    </Stack>
  );
}
