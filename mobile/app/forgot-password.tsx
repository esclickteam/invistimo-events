import { useState } from "react";
import { api } from "@/src/api";
import { ErrorText, Field, Page, PrimaryButton, ScreenTitle } from "@/src/ui";
import { colors } from "@/src/theme";
import { Text } from "react-native";

export default function ForgotPasswordScreen() {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setDone("");
    setLoading(true);
    try {
      const result = await api<{ success?: boolean; error?: string; message?: string }>(
        "/api/auth/forgot-password",
        { method: "POST", body: JSON.stringify({ phone }) },
        { auth: false }
      );
      if (!result.ok || result.data.success === false) {
        setError(result.data.message || result.data.error || "לא הצלחנו לשלוח קישור");
      } else {
        setDone("אם המספר קיים במערכת, נשלח אליו קישור לאיפוס סיסמה.");
      }
    } catch {
      setError("שגיאה בשרת");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <ScreenTitle title="שחזור סיסמה" subtitle="נשלח קישור לטלפון הרשום ב-Invistimo" />
      <ErrorText text={error} />
      {done ? (
        <Text style={{ textAlign: "right", color: colors.yes, fontFamily: "Heebo_500Medium" }}>
          {done}
        </Text>
      ) : null}
      <Field label="טלפון" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <PrimaryButton label="שליחה" onPress={submit} loading={loading} />
    </Page>
  );
}
