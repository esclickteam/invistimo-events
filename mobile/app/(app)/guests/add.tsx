import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { createGuest } from "@/src/api";
import { useEventData } from "@/src/event";
import { messageFromApi, RSVP_LABELS } from "@/src/format";
import { digitsOnly } from "@/src/phones";
import { ErrorText, Field, Page, PrimaryButton } from "@/src/ui";
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
        <View style={styles.chooser}>
          <Text style={styles.chooserTitle}>הוספת מוזמן</Text>
          <Text style={styles.lead}>בחרו איך להוסיף את המוזמנים</Text>
          <Choice icon="＋" title="הוספת מוזמן ידנית" onPress={() => setMode("manual")} />
          <Choice icon="📗" title="ייבוא מוזמנים מאקסל" onPress={() => router.push("/(app)/guests/excel")} />
          <Choice icon="👤" title="ייבוא מאנשי קשר" onPress={() => router.push("/(app)/guests/contacts")} />
        </View>
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

function Choice({ title, onPress, icon }: { title: string; onPress: () => void; icon: string }) {
  return (
    <Pressable onPress={onPress} style={styles.choiceBtn}>
      <View style={styles.choiceIcon}>
        <Text style={styles.choiceIconText}>{icon}</Text>
      </View>
      <Text style={styles.choice}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chooser: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#EADBC4",
    backgroundColor: "#FFFDF8",
    padding: 20,
  },
  chooserTitle: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 20, color: "#3F3328" },
  lead: {
    textAlign: "right",
    color: colors.muted,
    fontFamily: "Heebo_700Bold",
    marginBottom: 16,
    marginTop: 4,
    fontSize: 14,
  },
  choiceBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E3D6C3",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  choiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#F8EEDB",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceIconText: { fontSize: 16, color: "#B88A2D" },
  choice: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Heebo_700Bold",
    fontSize: 16,
    color: "#3F3328",
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
