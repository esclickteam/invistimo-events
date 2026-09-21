import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { deleteGuest, fetchGuestGroups, type Guest, type GuestGroup } from "@/src/api";
import { copyText } from "@/src/clipboard";
import { useEventData } from "@/src/event";
import { messageFromApi } from "@/src/format";
import {
  formatGuestPhone,
  getGuestInvitationUrl,
  guestLinkWasOpened,
  guestTableLabel,
  matchesGuestLinkOpenFilter,
  whatsappInviteUrl,
} from "@/src/guestLink";
import { phoneKey } from "@/src/phones";
import { StatusPill } from "@/src/ui";
import { colors } from "@/src/theme";

type QuickFilter =
  | "all"
  | "opened"
  | "notOpened"
  | "yes"
  | "no"
  | "maybe"
  | "pending"
  | "noTable";

const FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "all", label: "הכל" },
  { key: "opened", label: "נפתח" },
  { key: "notOpened", label: "לא נפתח" },
  { key: "yes", label: "מגיעים" },
  { key: "no", label: "לא מגיעים" },
  { key: "maybe", label: "מתלבטים" },
  { key: "pending", label: "בהמתנה" },
  { key: "noTable", label: "בלי שולחן" },
];

export default function GuestsScreen() {
  const { guests, loading, refresh, usage, invitation } = useEventData();
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [callsGuest, setCallsGuest] = useState<Guest | null>(null);

  useEffect(() => {
    if (!invitation?._id) return;
    void fetchGuestGroups(invitation._id).then((result) => {
      setGroups(result.data.groups || []);
    });
  }, [invitation?._id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qPhone = phoneKey(query);
    return guests.filter((guest) => {
      if (selectedGroupId && String(guest.groupId || "") !== selectedGroupId) return false;
      if (quickFilter === "yes" || quickFilter === "no" || quickFilter === "maybe" || quickFilter === "pending") {
        if (String(guest.rsvp || "pending") !== quickFilter) return false;
      }
      if (quickFilter === "noTable" && guestTableLabel(guest) !== "—") return false;
      if (!matchesGuestLinkOpenFilter(guest, quickFilter)) return false;
      if (!q) return true;
      const name = guest.name.toLowerCase();
      const phone = phoneKey(guest.phone || "");
      return name.includes(q) || (qPhone && phone.includes(qPhone));
    });
  }, [guests, query, quickFilter, selectedGroupId]);

  const remaining =
    usage?.limit != null ? Math.max(0, Number(usage.limit) - Number(usage.current ?? guests.length)) : null;

  async function handleDelete(guest: Guest) {
    Alert.alert(
      "מחיקת מוזמן",
      `האם למחוק את המוזמן "${guest.name || "ללא שם"}"?\nהפעולה אינה ניתנת לביטול.`,
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "מחיקה",
          style: "destructive",
          onPress: async () => {
            const result = await deleteGuest(guest._id);
            if (!result.ok) {
              Alert.alert("שגיאה", messageFromApi(result.data, "שגיאה במחיקת המוזמן"));
              return;
            }
            await refresh();
          },
        },
      ]
    );
  }

  async function handleCopy(guest: Guest) {
    const link = getGuestInvitationUrl(invitation, guest);
    if (!link) return;
    const mode = await copyText(link);
    Alert.alert(mode === "copied" ? "הקישור הועתק" : "שיתוף קישור", "📋 הקישור הועתק");
  }

  function handleOpen(guest: Guest) {
    const link = getGuestInvitationUrl(invitation, guest);
    if (!link) return;
    void Linking.openURL(link);
  }

  function handleWhatsApp(guest: Guest) {
    const link = getGuestInvitationUrl(invitation, guest);
    const url = whatsappInviteUrl(guest, link);
    if (!url) {
      Alert.alert("אין טלפון", "לא ניתן לשלוח וואטסאפ בלי מספר טלפון");
      return;
    }
    void Linking.openURL(url);
  }

  return (
    <View style={styles.page}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        refreshing={loading}
        onRefresh={() => void refresh()}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.controls}>
            <Text style={styles.controlsTitle}>רשימת מוזמנים</Text>
            <Text style={styles.controlsMeta}>
              מוצגים {filtered.length} מתוך {guests.length} מוזמנים
            </Text>
            {usage?.limit ? (
              <Text style={styles.remaining}>
                יתרת רשומות להעלאה: {remaining} מתוך {usage.limit}
              </Text>
            ) : null}

            <View style={styles.searchRow}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="חיפוש לפי שם או טלפון..."
                placeholderTextColor="#B0A79D"
                style={styles.search}
              />
              {query ? (
                <Pressable onPress={() => setQuery("")} style={styles.clear}>
                  <Text style={styles.clearText}>נקה</Text>
                </Pressable>
              ) : null}
            </View>

            <Pressable
              style={styles.addBtn}
              onPress={() => router.push("/(app)/guests/add")}
              disabled={remaining === 0}
            >
              <Text style={styles.addBtnText}>+ הוספת מוזמן</Text>
            </Pressable>

            {groups.length ? (
              <View style={styles.filters}>
                <FilterChip
                  label="כל הקבוצות"
                  active={!selectedGroupId}
                  onPress={() => setSelectedGroupId("")}
                />
                {groups.map((group) => (
                  <FilterChip
                    key={group._id}
                    label={group.name}
                    active={selectedGroupId === group._id}
                    onPress={() => setSelectedGroupId(group._id)}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.filters}>
              {FILTERS.map((filter) => (
                <FilterChip
                  key={filter.key}
                  label={filter.label}
                  active={quickFilter === filter.key}
                  onPress={() => setQuickFilter(filter.key)}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>לא נמצאו תוצאות</Text>
          </View>
        }
        renderItem={({ item }) => (
          <GuestCard
            guest={item}
            onOpen={() => handleOpen(item)}
            onCopy={() => void handleCopy(item)}
            onCall={() => setCallsGuest(item)}
            onWhatsApp={() => handleWhatsApp(item)}
            onEdit={() => router.push(`/(app)/guests/${item._id}`)}
            onDelete={() => void handleDelete(item)}
          />
        )}
      />

      <CallRoundsSheet guest={callsGuest} onClose={() => setCallsGuest(null)} />
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function GuestCard({
  guest,
  onOpen,
  onCopy,
  onCall,
  onWhatsApp,
  onEdit,
  onDelete,
}: {
  guest: Guest;
  onOpen: () => void;
  onCopy: () => void;
  onCall: () => void;
  onWhatsApp: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const arrived = Number(guest.arrivedCount ?? 0);
  const opened = guestLinkWasOpened(guest);

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {guest.name || "ללא שם"}
          </Text>
          <Text style={styles.phone}>{formatGuestPhone(guest.phone) || "ללא טלפון"}</Text>
          <Text style={styles.relation}>{guest.relation?.trim() || "ללא קרבה"}</Text>
        </View>
        <StatusPill status={guest.rsvp} />
      </View>

      <View style={[styles.openBadge, opened ? styles.openOn : styles.openOff]}>
        <Text style={[styles.openText, opened ? styles.openTextOn : styles.openTextOff]}>
          {opened ? "נפתח" : "לא נפתח"}
        </Text>
      </View>

      <View style={styles.stats}>
        <StatBox label="מוזמנים" value={String(guest.guestsCount || 0)} />
        <StatBox label="מגיעים" value={String(arrived)} />
        <StatBox label="שולחן" value={guestTableLabel(guest)} />
      </View>

      {guest.notes?.trim() ? (
        <View style={styles.notes}>
          <Text style={styles.notesText}>{guest.notes.trim()}</Text>
        </View>
      ) : null}

      <View style={styles.actionsWrap}>
        <View style={styles.actionCol}>
          <Text style={styles.actionLabel}>הזמנת אורח</Text>
          <View style={styles.actionRow}>
            <ActionButton title="פתיחת קישור הזמנה" onPress={onOpen}>
              🔗
            </ActionButton>
            <ActionButton title="העתקת קישור הזמנה" onPress={onCopy}>
              📋
            </ActionButton>
          </View>
        </View>
        <View style={styles.actionCol}>
          <Text style={styles.actionLabel}>פעולות</Text>
          <View style={styles.actionRow}>
            <ActionButton title="מעקב סבבי שיחה" onPress={onCall}>
              📞
            </ActionButton>
            <ActionButton title="שליחת וואטסאפ אישי" onPress={onWhatsApp}>
              💬
            </ActionButton>
            <ActionButton title="עריכת מוזמן" onPress={onEdit}>
              ✏️
            </ActionButton>
            <ActionButton title="מחיקת מוזמן" onPress={onDelete} danger>
              🗑️
            </ActionButton>
          </View>
        </View>
      </View>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  title,
  children,
  onPress,
  danger,
}: {
  title: string;
  children: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={title}
      onPress={onPress}
      style={[styles.actionBtn, danger && styles.actionDanger]}
    >
      <Text style={styles.actionEmoji}>{children}</Text>
    </Pressable>
  );
}

function CallRoundsSheet({ guest, onClose }: { guest: Guest | null; onClose: () => void }) {
  const rounds = Array.isArray(guest?.callRounds) ? guest!.callRounds : [];

  return (
    <Modal visible={Boolean(guest)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          <View style={styles.modalHead}>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>
            <View>
              <Text style={styles.modalKicker}>📞 מעקב שיחות</Text>
              <Text style={styles.modalTitle}>{guest?.name}</Text>
              <Text style={styles.modalMeta}>{guest?.phone || "ללא טלפון"}</Text>
            </View>
          </View>
          <Text style={styles.modalHint}>
            צפייה בלבד — הנתונים מסתנכרנים מתיעוד העובדים. אין אפשרות לערוך או למחוק מהחלון הזה.
          </Text>
          <ScrollView style={{ maxHeight: 420 }}>
            {rounds.length === 0 ? (
              <Text style={styles.modalMeta}>אין סבבי שיחה למוזמן זה</Text>
            ) : (
              rounds.map((round, index) => {
                const row = (round || {}) as Record<string, unknown>;
                return (
                  <View key={String(row.roundNumber || index)} style={styles.roundCard}>
                    <Text style={styles.roundKicker}>סבב {String(row.roundNumber || index + 1)}</Text>
                    <Text style={styles.roundTitle}>
                      {Number(row.roundNumber) === 1
                        ? "סבב ראשון"
                        : Number(row.roundNumber) === 2
                          ? "סבב שני"
                          : Number(row.roundNumber) === 3
                            ? "סבב שלישי"
                            : `סבב ${row.roundNumber || index + 1}`}
                    </Text>
                    <Text style={styles.modalMeta}>
                      {String(row.answerStatus || "—")} · {String(row.resultStatus || "—")}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  controls: {
    marginBottom: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D8C4A5",
    backgroundColor: "#FFFDF8",
    padding: 16,
    shadowColor: "#5B3F1F",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  controlsTitle: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 18, color: "#241A14" },
  controlsMeta: { textAlign: "right", marginTop: 4, color: "#8A7B69", fontFamily: "Heebo_600SemiBold", fontSize: 12 },
  remaining: { textAlign: "right", marginTop: 4, color: "#8B5E34", fontFamily: "Heebo_700Bold", fontSize: 12 },
  searchRow: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D8C4A5",
    backgroundColor: "#FFFFFF",
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: { color: "#B8844F", fontSize: 16 },
  search: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Heebo_700Bold",
    color: "#241A14",
    fontSize: 14,
    paddingVertical: 10,
  },
  clear: { backgroundColor: "#F4EEE5", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  clearText: { fontFamily: "Heebo_700Bold", color: "#7B6857", fontSize: 12 },
  addBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 18,
    backgroundColor: "#D4A762",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "#FFFFFF", fontFamily: "Heebo_700Bold", fontSize: 14 },
  filters: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: {
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E3D6C3",
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  chipOn: { backgroundColor: "#B8844F", borderColor: "#B8844F" },
  chipText: { fontFamily: "Heebo_700Bold", fontSize: 12, color: "#6B5B4A" },
  chipTextOn: { color: "#FFFFFF" },
  list: { padding: 16, paddingTop: 4, paddingBottom: 40 },
  empty: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E7DED1",
    backgroundColor: "#FFFFFF",
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: { fontFamily: "Heebo_700Bold", color: "#6B7280", fontSize: 14 },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E7DED1",
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#1E1B2E",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  cardHead: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 12 },
  name: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 18, color: "#4A2E1B" },
  phone: { textAlign: "right", marginTop: 4, fontSize: 16, color: "#6B7280", fontFamily: "Heebo_400Regular" },
  relation: { textAlign: "right", marginTop: 8, fontSize: 14, color: "#6B5A4A", fontFamily: "Heebo_400Regular" },
  openBadge: {
    alignSelf: "flex-end",
    marginTop: 12,
    minWidth: 72,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  openOn: { borderColor: "#A7F3D0", backgroundColor: "#ECFDF5" },
  openOff: { borderColor: "#E7DED1", backgroundColor: "#F7F3EC" },
  openText: { textAlign: "center", fontFamily: "Heebo_700Bold", fontSize: 11 },
  openTextOn: { color: "#065F46" },
  openTextOff: { color: "#8A7A68" },
  stats: { marginTop: 16, flexDirection: "row-reverse", gap: 12 },
  statBox: { flex: 1, backgroundColor: "#F9FAFB", borderRadius: 16, paddingVertical: 12, alignItems: "center" },
  statLabel: { fontSize: 12, color: "#6B7280", fontFamily: "Heebo_400Regular" },
  statValue: { marginTop: 2, fontSize: 18, fontFamily: "Heebo_700Bold", color: "#6B451E" },
  notes: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFE4D5",
    backgroundColor: "#FFFCF7",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  notesText: { textAlign: "right", fontSize: 14, lineHeight: 22, color: "#4A3B30", fontFamily: "Heebo_400Regular" },
  actionsWrap: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E7DED1",
    paddingTop: 16,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: 12,
  },
  actionCol: { alignItems: "flex-end" },
  actionLabel: { marginBottom: 8, fontSize: 12, fontFamily: "Heebo_700Bold", color: "#7B6A58" },
  actionRow: { flexDirection: "row-reverse", gap: 8 },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7D8C6",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  actionDanger: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  actionEmoji: { fontSize: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#E4D3B8",
    backgroundColor: "#FFFDF8",
    padding: 20,
  },
  modalHead: { flexDirection: "row-reverse", justifyContent: "space-between" },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5D8C7",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: { fontSize: 22, color: "#5A4635" },
  modalKicker: { textAlign: "right", color: "#9A6A25", fontFamily: "Heebo_700Bold", fontSize: 11 },
  modalTitle: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 20, color: "#2B2118" },
  modalMeta: { textAlign: "right", color: "#7D6B59", fontFamily: "Heebo_700Bold", fontSize: 12, marginTop: 4 },
  modalHint: {
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFE5D6",
    backgroundColor: "rgba(255,255,255,0.7)",
    padding: 12,
    textAlign: "right",
    color: "#7D6B59",
    fontFamily: "Heebo_700Bold",
    fontSize: 12,
    lineHeight: 20,
  },
  roundCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5D7C2",
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 10,
  },
  roundKicker: { textAlign: "right", color: "#B8844F", fontFamily: "Heebo_700Bold", fontSize: 11 },
  roundTitle: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 16, color: "#2B2118" },
});
