import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
      setError("אין חיבור יציב לשרת. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require("../assets/images/invistimo-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
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
            autoComplete="username"
          />
          <Field
            label="סיסמה"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            autoComplete="password"
          />
          <PrimaryButton label="התחברות" onPress={submit} loading={loading} />
          <Link href="/forgot-password" style={styles.link}>
            שכחתי סיסמה
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  fill: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  logo: { width: 200, height: 72, alignSelf: "center", marginTop: 12 },
  hero: { marginTop: 20, marginBottom: 28, alignItems: "flex-end" },
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
