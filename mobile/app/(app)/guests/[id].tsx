import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { updateGuest } from "@/src/api";
import { useEventData } from "@/src/event";
import { messageFromApi } from "@/src/format";
import {
  buildGuestLinkTimeline,
  formatGuestLinkOpenedAt,
  formatTimelineTime,
  guestLinkWasOpened,
} from "@/src/guestLink";
import { EmptyState, ErrorText, Page } from "@/src/ui";
import { colors } from "@/src/theme";

const RSVP_OPTIONS = [
  { value: "pending", label: "לא ענו" },
  { value: "yes", label: "מגיע" },
  { value: "no", label: "לא מגיע" },
  { value: "maybe", label: "מתלבטים" },
] as const;

export default function GuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { guests, refresh } = useEventData();
  const guest = guests.find((item) => item._id === id);
  const [name, setName] = useState(guest?.name || "");
  const [phone, setPhone] = useState(guest?.phone || "");
  const [relation, setRelation] = useState(guest?.relation || "");
  const [notes, setNotes] = useState(guest?.notes || "");
  const [guestsCount, setGuestsCount] = useState(String(guest?.guestsCount || 1));
  const [arrivedCount, setArrivedCount] = useState(String(guest?.arrivedCount || 0));
  const [rsvp, setRsvp] = useState(guest?.rsvp || "pending");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const phoneLocked = !String(guest?.phone || "").replace(/\D/g, "");
  const tableName = guest?.tableName || guest?.tableNumber || "-";
  const timeline = buildGuestLinkTimeline(guest);
  const opened = guestLinkWasOpened(guest);

  useEffect(() => {
    if (!guest) return;
    setName(guest.name || "");
    setPhone(guest.phone || "");
    setRelation(guest.relation || "");
    setNotes(guest.notes || "");
    setGuestsCount(String(guest.guestsCount || 1));
    setArrivedCount(String(typeof guest.arrivedCount === "number" ? guest.arrivedCount : 0));
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
  const currentPhone = guest.phone || "";

  async function save() {
    setLoading(true);
    setError("");
    const nextRsvp = rsvp || "pending";
    const safeGuestsCount = Math.max(1, Number(guestsCount || 1));
    const safeArrivedCount =
      nextRsvp === "no" || nextRsvp === "maybe" || nextRsvp === "pending"
        ? 0
        : Math.max(1, Number(arrivedCount || 1));
    const result = await updateGuest(guestId, {
      name: name.trim(),
      phone: phoneLocked ? currentPhone : phone.trim(),
      relation: relation.trim(),
      notes,
      rsvp: nextRsvp,
      status: nextRsvp,
      guestsCount: safeGuestsCount,
      arrivedCount: safeArrivedCount,
      amount: safeArrivedCount,
    });
    setLoading(false);
    if (!result.ok) {
      setError(messageFromApi(result.data, "שגיאה בעדכון אורח"));
      return;
    }
    await refresh();
    router.back();
  }

  return (
    <Page>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.close} accessibilityLabel="סגירה">
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <View style={styles.kicker}>
            <Text style={styles.kickerText}>✦  עריכת אורח</Text>
          </View>
          <Text style={styles.title}>{guest.name || "אורח"}</Text>
          <Text style={styles.subtitle}>עדכון פרטי מוזמן, סטטוס וכמות מגיעים</Text>
        </View>

        <ErrorText text={error} />

        <Field label="שם מלא">
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="שם האורח" />
        </Field>
        <Field label="טלפון">
          <TextInput
            style={[styles.input, phoneLocked && styles.locked]}
            value={phone}
            onChangeText={setPhone}
            placeholder={phoneLocked ? "ללא מספר טלפון" : "מספר טלפון"}
            keyboardType="phone-pad"
            editable={!phoneLocked}
          />
          {phoneLocked ? (
            <Text style={styles.hint}>אורח שנוצר בלי טלפון לא ניתן להוסיף לו מספר אחר כך</Text>
          ) : null}
        </Field>
        <Field label="קרבה">
          <TextInput
            style={styles.input}
            value={relation}
            onChangeText={setRelation}
            placeholder="משפחה / חברים / עבודה..."
          />
        </Field>
        <Field label="סטטוס">
          <View style={styles.statuses}>
            {RSVP_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setRsvp(option.value);
                  if (option.value === "no" || option.value === "pending" || option.value === "maybe") {
                    setArrivedCount("0");
                  }
                  if (option.value === "yes" && Number(arrivedCount) <= 0) {
                    setArrivedCount(String(guestsCount || 1));
                  }
                }}
                style={[styles.status, rsvp === option.value && styles.statusOn]}
              >
                <Text style={styles.statusText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </Field>
        <Field label="מוזמנים">
          <TextInput
            style={styles.input}
            value={guestsCount}
            keyboardType="number-pad"
            onChangeText={(value) => {
              const next = String(Math.max(1, Number(value || 1)));
              setGuestsCount(next);
              if (rsvp === "yes" && Number(arrivedCount) <= 0) setArrivedCount(next);
            }}
          />
        </Field>
        <Field label="מגיעים">
          <TextInput
            style={styles.input}
            value={arrivedCount}
            keyboardType="number-pad"
            onChangeText={setArrivedCount}
          />
        </Field>
        <Field label="מספר שולחן">
          <TextInput style={[styles.input, styles.locked]} value={String(tableName)} editable={false} />
        </Field>
        <Field label="הערות">
          <TextInput
            style={[styles.input, styles.notes]}
            value={notes}
            onChangeText={setNotes}
            placeholder="הערות פנימיות על האורח..."
            multiline
          />
        </Field>

        <View style={styles.linkBox}>
          <Text style={styles.linkTitle}>פתיחת קישור</Text>
          {opened ? (
            <>
              <Text style={styles.linkLine}>
                נפתח לראשונה: {formatGuestLinkOpenedAt(guest.firstOpenedAt) || "—"}
              </Text>
              <Text style={styles.linkLine}>
                נפתח לאחרונה: {formatGuestLinkOpenedAt(guest.lastOpenedAt) || "—"}
              </Text>
              <Text style={styles.linkLine}>מספר פתיחות: {Number(guest.openCount || 0)}</Text>
            </>
          ) : (
            <Text style={styles.linkOff}>לא נפתח</Text>
          )}
          {timeline.length ? (
            <View style={styles.timeline}>
              {timeline.map((item, index) => (
                <Text key={`${item.at.toISOString()}-${index}`} style={styles.timelineItem}>
                  {formatTimelineTime(item.at)} — {item.label}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            שימו לב: שינוי סטטוס ל״מגיע״ יעדכן את כמות המגיעים לפי השדה “מגיעים”. שינוי ל״לא מגיע״, ״מתלבטים״ או ״לא ענו״ יאפס את כמות המגיעים.
          </Text>
        </View>

        <Pressable style={[styles.save, loading && styles.disabled]} onPress={() => void save()} disabled={loading}>
          <Text style={styles.saveText}>{loading ? "שומר..." : "שמור שינויים"}</Text>
        </Pressable>
        <Pressable style={styles.cancel} onPress={() => router.back()} disabled={loading}>
          <Text style={styles.cancelText}>ביטול</Text>
        </Pressable>
      </View>
    </Page>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#E5D5BC",
    backgroundColor: "#FFFDF8",
    paddingBottom: 16,
    overflow: "hidden",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#E9DDC8",
    backgroundColor: "#FFF5E4",
    padding: 20,
    alignItems: "center",
  },
  close: {
    position: "absolute",
    left: 16,
    top: 16,
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2D4C3",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 22, color: "#5A4635", fontFamily: "Heebo_700Bold" },
  kicker: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E3C78D",
    backgroundColor: "#FFF7E8",
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8,
  },
  kickerText: { color: "#9A6A25", fontFamily: "Heebo_700Bold", fontSize: 11 },
  title: { fontFamily: "Heebo_700Bold", fontSize: 24, color: "#241A14", textAlign: "center" },
  subtitle: { marginTop: 4, fontSize: 12, fontFamily: "Heebo_700Bold", color: "#7D6B59" },
  field: { paddingHorizontal: 20, marginTop: 12 },
  label: { textAlign: "right", fontFamily: "Heebo_700Bold", color: "#5A4635", marginBottom: 6 },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5D5BC",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: "right",
    fontFamily: "Heebo_400Regular",
    color: "#241A14",
    fontSize: 16,
  },
  locked: { backgroundColor: "#F7F1E8", color: "#7D6B59" },
  notes: { minHeight: 92, textAlignVertical: "top" },
  hint: { marginTop: 4, fontSize: 11, fontFamily: "Heebo_700Bold", color: "#8A7B69", textAlign: "right" },
  statuses: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  status: {
    borderWidth: 1,
    borderColor: "#E5D5BC",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusOn: { backgroundColor: "#FFF7E8", borderColor: "#E3C78D" },
  statusText: { fontFamily: "Heebo_700Bold", color: "#241A14" },
  linkBox: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EADBC4",
    backgroundColor: "#FFFDF8",
    padding: 16,
  },
  linkTitle: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 12, color: "#5A4635" },
  linkLine: { textAlign: "right", marginTop: 6, fontFamily: "Heebo_700Bold", color: "#241A14" },
  linkOff: { textAlign: "right", marginTop: 8, fontFamily: "Heebo_700Bold", color: "#8A7A68" },
  timeline: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#EADBC4", paddingTop: 12 },
  timelineItem: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 12, color: "#5A4635", marginBottom: 6 },
  notice: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EADBC4",
    backgroundColor: "#FFF9EE",
    padding: 16,
  },
  noticeText: { textAlign: "right", fontSize: 12, fontFamily: "Heebo_700Bold", lineHeight: 20, color: "#7A6046" },
  save: {
    marginHorizontal: 20,
    marginTop: 16,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#3B2A1D",
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#FFFFFF", fontFamily: "Heebo_700Bold" },
  cancel: {
    marginHorizontal: 20,
    marginTop: 8,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8C4A5",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: "#5A4635", fontFamily: "Heebo_700Bold" },
  disabled: { backgroundColor: "#D1D5DB" },
});
