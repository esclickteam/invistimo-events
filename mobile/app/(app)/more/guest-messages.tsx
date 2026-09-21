import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { api } from "@/src/api";
import { useEventData } from "@/src/event";
import { messageFromApi } from "@/src/format";
import { Card, EmptyState, ErrorText, Field, Page, PrimaryButton } from "@/src/ui";
import { colors } from "@/src/theme";

type Thread = {
  guestId: string;
  guestName: string;
  unreadCount: number;
  lastMessage: string;
  messages: { id: string; sender: string; message: string; status?: string }[];
};

export default function GuestMessagesScreen() {
  const { invitation } = useEventData();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});

  async function load() {
    const params = invitation?._id ? `?invitationId=${invitation._id}` : "";
    const result = await api<{
      success?: boolean;
      enabled?: boolean;
      threads?: Thread[];
      message?: string;
      error?: string;
    }>(`/api/guest-messages${params}`);
    if (!result.ok) {
      setError(messageFromApi(result.data, "לא הצלחנו לטעון הודעות"));
      return;
    }
    setEnabled(result.data.enabled !== false);
    setThreads(result.data.threads || []);
  }

  useEffect(() => {
    void load();
  }, [invitation?._id]);

  async function send(guestId: string) {
    const message = (reply[guestId] || "").trim();
    if (!message) return;
    const result = await api("/api/guest-messages", {
      method: "POST",
      body: JSON.stringify({ guestId, message, invitationId: invitation?._id }),
    });
    if (!result.ok) {
      setError(messageFromApi(result.data, "לא נשלחה תשובה"));
      return;
    }
    setReply((current) => ({ ...current, [guestId]: "" }));
    await load();
  }

  async function markRead(id: string) {
    await api(`/api/guest-messages/${id}`, { method: "PATCH", body: JSON.stringify({}) });
    await load();
  }

  if (!enabled) {
    return (
      <Page>
        <EmptyState text="הודעות מהאורחים לא כלולות בחבילה הזו." />
      </Page>
    );
  }

  return (
    <Page refreshing={false} onRefresh={() => void load()}>
      <ErrorText text={error} />
      {!threads.length ? <EmptyState text="עדיין אין הודעות מאורחים." /> : null}
      {threads.map((thread) => (
        <Card key={thread.guestId}>
          <Text style={styles.name}>
            {thread.guestName}
            {thread.unreadCount ? ` · ${thread.unreadCount} חדשות` : ""}
          </Text>
          {thread.messages.slice(-4).map((item) => (
            <Text key={item.id} style={styles.message} onPress={() => void markRead(item.id)}>
              {item.sender === "couple" ? "אתם: " : ""}
              {item.message}
            </Text>
          ))}
          <Field
            label="תשובה"
            value={reply[thread.guestId] || ""}
            onChangeText={(value) => setReply((current) => ({ ...current, [thread.guestId]: value }))}
          />
          <PrimaryButton label="שליחה" onPress={() => void send(thread.guestId)} />
        </Card>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  name: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText, marginBottom: 8 },
  message: { textAlign: "right", fontFamily: "Heebo_400Regular", color: colors.ink, marginBottom: 6 },
});
