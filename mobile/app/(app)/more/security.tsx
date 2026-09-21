import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useAuth } from "@/src/auth";
import { Card, ErrorText, OutlineButton, Page, PrimaryButton, ScreenTitle } from "@/src/ui";
import { colors } from "@/src/theme";

export default function SecurityScreen() {
  const {
    biometric,
    biometricsEnabled,
    enableBiometrics,
    disableBiometrics,
    logout,
  } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggleOn() {
    setError("");
    setBusy(true);
    try {
      const message = await enableBiometrics();
      if (message) setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <ScreenTitle title="אבטחה" subtitle="פתיחת האפליקציה במכשיר הזה" />
      <Card>
        <Text style={styles.body}>
          {biometric.available
            ? `${biometric.label} פותח את הסשן השמור במכשיר. הסיסמה עצמה לא נשמרת.`
            : "במכשיר הזה אין Face ID, Touch ID או ביומטריה זמינה."}
        </Text>
      </Card>
      <ErrorText text={error} />
      {biometric.available ? (
        biometricsEnabled ? (
          <OutlineButton
            label={`כיבוי ${biometric.label}`}
            onPress={() => void disableBiometrics()}
          />
        ) : (
          <PrimaryButton
            label={`הפעלת ${biometric.label}`}
            onPress={() => void toggleOn()}
            loading={busy}
          />
        )
      ) : null}
      <Text style={styles.spacer} />
      <PrimaryButton label="התנתקות" onPress={() => void logout()} />
      <Text style={styles.hint}>
        התנתקות מהאפליקציה מבטלת את הסשן הנייד במכשיר הזה, ולא מנתקת את האתר.
      </Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  body: {
    textAlign: "right",
    color: colors.brownText,
    fontFamily: "Heebo_400Regular",
    lineHeight: 22,
  },
  spacer: { height: 24 },
  hint: {
    marginTop: 12,
    textAlign: "right",
    color: colors.muted,
    fontFamily: "Heebo_400Regular",
    lineHeight: 20,
  },
});
