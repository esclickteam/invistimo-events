import { StyleSheet, Text, View } from "react-native";
import { useEventData } from "@/src/event";
import { Card, EmptyState, Page, PrimaryButton } from "@/src/ui";
import { openOnWebsite } from "@/src/website";
import { colors } from "@/src/theme";

const TYPE_LABELS: Record<string, string> = {
  rsvp: "אישורי הגעה",
  reminder: "תזכורת",
  thankyou: "תודה",
  table: "מספר שולחן",
  custom: "הודעה",
};

export default function MessagesScreen() {
  const { invitation } = useEventData();
  const messages = invitation?.scheduledMessages || [];

  return (
    <Page>
      <Text style={styles.lead}>
        סטטוס סבבי ההודעות נמשך מאותו אירוע. שליחת סבב SMS או וואטסאפ בתשלום נשארת באתר, כדי לא לשלוח בטעות.
      </Text>
      <PrimaryButton
        label="שליחת הודעות באתר"
        onPress={() => void openOnWebsite("/dashboard/messages")}
      />
      <View style={{ height: 12 }} />
      {!messages.length ? <EmptyState text="אין הודעות מתוזמנות כרגע." /> : null}
      {messages.map((message) => (
        <Card key={message._id || `${message.type}-${message.scheduledAt}`}>
          <Text style={styles.title}>{TYPE_LABELS[message.type || ""] || message.type || "הודעה"}</Text>
          <Text style={styles.meta}>
            {[message.channel, message.status, message.scheduledAt || message.sentAt]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </Card>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  lead: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular", lineHeight: 22, marginBottom: 12 },
  title: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText },
  meta: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular", marginTop: 4 },
});
