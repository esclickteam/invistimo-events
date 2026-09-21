import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/auth";
import { useEventData } from "@/src/event";
import { formatEventDate, formatLocation, rsvpLabel } from "@/src/format";
import { Card, Page, ScreenTitle } from "@/src/ui";
import { colors } from "@/src/theme";

export default function DashboardScreen() {
  const { user } = useAuth();
  const { loading, invitation, event, guests, usage, refresh } = useEventData();
  const title = String(invitation?.title || event?.title || "האירוע שלי");
  const date = formatEventDate(invitation?.eventDate || event?.date);
  const time = String(invitation?.eventTime || event?.time || "");
  const place = formatLocation(invitation?.location || event?.location);
  const counts = guests.reduce(
    (acc, guest) => {
      const key = String(guest.rsvp || "pending");
      acc[key] = (acc[key] || 0) + 1;
      if (key === "yes") acc.arriving += Number(guest.guestsCount || 1);
      return acc;
    },
    { yes: 0, no: 0, maybe: 0, pending: 0, arriving: 0 } as Record<string, number>
  );

  return (
    <Page refreshing={loading} onRefresh={() => void refresh()}>
      <ScreenTitle title={title} subtitle={[date, time].filter(Boolean).join(" · ") || "דשבורד האירוע"} />
      <Card>
        <Text style={styles.hello}>שלום {user?.name || ""}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        {place ? <Text style={styles.meta}>{place}</Text> : null}
        {usage?.limit ? (
          <Text style={styles.meta}>
            רשומות מוזמנים: {usage.current ?? guests.length} מתוך {usage.limit}
          </Text>
        ) : null}
      </Card>
      <View style={styles.grid}>
        {(
          [
            ["yes", counts.yes],
            ["pending", counts.pending],
            ["maybe", counts.maybe],
            ["no", counts.no],
          ] as const
        ).map(([status, count]) => (
          <Card key={status} style={styles.stat}>
            <Text style={styles.statNum}>{count}</Text>
            <Text style={styles.statLabel}>{rsvpLabel(status)}</Text>
          </Card>
        ))}
      </View>
      <Card>
        <Text style={styles.statLabel}>סה״כ מגיעים מאושרים</Text>
        <Text style={styles.statNum}>{counts.arriving}</Text>
      </Card>
      <Pressable style={styles.link} onPress={() => router.push("/(app)/guests")}>
        <Text style={styles.linkText}>רשימת מוזמנים</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => router.push("/(app)/guests/add")}>
        <Text style={styles.linkText}>הוספת מוזמן</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => router.push("/(app)/more/security")}>
        <Text style={styles.linkText}>אבטחה והתנתקות</Text>
      </Pressable>
    </Page>
  );
}

const styles = StyleSheet.create({
  hello: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 18, color: colors.brownText },
  meta: { textAlign: "right", marginTop: 4, color: colors.muted, fontFamily: "Heebo_400Regular" },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between" },
  stat: { width: "48%" },
  statNum: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 26, color: colors.brownText },
  statLabel: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_500Medium" },
  link: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
  },
  linkText: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText },
});
