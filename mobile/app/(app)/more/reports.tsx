import { StyleSheet, Text, View } from "react-native";
import { useEventData } from "@/src/event";
import { rsvpLabel } from "@/src/format";
import { Card, Page } from "@/src/ui";
import { colors } from "@/src/theme";

export default function ReportsScreen() {
  const { guests, usage } = useEventData();
  const counts = guests.reduce(
    (acc, guest) => {
      const key = String(guest.rsvp || "pending");
      acc[key] = (acc[key] || 0) + 1;
      acc.people += Number(guest.guestsCount || 1);
      if (key === "yes") acc.arriving += Number(guest.guestsCount || 1);
      return acc;
    },
    { yes: 0, no: 0, maybe: 0, pending: 0, people: 0, arriving: 0 } as Record<string, number>
  );

  return (
    <Page>
      <Card>
        <Text style={styles.line}>רשומות: {usage?.current ?? guests.length}</Text>
        {usage?.limit ? <Text style={styles.line}>מכסה: {usage.limit}</Text> : null}
        <Text style={styles.line}>סה״כ מוזמנים בתוך הרשומות: {counts.people}</Text>
        <Text style={styles.line}>מגיעים מאושרים: {counts.arriving}</Text>
      </Card>
      <View>
        {(["yes", "maybe", "pending", "no"] as const).map((status) => (
          <Card key={status}>
            <Text style={styles.line}>
              {rsvpLabel(status)}: {counts[status] || 0}
            </Text>
          </Card>
        ))}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  line: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText, fontSize: 16 },
});
