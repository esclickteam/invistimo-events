import { ReactNode, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { brandForExperience } from "@/src/nav";
import type { NavSection } from "@/src/nav";
import { resolveAppExperience } from "@/src/roles";
import { colors, radius } from "@/src/theme";

const PALETTES = {
  admin: {
    bar: "#312E81",
    barText: "#EEF2FF",
    accent: "#4F46E5",
    bg: "#F8FAFC",
    activeBg: "#EEF2FF",
    activeText: "#3730A3",
  },
  staff: {
    bar: "#0F172A",
    barText: "#F8FAFC",
    accent: "#D97706",
    bg: "#F8FAFC",
    activeBg: "#FFFBEB",
    activeText: "#92400E",
  },
  venue: {
    bar: "#1C1712",
    barText: "#F7EFE3",
    accent: "#B88A2D",
    bg: "#FAF8F4",
    activeBg: "#F3E7D4",
    activeText: "#8B5E34",
  },
  producer: {
    bar: "#3F3328",
    barText: "#FFFDF8",
    accent: "#B88A2D",
    bg: "#FAF8F4",
    activeBg: "#F3E7D4",
    activeText: "#8B5E34",
  },
  customer: {
    bar: "#FFFDF8",
    barText: "#3F3328",
    accent: "#B88A2D",
    bg: "#FAF8F4",
    activeBg: "#F3E7D4",
    activeText: "#8B5E34",
  },
} as const;

export function RoleShell({
  children,
  sections,
  palette = "customer",
  screenTitle,
}: {
  children: ReactNode;
  sections: NavSection[];
  palette?: keyof typeof PALETTES;
  screenTitle?: string;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const experience = resolveAppExperience(user);
  const brand = brandForExperience(experience);
  const theme = PALETTES[palette];
  const current = useMemo(() => {
    const items = sections.flatMap((section) => section.items);
    return (
      items.find((item) => pathname === String(item.href).replace("/(admin)", "/admin").replace("/(app)", "") ) ||
      items.find((item) => pathname.includes(String(item.id))) ||
      items[0]
    );
  }, [pathname, sections]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.bar }}>
        <View style={[styles.bar, { backgroundColor: theme.bar }]}>
          <Pressable onPress={() => setOpen(true)} style={styles.menuBtn} accessibilityLabel="תפריט">
            <Text style={[styles.menuIcon, { color: theme.barText }]}>☰</Text>
          </Pressable>
          <View style={styles.barCenter}>
            <Text style={[styles.barKicker, { color: theme.accent }]}>{brand.kicker}</Text>
            <Text style={[styles.barTitle, { color: theme.barText }]}>
              {screenTitle || current?.label || brand.title}
            </Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
            <Text style={styles.avatarText}>{String(user?.name || "IN").slice(0, 2)}</Text>
          </View>
        </View>
      </SafeAreaView>
      <View style={styles.body}>{children}</View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[styles.drawer, { backgroundColor: palette === "admin" ? "#FFFFFF" : colors.card }]} onPress={() => undefined}>
            <SafeAreaView edges={["top"]}>
              <View style={styles.drawerHead}>
                <View>
                  <Text style={styles.drawerBrand}>{brand.kicker}</Text>
                  <Text style={styles.drawerTitle}>{brand.title}</Text>
                  <Text style={styles.drawerRole}>
                    {user?.name || brand.roleLabel} · {brand.roleLabel}
                  </Text>
                </View>
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={styles.close}>✕</Text>
                </Pressable>
              </View>
              <ScrollView>
                {sections.map((section, index) => (
                  <View key={section.title || String(index)} style={styles.section}>
                    {section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null}
                    {section.items.map((item) => {
                      const active = current?.id === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            setOpen(false);
                            router.push(item.href);
                          }}
                          style={[
                            styles.item,
                            active && { backgroundColor: theme.activeBg },
                          ]}
                        >
                          <Text style={[styles.itemText, active && { color: theme.activeText }]}>
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
                <Pressable
                  onPress={() => {
                    setOpen(false);
                    router.push("/security");
                  }}
                  style={styles.item}
                >
                  <Text style={styles.itemText}>אבטחה</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setOpen(false);
                    void logout();
                  }}
                  style={styles.item}
                >
                  <Text style={[styles.itemText, { color: colors.danger }]}>התנתקות</Text>
                </Pressable>
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    height: 64,
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  menuBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  menuIcon: { fontSize: 22, fontFamily: "Heebo_700Bold" },
  barCenter: { flex: 1, alignItems: "center" },
  barKicker: { fontSize: 10, fontFamily: "Heebo_700Bold", letterSpacing: 1 },
  barTitle: { fontSize: 16, fontFamily: "Heebo_700Bold" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontFamily: "Heebo_700Bold", fontSize: 12 },
  body: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.35)", flexDirection: "row-reverse" },
  drawer: { width: 300, maxWidth: "86%", height: "100%", paddingHorizontal: 12 },
  drawerHead: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 16,
  },
  drawerBrand: { color: colors.gold, fontFamily: "Heebo_700Bold", fontSize: 11, textAlign: "right" },
  drawerTitle: { color: colors.brownText, fontFamily: "Heebo_700Bold", fontSize: 20, textAlign: "right" },
  drawerRole: { color: colors.muted, fontFamily: "Heebo_500Medium", marginTop: 4, textAlign: "right" },
  close: { fontSize: 22, color: colors.muted, padding: 8 },
  section: { marginBottom: 12 },
  sectionTitle: {
    color: colors.gold,
    fontFamily: "Heebo_700Bold",
    fontSize: 11,
    textAlign: "right",
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  item: {
    borderRadius: radius.control,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  itemText: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.ink, fontSize: 15 },
});
