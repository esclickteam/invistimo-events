import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { deleteGuest, updateGuest } from "@/src/api";
import { useEventData } from "@/src/event";
import { messageFromApi, RSVP_LABELS } from "@/src/format";
import { Card, EmptyState, ErrorText, Field, Page, PrimaryButton } from "@/src/ui";
import { colors } from "@/src/theme";

const STATUSES = ["pending", "yes", "maybe", "no"] as const;

export default function GuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { guests, refresh } = useEventData();
  const guest = guests.find((item) => item._id === id);
  const [name, setName] = useState(guest?.name || "");
  const [phone, setPhone] = useState(guest?.phone || "");
  const [relation, setRelation] = useState(guest?.relation || "");
  const [notes, setNotes] = useState(guest?.notes || "");
  const [guestsCount, setGuestsCount] = useState(String(guest?.guestsCount || 1));
  const [rsvp, setRsvp] = useState(guest?.rsvp || "pending");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!guest) return;
    setName(guest.name || "");
    setPhone(guest.phone || "");
    setRelation(guest.relation || "");
    setNotes(guest.notes || "");
    setGuestsCount(String(guest.guestsCount || 1));
    setRsvp(guest.rsvp || "pending");
  }, [guest]);

  if (!guest) {
    return (
      <Page>
        <EmptyState text="המוזמן לא נמצא ברשימה הנוכחית. רעננו את הרשימה." />
      </Page>
    );
  }

  const guestId = guest._id;
  const guestName = guest.name;

  async function save() {
    setLoading(true);
    setError("");
    const result = await updateGuest(guestId, {
      name: name.trim(),
      phone: phone.trim(),
      relation: relation.trim(),
      notes,
      rsvp,
      guestsCount: Math.max(1, Number(guestsCount) || 1),
    });
    setLoading(false);
    if (!result.ok) {
      setError(messageFromApi(result.data, "לא הצלחנו לעדכן את המוזמן"));
      return;
    }
    await refresh();
    router.back();
  }

  function remove() {
    Alert.alert("מחיקת מוזמן", `למחוק את ${guestName}?`, [
      { text: "ביטול", style: "cancel" },
      {
        text: "מחיקה",
        style: "destructive",
        onPress: async () => {
          const result = await deleteGuest(guestId);
          if (!result.ok) {
            setError(messageFromApi(result.data, "לא הצלחנו למחוק"));
            return;
          }
          await refresh();
          router.back();
        },
      },
    ]);
  }

  return (
    <Page>
      <ErrorText text={error} />
      <Field label="שם" value={name} onChangeText={setName} />
      <Field label="טלפון" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="קרבה" value={relation} onChangeText={setRelation} />
      <Field label="כמות מוזמנים" value={guestsCount} onChangeText={setGuestsCount} keyboardType="number-pad" />
      <Field label="הערות" value={notes} onChangeText={setNotes} multiline />
      <Text style={styles.label}>סטטוס הגעה</Text>
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
      {guest.tableName ? (
        <Card>
          <Text style={styles.meta}>הושבה: {guest.tableName}</Text>
        </Card>
      ) : null}
      <PrimaryButton label="שמירה" onPress={() => void save()} loading={loading} />
      <Pressable onPress={remove} style={styles.delete}>
        <Text style={styles.deleteText}>מחיקת מוזמן</Text>
      </Pressable>
    </Page>
  );
}

const styles = StyleSheet.create({
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
  meta: { textAlign: "right", fontFamily: "Heebo_500Medium", color: colors.ink },
  delete: { marginTop: 18, alignItems: "center" },
  deleteText: { color: colors.danger, fontFamily: "Heebo_700Bold" },
});
