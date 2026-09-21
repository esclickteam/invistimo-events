import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as XLSX from "xlsx";
import { router } from "expo-router";
import { importGuests } from "@/src/api";
import { useEventData } from "@/src/event";
import { messageFromApi } from "@/src/format";
import { phonesMatch } from "@/src/phones";
import { ErrorText, Page, PrimaryButton } from "@/src/ui";
import { colors } from "@/src/theme";

const RSVP_MAP: Record<string, string> = {
  בהמתנה: "pending",
  ממתין: "pending",
  מגיע: "yes",
  כן: "yes",
  "לא מגיע": "no",
  לא: "no",
  maybe: "maybe",
  pending: "pending",
  yes: "yes",
  no: "no",
};

export default function ExcelImportScreen() {
  const { invitation, guests, refresh } = useEventData();
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function pick() {
    if (!invitation?._id) {
      setError("כדי להוסיף מוזמנים יש ליצור הזמנה תחילה");
      return;
    }
    setError("");
    setSummary("");
    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
        "text/comma-separated-values",
      ],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets[0]) return;

    setLoading(true);
    try {
      const asset = picked.assets[0];
      const isCsv = /\.csv$/i.test(asset.name);
      const raw = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: isCsv ? FileSystem.EncodingType.UTF8 : FileSystem.EncodingType.Base64,
      });
      const workbook = XLSX.read(raw, { type: isCsv ? "string" : "base64" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const parsed = records
        .map((row) => {
          const name = clean(row["שם"] || row["שם מלא"] || row.name);
          if (!name) return null;
          const phone = clean(row["טלפון"] || row.phone).replace(/\D/g, "");
          const status = clean(row["סטטוס"] || row.rsvp);
          const tableRaw = row["מס' שולחן"] ?? row["מספר שולחן"] ?? row["שולחן"] ?? "";
          const tableDigits = String(tableRaw).replace(/[^\d]/g, "");
          const tableNumber = tableDigits ? Number(tableDigits) : null;
          return {
            name,
            phone: phone || null,
            relation: clean(row["קרבה"]) || null,
            group: clean(row["קבוצה"]) || null,
            rsvp: RSVP_MAP[status] || "pending",
            guestsCount: Math.max(1, Number(row["מוזמנים"] ?? row["כמות אורחים"] ?? 1) || 1),
            notes: clean(row["הערות"]) || null,
            tableNumber,
            tableName: tableNumber !== null ? `שולחן ${tableNumber}` : null,
            arrivedCount: 0,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row));

      const fresh = parsed.filter(
        (row) => !row.phone || !guests.some((guest) => phonesMatch(guest.phone || "", row.phone || ""))
      );
      const skipped = parsed.length - fresh.length;
      if (!fresh.length) {
        setError(
          skipped
            ? "כל הרשומות כבר קיימות לפי מספר טלפון, ולא נוצרו כפילויות."
            : "לא נמצאו שורות תקינות לייבוא"
        );
        return;
      }

      const result = await importGuests(invitation._id, fresh);
      if (!result.ok || result.data.success === false) {
        setError(messageFromApi(result.data, "שגיאה בייבוא הקובץ"));
        return;
      }
      await refresh();
      setSummary(
        `${result.data.message || `יובאו ${result.data.count || fresh.length} מוזמנים`}${
          skipped ? `. דולגו ${skipped} כפילויות.` : ""
        }`
      );
      setTimeout(() => router.replace("/(app)/guests"), 900);
    } catch {
      setError("לא הצלחנו לקרוא את הקובץ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <Text style={styles.text}>
        העמודות זהות לאתר: שם, טלפון, קרבה, קבוצה, סטטוס, מוזמנים, הערות ומספר שולחן. רשומות עם טלפון שכבר קיים באירוע לא יועלו שוב.
      </Text>
      <ErrorText text={error} />
      {summary ? <Text style={styles.ok}>{summary}</Text> : null}
      <PrimaryButton label="בחירת קובץ אקסל" onPress={() => void pick()} loading={loading} />
    </Page>
  );
}

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const styles = StyleSheet.create({
  text: {
    textAlign: "right",
    color: colors.muted,
    fontFamily: "Heebo_400Regular",
    lineHeight: 22,
    marginBottom: 16,
  },
  ok: { textAlign: "right", color: colors.yes, fontFamily: "Heebo_600SemiBold", marginBottom: 12 },
});
