import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text } from "react-native";
import { useAuth } from "@/src/auth";
import {
  getNotificationPermission,
  getPushPreference,
  registerNativePush,
  requestNotificationPermission,
} from "@/src/push";
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
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pushPermission, setPushPermission] = useState<string>("undetermined");

  useEffect(() => {
    void (async () => {
      setPushEnabled(await getPushPreference());
      const permission = await getNotificationPermission();
      setPushPermission(permission.status);
    })();
  }, []);

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

  async function togglePush(enabled: boolean) {
    setError("");
    setBusy(true);
    try {
      if (enabled) {
        const permission = await requestNotificationPermission();
        setPushPermission(permission.status);
        if (permission.status !== "granted") {
          setError("כדי לקבל התראות צריך לאשר גישה בהגדרות המכשיר.");
          return;
        }
      }
      const result = await registerNativePush(enabled);
      setPushEnabled(Boolean(result.enabled && enabled));
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
      <Card>
        <Text style={styles.body}>
          התראות האפליקציה נשלחות רק למכשיר הזה, בנפרד מהתראות האתר. הן לא כוללות פרטי אורחים או פרטי התחברות.
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
      {pushEnabled ? (
        <OutlineButton label="כיבוי התראות באפליקציה" onPress={() => void togglePush(false)} />
      ) : (
        <PrimaryButton
          label="הפעלת התראות באפליקציה"
          onPress={() => void togglePush(true)}
          loading={busy}
        />
      )}
      {pushPermission === "denied" ? (
        <OutlineButton label="פתיחת הגדרות ההתראות" onPress={() => void Linking.openSettings()} />
      ) : null}
      <Text style={styles.spacer} />
      <PrimaryButton label="התנתקות" onPress={() => void logout()} />
      <Text style={styles.hint}>
        התנתקות מהאפליקציה מבטלת את הסשן ואת הרשמת ההתראות במכשיר הזה, ולא מנתקת את האתר.
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
