import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { ErrorText, Field, PrimaryButton } from "@/src/ui";
import { colors } from "@/src/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const message = await login(identifier, password);
      if (message) setError(message);
      else router.replace("/(app)");
    } catch {
      setError("שגיאה בשרת");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.hero}>
        <Text style={styles.brand}>INVISTIMO</Text>
        <Text style={styles.title}>האירוע שלי</Text>
        <Text style={styles.subtitle}>
          אותם משתמשים, אותם אירועים ואותם מוזמנים כמו באתר.
        </Text>
      </View>
      <ErrorText text={error} />
      <Field
        label="מייל או טלפון"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="username"
      />
      <Field
        label="סיסמה"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
      />
      <PrimaryButton label="התחברות" onPress={submit} loading={loading} />
      <Link href="/forgot-password" style={styles.link}>
        שכחתי סיסמה
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream, padding: 20 },
  hero: { marginTop: 36, marginBottom: 28, alignItems: "flex-end" },
  brand: {
    color: colors.gold,
    fontFamily: "Heebo_700Bold",
    letterSpacing: 2,
  },
  title: {
    marginTop: 6,
    fontSize: 36,
    color: colors.brownText,
    fontFamily: "Heebo_700Bold",
  },
  subtitle: {
    marginTop: 8,
    color: colors.muted,
    fontFamily: "Heebo_400Regular",
    textAlign: "right",
    lineHeight: 22,
  },
  link: {
    marginTop: 18,
    textAlign: "center",
    color: colors.ink,
    fontFamily: "Heebo_600SemiBold",
  },
});
