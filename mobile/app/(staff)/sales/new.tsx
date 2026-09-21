import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { api } from "@/src/api";
import { messageFromApi } from "@/src/format";
import { ErrorText, Field, Page, PrimaryButton } from "@/src/ui";
import { colors } from "@/src/theme";

export default function StaffNewSale() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Page>
      <Text style={styles.title}>יצירת לקוח חדש ותשלום</Text>
      <ErrorText text={error} />
      {ok ? <Text style={styles.ok}>{ok}</Text> : null}
      <Field label="שם" value={name} onChangeText={setName} />
      <Field label="אימייל" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <Field label="טלפון" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <PrimaryButton
        label="יצירת מכירה"
        loading={loading}
        onPress={() => {
          void (async () => {
            setLoading(true);
            setError("");
            const result = await api("/api/employee/sales", {
              method: "POST",
              body: JSON.stringify({ fullName: name, name, email, phone, clientName: name, clientEmail: email, clientPhone: phone }),
            });
            setLoading(false);
            if (!result.ok) setError(messageFromApi(result.data, "יצירת המכירה נכשלה"));
            else setOk("המכירה נשמרה");
          })();
        }}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 24, color: colors.brownText, marginBottom: 12 },
  ok: { textAlign: "right", color: colors.yes, fontFamily: "Heebo_700Bold", marginBottom: 8 },
});
