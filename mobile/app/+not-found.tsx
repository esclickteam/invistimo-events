import { Link, Stack } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { Page } from "@/src/ui";
import { colors } from "@/src/theme";

export default function NotFoundScreen() {
  return (
    <Page>
      <Stack.Screen options={{ title: "העמוד לא נמצא" }} />
      <Text style={styles.title}>המסך הזה לא קיים</Text>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>חזרה ל-Invistimo</Text>
      </Link>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: "right",
    fontSize: 22,
    color: colors.brownText,
    fontFamily: "Heebo_700Bold",
    marginBottom: 16,
  },
  link: { alignSelf: "flex-end" },
  linkText: {
    color: colors.gold,
    fontFamily: "Heebo_600SemiBold",
    fontSize: 16,
  },
});
