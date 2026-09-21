import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/auth";
import { useEventData } from "@/src/event";
import { formatEventDate, formatLocation } from "@/src/format";
import { guestLinkWasOpened } from "@/src/guestLink";
import { Page } from "@/src/ui";
import { colors } from "@/src/theme";

export default function DashboardScreen() {
  const { user } = useAuth();
  const { loading, invitation, event, guests, usage, refresh } = useEventData();
  const title = String(invitation?.title || event?.title || "ניהול אירוע");
  const date = formatEventDate(invitation?.eventDate || event?.date);
  const time = String(invitation?.eventTime || event?.time || "");
  const place = formatLocation(invitation?.location || event?.location);
  const stats = guests.reduce(
    (acc, guest) => {
      const key = String(guest.rsvp || "pending");
      acc.totalGuests += 1;
      if (key === "yes") acc.comingGuests += 1;
      if (key === "no") acc.notComing += 1;
      if (key === "maybe") acc.maybe += 1;
      if (key === "pending") acc.noResponse += 1;
      if (guestLinkWasOpened(guest)) acc.opened += 1;
      return acc;
    },
    { totalGuests: 0, comingGuests: 0, notComing: 0, maybe: 0, noResponse: 0, opened: 0 }
  );

  return (
    <Page refreshing={loading} onRefresh={() => void refresh()}>
      <View style={styles.stats}>
        <StatCard title="סה״כ מוזמנים" value={stats.totalGuests} icon="👥" tone="bronze" description="כלל המוזמנים" />
        <StatCard title="מגיעים" value={stats.comingGuests} icon="✓" tone="green" description="אישרו הגעה" />
        <StatCard title="לא מגיעים" value={stats.notComing} icon="×" tone="rose" description="סימנו שלא מגיעים" />
        <StatCard title="מתלבטים" value={stats.maybe} icon="?" tone="gold" description="ענו שאינם בטוחים" />
        <StatCard title="בהמתנה" value={stats.noResponse} icon="⌛" tone="bronze" description="טרם השיבו כלל" />
      </View>

      <View style={styles.eventCard}>
        <Text style={styles.eventKicker}>פרטי האירוע</Text>
        <Text style={styles.eventTitle}>{title}</Text>
        {date ? <Text style={styles.eventMeta}>{date}</Text> : null}
        {time ? <Text style={styles.eventMeta}>{time}</Text> : null}
        {place ? <Text style={styles.eventMeta}>{place}</Text> : null}
        {usage?.limit ? (
          <Text style={styles.eventMeta}>
            רשומות מוזמנים: {usage.current ?? guests.length} מתוך {usage.limit}
          </Text>
        ) : null}
        <Text style={styles.hello}>שלום {user?.name || ""}</Text>
        <Pressable style={styles.eventBtn} onPress={() => router.push("/(app)/more/event")}>
          <Text style={styles.eventBtnText}>עריכת פרטי האירוע</Text>
        </Pressable>
      </View>

      <View style={styles.eventCard}>
        <Text style={styles.eventKicker}>פתיחות קישור</Text>
        <Text style={styles.statNum}>{stats.opened}</Text>
        <Text style={styles.eventMeta}>מוזמנים שפתחו את הקישור האישי</Text>
      </View>

      <Pressable style={styles.link} onPress={() => router.push("/(app)/guests")}>
        <Text style={styles.linkText}>רשימת מוזמנים</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => router.push("/(app)/guests/add")}>
        <Text style={styles.linkText}>הוספת מוזמן</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => router.push("/(app)/seating")}>
        <Text style={styles.linkText}>סידורי הושבה</Text>
      </Pressable>
    </Page>
  );
}

function StatCard({
  title,
  value,
  icon,
  tone,
  description,
}: {
  title: string;
  value: number;
  icon: string;
  tone: "bronze" | "green" | "rose" | "gold";
  description: string;
}) {
  const palette =
    tone === "green"
      ? { wrap: "#ECFDF5", border: "#D1FAE5", value: "#047857", iconBg: "#D1FAE5" }
      : tone === "rose"
        ? { wrap: "#FFF1F2", border: "#FFE4E6", value: "#BE123C", iconBg: "#FFE4E6" }
        : tone === "gold"
          ? { wrap: "#FFFBEB", border: "#FEF3C7", value: "#A76313", iconBg: "#FEF3C7" }
          : { wrap: "#FFFFFF", border: "#E3D6C3", value: "#241A14", iconBg: "#F3E6D3" };

  return (
    <View style={[styles.statCard, { backgroundColor: palette.wrap, borderColor: palette.border }]}>
      <View>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={[styles.statNum, { color: palette.value }]}>{value}</Text>
        <Text style={styles.statDesc}>{description}</Text>
      </View>
      <View style={[styles.statIcon, { backgroundColor: palette.iconBg }]}>
        <Text style={styles.statIconText}>{icon}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { gap: 12, marginBottom: 16 },
  statCard: {
    minHeight: 132,
    borderRadius: 26,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statTitle: { textAlign: "right", color: "#7C6A58", fontFamily: "Heebo_700Bold", fontSize: 14, marginBottom: 8 },
  statNum: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 36, color: colors.brownText },
  statDesc: { textAlign: "right", color: "#9A8775", fontSize: 12, marginTop: 8, fontFamily: "Heebo_400Regular" },
  statIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statIconText: { fontSize: 24 },
  eventCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#E3D6C3",
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 12,
  },
  eventKicker: { textAlign: "right", color: "#7C6A58", fontFamily: "Heebo_700Bold", fontSize: 13 },
  eventTitle: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 22, color: "#241A14", marginTop: 4 },
  eventMeta: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular", marginTop: 4 },
  hello: { textAlign: "right", marginTop: 10, fontFamily: "Heebo_700Bold", color: colors.brownText },
  eventBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#3F3328",
    alignItems: "center",
    justifyContent: "center",
  },
  eventBtnText: { color: "#FFFFFF", fontFamily: "Heebo_700Bold" },
  link: {
    backgroundColor: "#FFFDF8",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E3D6C3",
    padding: 16,
    marginBottom: 10,
  },
  linkText: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText },
});
