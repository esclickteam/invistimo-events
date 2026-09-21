import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { createGuest, notesWithEmail } from "@/src/api";
import { useEventData } from "@/src/event";
import { useImportDraft } from "@/src/importDraft";
import { messageFromApi } from "@/src/format";
import { phoneKey, phonesMatch } from "@/src/phones";
import { Card, EmptyState, ErrorText, Field, Page, PrimaryButton } from "@/src/ui";
import { colors } from "@/src/theme";

export default function ImportPreviewScreen() {
  const { rows, setRows } = useImportDraft();
  const { invitation, guests, refresh } = useEventData();
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [loading, setLoading] = useState(false);

  const annotated = useMemo(() => {
    return rows.map((row) => {
      const existing = guests.find((guest) => phonesMatch(guest.phone || "", row.phone));
      const sibling = rows.find(
        (other) =>
          other.key !== row.key &&
          other.selected &&
          phoneKey(other.phone) &&
          phonesMatch(other.phone, row.phone)
      );
      const duplicate = Boolean(existing) || Boolean(sibling && sibling.key < row.key);
      return {
        ...row,
        duplicate,
        duplicateReason: existing
          ? `כבר קיים באירוע: ${existing.name}`
          : sibling && sibling.key < row.key
            ? "מספר זהה נבחר יותר מפעם אחת"
            : "",
        selected: duplicate ? false : row.selected,
      };
    });
  }, [rows, guests]);

  const creatable = annotated.filter((row) => row.selected && !row.duplicate && row.name.trim());

  function update(key: string, patch: Partial<(typeof rows)[number]>) {
    setRows(
      rows.map((row) => {
        if (row.key !== key) return row;
        return { ...row, ...patch };
      })
    );
  }

  function selectAll(value: boolean) {
    setRows(annotated.map((row) => ({ ...row, selected: value && !row.duplicate })));
  }

  function removeSelected() {
    const remove = new Set(annotated.filter((row) => row.selected).map((row) => row.key));
    setRows(rows.filter((row) => !remove.has(row.key)));
  }

  async function confirm() {
    if (!invitation?._id) {
      setError("לא נמצאה הזמנה פעילה");
      return;
    }
    if (!creatable.length) {
      setError("אין מוזמנים חדשים ליצירה");
      return;
    }
    setLoading(true);
    setError("");
    let created = 0;
    const failures: string[] = [];
    for (const row of creatable) {
      setProgress(`יוצרים ${created + 1} מתוך ${creatable.length}`);
      const result = await createGuest(invitation._id, {
        name: row.name.trim(),
        phone: row.phone,
        notes: notesWithEmail(row.email),
        rsvp: "pending",
        guestsCount: 1,
      });
      if (result.ok && result.data.success !== false) created += 1;
      else {
        failures.push(`${row.name}: ${messageFromApi(result.data, "שגיאה")}`);
        if (result.data.code === "GUEST_LIMIT_REACHED") break;
      }
    }
    await refresh();
    setLoading(false);
    setProgress("");
    if (failures.length) {
      setError(`נוצרו ${created} מוזמנים. ${failures.slice(0, 3).join("\n")}`);
      return;
    }
    setRows([]);
    router.replace("/(app)/guests");
  }

  if (!rows.length) {
    return (
      <Page>
        <EmptyState text="אין אנשי קשר בתצוגה המקדימה." />
      </Page>
    );
  }

  return (
    <Page
      footer={
        <PrimaryButton
          label={`אישור ייבוא · ${creatable.length} מוזמנים חדשים`}
          onPress={() => void confirm()}
          loading={loading}
        />
      }
    >
      <Text style={styles.summary}>
        נבחרו {annotated.filter((row) => row.selected).length} · כפילויות{" "}
        {annotated.filter((row) => row.duplicate).length} · ייווצרו {creatable.length} מוזמנים חדשים
      </Text>
      <Text style={styles.note}>
        אימייל נשמר בשדה ההערות (אימייל: …) כדי שיופיע גם באתר. רשימת אנשי הקשר עצמה לא נשמרת.
      </Text>
      <ErrorText text={error || progress} />
      <View style={styles.actions}>
        <TextButton label="בחירת הכל" onPress={() => selectAll(true)} />
        <TextButton label="ביטול בחירה" onPress={() => selectAll(false)} />
        <TextButton label="הסרת הנבחרים" onPress={removeSelected} />
      </View>
      {annotated.map((row) => (
        <Card key={row.key} style={row.duplicate ? styles.duplicate : undefined}>
          <Pressable onPress={() => update(row.key, { selected: !row.selected && !row.duplicate })}>
            <Text style={styles.check}>{row.selected && !row.duplicate ? "נבחר לייבוא" : "לא ייובא"}</Text>
          </Pressable>
          {row.duplicate ? <Text style={styles.dupText}>כפילות · {row.duplicateReason}</Text> : null}
          <Field label="שם" value={row.name} onChangeText={(name) => update(row.key, { name })} />
          <Field label="טלפון" value={row.phone} onChangeText={(phone) => update(row.key, { phone })} keyboardType="phone-pad" />
          <Field label="אימייל" value={row.email} onChangeText={(email) => update(row.key, { email })} autoCapitalize="none" />
          <Pressable onPress={() => setRows(rows.filter((item) => item.key !== row.key))}>
            <Text style={styles.remove}>הסרה</Text>
          </Pressable>
        </Card>
      ))}
    </Page>
  );
}

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.action}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  summary: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText, marginBottom: 6 },
  note: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular", marginBottom: 10, lineHeight: 20 },
  actions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  action: {
    backgroundColor: colors.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: { fontFamily: "Heebo_600SemiBold", color: colors.ink },
  check: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.gold, marginBottom: 8 },
  duplicate: { borderColor: colors.danger },
  dupText: { textAlign: "right", color: colors.danger, fontFamily: "Heebo_600SemiBold", marginBottom: 8 },
  remove: { textAlign: "left", color: colors.danger, fontFamily: "Heebo_600SemiBold" },
});
