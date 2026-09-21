import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { api } from "@/src/api";
import { useEventData } from "@/src/event";
import { messageFromApi } from "@/src/format";
import { Card, EmptyState, ErrorText, Page } from "@/src/ui";
import { colors } from "@/src/theme";

type ChallengeGuest = { id?: string; _id?: string; name?: string; phone?: string; tableName?: string };

export default function ChallengesScreen() {
  const { invitation, event } = useEventData();
  const eventId = String(invitation?.eventId || event?._id || "");
  const [guests, setGuests] = useState<ChallengeGuest[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId) return;
    void api<{ success?: boolean; guests?: ChallengeGuest[]; message?: string; error?: string }>(
      `/api/wedding-challenges/guests?eventId=${eventId}`
    ).then((result) => {
      if (!result.ok) {
        setError(messageFromApi(result.data, "Wedding Challenges לא כלול בחשבון"));
        return;
      }
      setGuests(result.data.guests || []);
    });
  }, [eventId]);

  return (
    <Page>
      <ErrorText text={error} />
      {!guests.length && !error ? <EmptyState text="אין משתתפים במשחק." /> : null}
      {guests.map((guest) => (
        <Card key={guest.id || guest._id || guest.name}>
          <Text style={styles.title}>{guest.name || "אורח"}</Text>
          <Text style={styles.meta}>{[guest.phone, guest.tableName].filter(Boolean).join(" · ")}</Text>
        </Card>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText },
  meta: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular", marginTop: 4 },
});
