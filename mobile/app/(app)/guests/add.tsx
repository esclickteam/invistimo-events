import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { createGuest } from "@/src/api";
import { useEventData } from "@/src/event";
import { messageFromApi, RSVP_LABELS } from "@/src/format";
import { digitsOnly } from "@/src/phones";
import { Card, ErrorText, Field, Page, PrimaryButton } from "@/src/ui";
import { colors } from "@/src/theme";

const STATUSES = ["pending", "yes", "maybe", "no"] as const;

export default function AddGuestScreen() {
  const { invitation, refresh } = useEventData();
  const [mode, setMode] = useState<"choose" | "manual">("choose");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [guestsCount, setGuestsCount] = useState("1");
  const [rsvp, setRsvp] = useState<(typeof STATUSES)[number]>("pending");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!invitation?._id) {
      setError("כדי להוסיף מוזמנים יש ליצור הזמנה תחילה");
      return;
    }
    if (!name.trim()) {
      setError("חסר שם");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await createGuest(invitation._id, {
        name: name.trim(),
        phone: digitsOnly(phone),
        relation: relation.trim(),
        rsvp,
        guestsCount: Math.max(1, Number(guestsCount) || 1),
      });
      if (!result.ok || result.data.success === false) {
        setError(messageFromApi(result.data, "לא הצלחנו להוסיף את המוזמן"));
        return;
      }
      await refresh();
      router.back();
    } catch {
      setError("שגיאה בשרת");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "choose") {
    return (
      <Page>
        <Text style={styles.lead}>בחרו איך להוסיף את המוזמנים</Text>
        <Choice title="הוספת מוזמן ידנית" onPress={() => setMode("manual")} />
        <Choice title="ייבוא מאנשי קשר" onPress={() => router.push("/(app)/guests/contacts")} />
        <Choice title="ייבוא מוזמנים מאקסל" onPress={() => router.push("/(app)/guests/excel")} />
      </Page>
    );
  }

  return (
    <Page>
      <ErrorText text={error} />
      <Field label="שם מלא" value={name} onChangeText={setName} />
      <Field label="טלפון" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="קרבה" value={relation} onChangeText={setRelation} />
      <Field label="כמות מוזמנים" value={guestsCount} onChangeText={setGuestsCount} keyboardType="number-pad" />
      <Text style={styles.label}>סטטוס</Text>
      <View style={styles.statuses}>
        {STATUSES.map((status) => (
          <Pressable
            key={status}
            onPress={() => setRsvp(status)}
            style={[styles.status, rsvp === status && styles.statusOn]}
          >
            <Text style={styles.statusText}>{RSVP_LABELS[status]}</Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton label="שמירה" onPress={save} loading={loading} />
    </Page>
  );
}

function Choice({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <Text style={styles.choice}>{title}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lead: {
    textAlign: "right",
    color: colors.muted,
    fontFamily: "Heebo_500Medium",
    marginBottom: 12,
  },
  choice: {
    textAlign: "right",
    fontFamily: "Heebo_700Bold",
    fontSize: 16,
    color: colors.brownText,
  },
  label: { textAlign: "right", fontFamily: "Heebo_600SemiBold", color: colors.ink, marginBottom: 8 },
  statuses: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  status: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusOn: { backgroundColor: colors.goldSoft, borderColor: colors.goldRing },
  statusText: { fontFamily: "Heebo_600SemiBold", color: colors.brownText },
});
