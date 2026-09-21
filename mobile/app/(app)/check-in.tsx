import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, Linking } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { api } from "@/src/api";
import { useEventData } from "@/src/event";
import { messageFromApi } from "@/src/format";
import { Card, ErrorText, Page, PrimaryButton } from "@/src/ui";
import { colors } from "@/src/theme";

type CheckInGuest = {
  id: string;
  name: string;
  phone?: string;
  tableName?: string;
  confirmedGuestCount?: number;
  checkedInGuestCount?: number;
  remaining?: number;
  status?: string;
};

export default function CheckInScreen() {
  const { invitation, event, guests, refresh } = useEventData();
  const invitationId = invitation?._id || "";
  const eventId = String(invitation?.eventId || event?._id || "");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [locked, setLocked] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<CheckInGuest | null>(null);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!invitationId && !eventId) return;
    const params = new URLSearchParams();
    if (invitationId) params.set("invitationId", invitationId);
    if (eventId) params.set("eventId", eventId);
    void api<{ success?: boolean; summary?: Record<string, unknown>; message?: string; error?: string }>(
      `/api/check-in/summary?${params.toString()}`
    ).then((result) => {
      if (!result.ok) {
        setError(messageFromApi(result.data, "כניסה לאירוע לא זמינה כרגע"));
        return;
      }
      const data = result.data.summary || {};
      const checked = data.checkedIn ?? data.arrived ?? data.checkedInGuests;
      const total = data.confirmed ?? data.expected ?? data.total;
      if (checked != null || total != null) {
        setSummary(`נכנסו ${checked ?? "—"} מתוך ${total ?? "—"}`);
      }
    });
  }, [invitationId, eventId]);

  async function lookup(token: string) {
    if (locked) return;
    setLocked(true);
    setError("");
    const result = await api<{ success?: boolean; guest?: CheckInGuest; message?: string; error?: string }>(
      "/api/check-in/lookup",
      {
        method: "POST",
        body: JSON.stringify({ token, invitationId, eventId }),
      }
    );
    setScanning(false);
    if (!result.ok || !result.data.guest) {
      setError(messageFromApi(result.data, "האורח לא נמצא"));
      setLocked(false);
      return;
    }
    setFound(result.data.guest);
    setLocked(false);
  }

  async function confirm(guestId: string, method: "QR" | "MANUAL") {
    setError("");
    const result = await api<{ success?: boolean; message?: string; error?: string }>("/api/check-in/confirm", {
      method: "POST",
      body: JSON.stringify({ guestId, invitationId, eventId, method }),
    });
    if (!result.ok || result.data.success === false) {
      setError(messageFromApi(result.data, "לא הצלחנו לסמן הגעה"));
      return;
    }
    setFound(null);
    setQuery("");
    await refresh();
    setSummary("ההגעה עודכנה ותופיע גם באתר");
  }

  const manualMatches = query.trim()
    ? guests.filter((guest) => guest.name.includes(query.trim()) || (guest.phone || "").includes(query.trim()))
    : [];

  return (
    <Page>
      <Text style={styles.lead}>סריקת QR או חיפוש ידני. סימון ההגעה נשמר באותו אירוע כמו באתר.</Text>
      {summary ? <Text style={styles.summary}>{summary}</Text> : null}
      <ErrorText text={error} />
      {scanning && permission?.granted ? (
        <View style={styles.camera}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => void lookup(data)}
          />
        </View>
      ) : null}
      <PrimaryButton
        label={scanning ? "סגירת מצלמה" : "סריקת QR"}
        onPress={() => {
          if (permission?.granted) {
            setScanning((value) => !value);
            return;
          }
          if (permission && permission.canAskAgain === false) {
            void Linking.openSettings();
            return;
          }
          void requestPermission();
        }}
      />
      {permission && !permission.granted ? (
        <Text style={styles.lead}>
          {permission.canAskAgain === false
            ? "הגישה למצלמה חסומה. אפשר להפעיל אותה בהגדרות המכשיר כדי לסרוק QR, או לחפש מוזמן ידנית."
            : "המצלמה משמשת רק לסריקת ברקוד כניסה. אפשר גם לחפש מוזמן ידנית."}
        </Text>
      ) : null}
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="חיפוש מוזמן לכניסה ידנית"
        placeholderTextColor={colors.soft}
        style={styles.search}
      />
      {manualMatches.slice(0, 8).map((guest) => (
        <Pressable key={guest._id} onPress={() => void confirm(guest._id, "MANUAL")}>
          <Card>
            <Text style={styles.name}>{guest.name}</Text>
            <Text style={styles.meta}>{guest.phone || "ללא טלפון"} · סימון הגעה</Text>
          </Card>
        </Pressable>
      ))}
      {found ? (
        <Card>
          <Text style={styles.name}>{found.name}</Text>
          <Text style={styles.meta}>
            {found.tableName || "ללא שולחן"} · מאושרים {found.confirmedGuestCount ?? 1} · נכנסו{" "}
            {found.checkedInGuestCount ?? 0}
          </Text>
          <PrimaryButton label="אישור כניסה" onPress={() => void confirm(found.id, "QR")} />
        </Card>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  lead: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular", lineHeight: 22, marginBottom: 8 },
  summary: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText, marginBottom: 10 },
  camera: { height: 280, borderRadius: 24, overflow: "hidden", marginBottom: 12 },
  search: {
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: "right",
    fontFamily: "Heebo_400Regular",
    color: colors.brownText,
  },
  name: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText },
  meta: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular", marginBottom: 8 },
});
