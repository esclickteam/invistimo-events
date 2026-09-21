import { StyleSheet, Text } from "react-native";
import { useAuth } from "@/src/auth";
import { useEventData } from "@/src/event";
import { Card, EmptyState, Page, ScreenTitle } from "@/src/ui";
import { colors } from "@/src/theme";

export default function CallRoundsScreen() {
  const { user } = useAuth();
  const { invitation } = useEventData();
  const rounds = Array.isArray(user?.callRoundsSchedule)
    ? user.callRoundsSchedule
    : ((user as { callRoundsSchedule?: { rounds?: unknown[] } } | null)?.callRoundsSchedule?.rounds ||
      invitation?.scheduledMessages ||
      []);
  const list = Array.isArray(rounds) ? rounds : [];

  return (
    <Page>
      <ScreenTitle title="לו״ז אישורי הגעה" subtitle="סטטוס סבבי השיחות של האירוע" />
      {!list.length ? <EmptyState text="אין סבבי שיחות מתוזמנים." /> : null}
      {list.map((round, index) => {
        const item = (round || {}) as Record<string, unknown>;
        return (
          <Card key={String(item._id || index)}>
            <Text style={styles.title}>{String(item.name || item.type || `סבב ${index + 1}`)}</Text>
            <Text style={styles.meta}>
              {[item.status, item.scheduledAt, item.channel].filter(Boolean).join(" · ")}
            </Text>
          </Card>
        );
      })}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText },
  meta: { textAlign: "right", color: colors.muted, marginTop: 4 },
});
