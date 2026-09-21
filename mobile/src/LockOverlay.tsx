import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/src/auth";
import { ErrorText, OutlineButton, PrimaryButton } from "@/src/ui";
import { colors } from "@/src/theme";

export function LockOverlay() {
  const { locked, biometric, unlockWithBiometrics, usePasswordInstead } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!locked) return;
    if (!biometric.available) return;
    void unlock();
    // Prompt once when the lock screen appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  async function unlock() {
    setError("");
    setBusy(true);
    try {
      const message = await unlockWithBiometrics();
      if (message) setError(message);
    } finally {
      setBusy(false);
    }
  }

  if (!locked) return null;

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <Image
        source={require("../assets/images/invistimo-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.brand}>INVISTIMO</Text>
      <Text style={styles.title}>האירוע נעול</Text>
      <Text style={styles.copy}>
        {biometric.available
          ? `פתחו עם ${biometric.label} כדי להמשיך בלי להקליד סיסמה.`
          : "הזיהוי הביומטרי לא זמין כרגע. אפשר להתחבר עם סיסמת החשבון."}
      </Text>
      <ErrorText text={error} />
      {busy ? <ActivityIndicator color={colors.gold} /> : null}
      {biometric.available ? (
        <PrimaryButton
          label={`פתיחה עם ${biometric.label}`}
          onPress={() => void unlock()}
          loading={busy}
        />
      ) : null}
      <View style={{ height: 12 }} />
      <OutlineButton label="התחברות עם סיסמה" onPress={usePasswordInstead} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.cream,
    zIndex: 50,
    padding: 28,
    justifyContent: "center",
  },
  logo: { width: 180, height: 72, alignSelf: "center", marginBottom: 18 },
  brand: {
    textAlign: "center",
    color: colors.gold,
    fontFamily: "Heebo_700Bold",
    letterSpacing: 2,
  },
  title: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 28,
    color: colors.brownText,
    fontFamily: "Heebo_700Bold",
  },
  copy: {
    marginTop: 10,
    marginBottom: 22,
    textAlign: "center",
    color: colors.muted,
    fontFamily: "Heebo_400Regular",
    lineHeight: 22,
  },
});
