import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "@/src/auth";
import { colors } from "@/src/theme";

export default function AppTabs() {
  const { ready, user } = useAuth();
  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.brownText,
        headerTitleStyle: { fontFamily: "Heebo_700Bold" },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.soft,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontFamily: "Heebo_600SemiBold", fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "דשבורד" }} />
      <Tabs.Screen name="guests" options={{ title: "מוזמנים", headerShown: false }} />
      <Tabs.Screen name="seating" options={{ title: "הושבה" }} />
      <Tabs.Screen name="check-in" options={{ title: "כניסה" }} />
      <Tabs.Screen name="more" options={{ title: "עוד", headerShown: false }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
});
