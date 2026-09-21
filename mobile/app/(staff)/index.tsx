import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { api } from "@/src/api";
import { isUsherStaff } from "@/src/roles";
import { useAuth } from "@/src/auth";
import { StatsGrid } from "@/src/records";
import { Card, ErrorText, Page } from "@/src/ui";
import { colors } from "@/src/theme";
import { messageFromApi } from "@/src/format";

export default function StaffDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const hideLeads = isUsherStaff(user);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await api<Record<string, unknown>>("/api/staff/dashboard");
    if (!result.ok) setError(messageFromApi(result.data, "אין הרשאת עובד"));
    else setData(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = (data?.stats as Record<string, unknown>) || data || {};

  return (
    <Page refreshing={loading} onRefresh={() => void load()}>
      <Text style={styles.h1}>דשבורד עובדים</Text>
      <ErrorText text={error} />
      <StatsGrid
        items={[
          { title: "משתמשים", value: String(stats.totalUsers ?? "—") },
          { title: "אירועים שלי", value: String(stats.myEvents ?? stats.totalEvents ?? "—") },
        ]}
      />
      <Pressable onPress={() => router.push("/(staff)/sales")}>
        <Card><Text style={styles.action}>המכירות שלי</Text></Card>
      </Pressable>
      {!hideLeads ? (
        <>
          <Pressable onPress={() => router.push("/(staff)/leads")}>
            <Card><Text style={styles.action}>הלידים שלי</Text></Card>
          </Pressable>
          <Pressable onPress={() => router.push("/(staff)/work-orders")}>
            <Card><Text style={styles.action}>הוראות עבודה</Text></Card>
          </Pressable>
        </>
      ) : null}
      <Pressable onPress={() => router.push("/(staff)/file")}>
        <Card><Text style={styles.action}>תיק עובד שלי</Text></Card>
      </Pressable>
      <Pressable onPress={() => router.push("/(staff)/shifts")}>
        <Card><Text style={styles.action}>השיבוצים שלי</Text></Card>
      </Pressable>
    </Page>
  );
}

const styles = StyleSheet.create({
  h1: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 28, color: colors.brownText, marginBottom: 12 },
  action: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText, fontSize: 16 },
});
