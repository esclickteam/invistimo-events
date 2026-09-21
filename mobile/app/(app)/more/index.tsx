import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/auth";
import { Card, Page, ScreenTitle } from "@/src/ui";
import { colors } from "@/src/theme";

const ITEMS = [
  { href: "/(app)/more/event", title: "פרטי האירוע", flag: "always" },
  { href: "/(app)/more/invitation", title: "הזמנה", flag: "always" },
  { href: "/(app)/more/messages", title: "שליחת הודעות", flag: "always" },
  { href: "/(app)/more/guest-messages", title: "הודעות מהאורחים", flag: "messages" },
  { href: "/(app)/more/reports", title: "דוחות הגעה", flag: "always" },
  { href: "/(app)/more/transport", title: "ניהול הסעות", flag: "transport" },
  { href: "/(app)/more/challenges", title: "ניהול Wedding Challenges", flag: "challenges" },
  { href: "/(app)/more/website", title: "אתר חתונה", flag: "website" },
] as const;

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const visible = ITEMS.filter((item) => {
    if (item.flag === "always") return true;
    if (item.flag === "transport") return user?.includeTransportationManagement === true;
    if (item.flag === "challenges") return user?.includeWeddingChallenges === true;
    if (item.flag === "website") {
      return user?.features?.weddingWebsite === true || user?.accessModules?.weddingWebsite === true;
    }
    if (item.flag === "messages") {
      return user?.features?.guestMessages === true || user?.accessModules?.guestMessages === true;
    }
    return true;
  });

  return (
    <Page>
      <ScreenTitle title="האירוע שלי" subtitle={user?.packageName ? String(user.packageName) : user?.role} />
      {visible.map((item) => (
        <Pressable key={item.href} onPress={() => router.push(item.href)}>
          <Card>
            <Text style={styles.item}>{item.title}</Text>
          </Card>
        </Pressable>
      ))}
      <Pressable onPress={() => void logout()}>
        <Text style={styles.logout}>התנתקות</Text>
      </Pressable>
    </Page>
  );
}

const styles = StyleSheet.create({
  item: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 16, color: colors.brownText },
  logout: { textAlign: "center", marginTop: 12, color: colors.danger, fontFamily: "Heebo_700Bold" },
});
