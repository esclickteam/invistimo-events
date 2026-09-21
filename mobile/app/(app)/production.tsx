import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { api } from "@/src/api";
import { useEventData } from "@/src/event";
import { extractList, recordMeta, recordTitle } from "@/src/records";
import { Card, EmptyState, ErrorText, Page } from "@/src/ui";
import { colors } from "@/src/theme";
import { messageFromApi } from "@/src/format";

const TABS = [
  { key: "overview", label: "תמונת מצב", path: "overview" },
  { key: "planning", label: "תכנון וקונספט", path: "planning" },
  { key: "suppliers", label: "ספקים ותקציב", path: "suppliers" },
  { key: "calendar", label: "לוח שנה ופגישות", path: "conversations" },
  { key: "logistics", label: "לוגיסטיקה", path: "logistics" },
  { key: "alcohol", label: "אלכוהול", path: "alcohol" },
  { key: "gifts", label: "מתנות מהאירוע", path: "gifts" },
];

export default function ProductionScreen() {
  const { invitation, event } = useEventData();
  const eventId = String(invitation?.eventId || event?._id || "");
  const [tab, setTab] = useState(TABS[0]);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState("");

  async function load(next = tab) {
    if (!eventId) return;
    setError("");
    const result = await api<Record<string, unknown>>(`/api/events/${eventId}/${next.path}`);
    if (!result.ok) {
      setError(messageFromApi(result.data, "ניהול אירוע לא זמין בחשבון הזה"));
      setItems([]);
      return;
    }
    const list = extractList(result.data);
    setItems(list);
    setDetail(JSON.stringify(result.data).slice(0, 400));
  }

  useEffect(() => {
    void load();
  }, [eventId]);

  return (
    <Page onRefresh={() => void load()}>
      <Text style={styles.title}>ניהול אירוע</Text>
      {TABS.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => {
            setTab(item);
            void load(item);
          }}
        >
          <Card style={tab.key === item.key ? styles.active : undefined}>
            <Text style={styles.tab}>{item.label}</Text>
          </Card>
        </Pressable>
      ))}
      <ErrorText text={error} />
      {!eventId ? <EmptyState text="אין אירוע משויך." /> : null}
      {items.map((item, index) => (
        <Card key={recordTitle(item) + index}>
          <Text style={styles.item}>{recordTitle(item)}</Text>
          <Text style={styles.meta}>{recordMeta(item, ["status", "amount", "date", "title"])}</Text>
        </Card>
      ))}
      {!items.length && detail ? (
        <Card>
          <Text style={styles.meta}>{detail}</Text>
        </Card>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 24, color: colors.brownText, marginBottom: 12 },
  tab: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText },
  active: { borderColor: colors.gold, borderWidth: 2 },
  item: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText },
  meta: { textAlign: "right", color: colors.muted, marginTop: 4 },
});
