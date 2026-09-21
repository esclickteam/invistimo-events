import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { api } from "@/src/api";
import { useEventData } from "@/src/event";
import { formatEventDate, formatLocation, messageFromApi } from "@/src/format";
import { ErrorText, Field, Page, PrimaryButton } from "@/src/ui";
import { colors } from "@/src/theme";

export default function EventDetailsScreen() {
  const { invitation, event, refresh } = useEventData();
  const [title, setTitle] = useState(String(event?.title || invitation?.title || ""));
  const [time, setTime] = useState(String(event?.time || invitation?.eventTime || ""));
  const [date, setDate] = useState(String(event?.date || invitation?.eventDate || ""));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(false);
  const place = formatLocation(event?.location || invitation?.location);

  useEffect(() => {
    setTitle(String(event?.title || invitation?.title || ""));
    setTime(String(event?.time || invitation?.eventTime || ""));
    setDate(String(event?.date || invitation?.eventDate || ""));
  }, [event, invitation]);

  async function save() {
    setLoading(true);
    setError("");
    setSaved("");
    const result = await api("/api/events", {
      method: "POST",
      body: JSON.stringify({
        title,
        time,
        date,
        eventType: event?.eventType || "wedding",
        location: event?.location || invitation?.location || {},
      }),
    });
    setLoading(false);
    if (!result.ok) {
      setError(messageFromApi(result.data, "לא הצלחנו לשמור את פרטי האירוע"));
      return;
    }
    await refresh();
    setSaved("הפרטים נשמרו ויופיעו גם באתר");
  }

  return (
    <Page>
      <Text style={styles.meta}>{place || "מיקום יופיע כאן אחרי שיוגדר באירוע"}</Text>
      <Text style={styles.meta}>{formatEventDate(date)}</Text>
      <ErrorText text={error} />
      {saved ? <Text style={styles.ok}>{saved}</Text> : null}
      <Field label="שם האירוע" value={title} onChangeText={setTitle} />
      <Field label="תאריך" value={date} onChangeText={setDate} />
      <Field label="שעה" value={time} onChangeText={setTime} />
      <PrimaryButton label="שמירה" onPress={() => void save()} loading={loading} />
    </Page>
  );
}

const styles = StyleSheet.create({
  meta: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular", marginBottom: 8 },
  ok: { textAlign: "right", color: colors.yes, fontFamily: "Heebo_600SemiBold", marginBottom: 8 },
});
