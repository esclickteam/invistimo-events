import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { useEventData } from "@/src/event";
import { messageFromApi } from "@/src/format";
import { phoneKey } from "@/src/phones";
import {
  getTableLayout,
  guestSeatCount,
  parseSeatingTable,
  tableFootprint,
  type SeatingTable,
} from "@/src/seatingMap";
import { colors } from "@/src/theme";

type CanvasView = { x: number; y: number; scale: number };
type GuestGroup = { _id: string; name: string };

const TABLE_TYPES = [
  { id: "banquet", name: "אבירים", subtitle: "שולחן מלבני ארוך" },
  { id: "square", name: "מרובע", subtitle: "שולחן סטנדרטי" },
  { id: "round", name: "עגול", subtitle: "שולחן עגול" },
] as const;

export default function SeatingScreen() {
  const { invitation, event, guests, refresh } = useEventData();
  const eventId = String(invitation?.eventId || event?._id || "");
  const invitationId = String(invitation?._id || "");
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [background, setBackground] = useState<string | null>(null);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("שמירה אוטומטית פעילה");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [guestQuery, setGuestQuery] = useState("");
  const [guestFilter, setGuestFilter] = useState<"all" | "seated" | "unseated">("all");
  const [seatsInput, setSeatsInput] = useState("12");
  const [tableType, setTableType] = useState<(typeof TABLE_TYPES)[number]["id"]>("round");
  const [canvasSize, setCanvasSize] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height - 140,
  });
  const view = useRef<CanvasView>({ x: 40, y: 80, scale: 0.45 });
  const [, setTick] = useState(0);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const panStart = useRef<CanvasView | null>(null);

  const seatedIds = useMemo(() => {
    const ids = new Set<string>();
    tables.forEach((table) => table.seatedGuests.forEach((seat) => ids.add(String(seat.guestId))));
    return ids;
  }, [tables]);

  const stats = useMemo(() => {
    const total = guests.length;
    const seated = guests.filter((guest) => seatedIds.has(guest._id)).length;
    return { total, seated, remaining: total - seated };
  }, [guests, seatedIds]);

  const load = useCallback(async () => {
    if (!eventId) return;
    setError("");
    const result = await api<{
      success?: boolean;
      tables?: Record<string, unknown>[];
      background?: { url?: string } | string | null;
      canvasView?: CanvasView;
      error?: string;
      message?: string;
    }>(`/api/seating/tables/${eventId}${invitationId ? `?invitationId=${invitationId}` : ""}`);
    if (!result.ok) {
      setError(messageFromApi(result.data, "אין הרשאה להושבה או שאין סידור שמור"));
      return;
    }
    setTables((result.data.tables || []).map((table, index) => parseSeatingTable(table, index)));
    const bg = result.data.background;
    setBackground(typeof bg === "string" ? bg : bg?.url || null);
    if (result.data.canvasView) view.current = result.data.canvasView;
    setTick((n) => n + 1);
  }, [eventId, invitationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!invitationId) return;
    void api<{ groups?: GuestGroup[] }>(`/api/groups?invitationId=${encodeURIComponent(invitationId)}`).then(
      (result) => setGroups(result.data.groups || [])
    );
  }, [invitationId]);

  async function persist(nextTables: SeatingTable[], toast = false) {
    if (!eventId || !invitationId) return false;
    setStatus("שומר אוטומטית...");
    const result = await api(`/api/seating/save/${eventId}`, {
      method: "POST",
      body: JSON.stringify({
        eventId,
        invitationId,
        tables: nextTables,
        guests,
        groups,
        background,
        canvasView: view.current,
      }),
    });
    if (!result.ok) {
      setError(messageFromApi(result.data, "שגיאה בשמירה"));
      setStatus("שמירה אוטומטית פעילה");
      return false;
    }
    const now = new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    setStatus(`נשמר ב־${now}`);
    if (toast) Alert.alert("נשמר", "🎉 נשמר בהצלחה");
    return true;
  }

  async function assignGuest(guestId: string, toTableId: string) {
    setError("");
    const result = await api("/api/seating/live/move-guest-table", {
      method: "PATCH",
      body: JSON.stringify({ eventId, guestId, toTableId }),
    });
    if (!result.ok) {
      setError(messageFromApi(result.data, "לא הצלחנו לשבץ את המוזמן"));
      return;
    }
    setSelectedGuestId(null);
    await Promise.all([load(), refresh()]);
  }

  function addTable() {
    const seats = Math.max(1, Number(seatsInput || 12));
    const next: SeatingTable = {
      id: `table-${Date.now()}`,
      name: `שולחן ${tables.length + 1}`,
      number: tables.length + 1,
      type: tableType,
      seats,
      capacity: seats,
      x: (-view.current.x + canvasSize.width / 2) / view.current.scale,
      y: (-view.current.y + canvasSize.height / 2) / view.current.scale,
      rotation: 0,
      seatedGuests: [],
    };
    const nextTables = [...tables, next];
    setTables(nextTables);
    setAddOpen(false);
    void persist(nextTables);
  }

  async function smartSeat() {
    Alert.alert(
      "הושבה חכמה",
      "המערכת תושיב מחדש רק את האורחים שאישרו הגעה, לפי קבוצות ומקומות פנויים בשולחנות.\n\nשימי לב: פעולה זו עשויה להחליף את ההושבה הקיימת.\nלאחר מכן עדיין אפשר להסיר אורחים משולחנות ולשנות הכל ידנית.\n\nלהמשיך?",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "להמשיך",
          onPress: async () => {
            const result = await api(`/api/seating/smart-seat-by-groups/${eventId}`, {
              method: "POST",
              body: JSON.stringify({ invitationId }),
            });
            if (!result.ok) {
              Alert.alert("שגיאה", messageFromApi(result.data, "שגיאה בהושבה חכמה"));
              return;
            }
            const data = result.data as { seatedCount?: number; unseatedCount?: number };
            await load();
            await refresh();
            Alert.alert(
              "הושבה חכמה",
              `✅ ההושבה החכמה הושלמה בהצלחה\n\nהושבו: ${data.seatedCount ?? 0}\nלא הושבו: ${data.unseatedCount ?? 0}`
            );
          },
        },
      ]
    );
  }

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onPanResponderGrant: () => {
        panStart.current = { ...view.current };
      },
      onPanResponderMove: (e, g) => {
        const touches = e.nativeEvent.touches;
        if (touches.length >= 2) {
          const dist = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
          );
          if (!pinch.current) {
            pinch.current = { dist, scale: view.current.scale };
            return;
          }
          const next = Math.min(1.8, Math.max(0.12, pinch.current.scale * (dist / pinch.current.dist)));
          view.current = { ...view.current, scale: next };
          setTick((n) => n + 1);
          return;
        }
        const start = panStart.current || view.current;
        view.current = {
          ...view.current,
          x: start.x + g.dx,
          y: start.y + g.dy,
        };
        setTick((n) => n + 1);
      },
      onPanResponderRelease: () => {
        pinch.current = null;
        panStart.current = null;
      },
    })
  ).current;

  const selectedTable = tables.find((table) => table.id === selectedTableId) || null;
  const selectedGuest = guests.find((guest) => guest._id === selectedGuestId) || null;
  const q = guestQuery.trim().toLowerCase();
  const qPhone = phoneKey(guestQuery);
  const visibleGuests = guests.filter((guest) => {
    const seated = seatedIds.has(guest._id);
    if (guestFilter === "seated" && !seated) return false;
    if (guestFilter === "unseated" && seated) return false;
    if (!q) return true;
    return (
      guest.name.toLowerCase().includes(q) ||
      (qPhone && phoneKey(guest.phone || "").includes(qPhone))
    );
  });

  return (
    <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.crown}>
            <Text style={styles.crownText}>♛</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>הושבה באולם</Text>
          </View>
        </View>
        <Pressable style={styles.actionsBtn} onPress={() => setActionsOpen((v) => !v)}>
          <Text style={styles.actionsBtnText}>☰ פעולות</Text>
        </Pressable>
      </View>

      {actionsOpen ? (
        <View style={styles.actionsSheet}>
          <Pressable
            style={styles.sheetBtnWhite}
            onPress={() => {
              setActionsOpen(false);
              router.push("/(app)");
            }}
          >
            <Text style={styles.sheetBtnBrown}>← חזרה לדשבורד</Text>
          </Pressable>
          <Pressable
            style={styles.sheetBtnGold}
            onPress={() => {
              setActionsOpen(false);
              void smartSeat();
            }}
          >
            <Text style={styles.sheetBtnWhiteText}>✨ הושבה חכמה</Text>
          </Pressable>
          <Pressable
            style={styles.sheetBtnNavy}
            onPress={() => {
              setActionsOpen(false);
              setAddOpen(true);
            }}
          >
            <Text style={styles.sheetBtnWhiteText}>+ הוסף שולחן</Text>
          </Pressable>
          <View style={styles.saveHint}>
            <Text style={styles.saveHintText}>{status}</Text>
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View
        style={styles.canvas}
        onLayout={(e) => setCanvasSize(e.nativeEvent.layout)}
        {...pan.panHandlers}
      >
        {background ? (
          <Image source={{ uri: background }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        <View
          style={{
            transform: [
              { translateX: view.current.x },
              { translateY: view.current.y },
              { scale: view.current.scale },
            ],
          }}
        >
          {tables.map((table) => (
            <TableNode
              key={table.id}
              table={table}
              selected={selectedTableId === table.id}
              onPress={() => setSelectedTableId(table.id)}
            />
          ))}
        </View>
      </View>

      <Pressable style={styles.guestsFab} onPress={() => setGuestsOpen(true)}>
        <Text style={styles.guestsFabText}>אורחים</Text>
      </Pressable>

      <Modal visible={guestsOpen} transparent animationType="slide" onRequestClose={() => setGuestsOpen(false)}>
        <View style={styles.drawerWrap}>
          <Pressable style={styles.drawerOverlay} onPress={() => setGuestsOpen(false)} />
          <View style={styles.drawer}>
            <View style={styles.drawerHead}>
              <View>
                <Text style={styles.drawerTitle}>הקצאת מקומות</Text>
                <Text style={styles.drawerSub}>תכנון שולחנות, אורחים וסידור הושבה חכם</Text>
              </View>
              <Pressable onPress={() => setGuestsOpen(false)} style={styles.drawerClose}>
                <Text>✕</Text>
              </Pressable>
            </View>
            <View style={styles.drawerStats}>
              <MiniStat label="סה״כ" value={stats.total} tone="plain" />
              <MiniStat label="הושבו" value={stats.seated} tone="green" />
              <MiniStat label="נשארו" value={stats.remaining} tone="orange" />
            </View>
            <TextInput
              value={guestQuery}
              onChangeText={setGuestQuery}
              placeholder="חיפוש אורח / טלפון / קבוצה"
              placeholderTextColor="#B79B89"
              style={styles.drawerSearch}
            />
            <View style={styles.filterRow}>
              {(["all", "seated", "unseated"] as const).map((key) => (
                <Pressable
                  key={key}
                  onPress={() => setGuestFilter(key)}
                  style={[styles.filterChip, guestFilter === key && styles.filterChipOn]}
                >
                  <Text style={[styles.filterText, guestFilter === key && styles.filterTextOn]}>
                    {key === "all" ? "הכל" : key === "seated" ? "שובצו" : "לא שובצו"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <ScrollView>
              {visibleGuests.map((guest) => {
                const table = tables.find((item) =>
                  item.seatedGuests.some((seat) => String(seat.guestId) === guest._id)
                );
                return (
                  <Pressable
                    key={guest._id}
                    style={styles.guestRow}
                    onPress={() => {
                      setSelectedGuestId(guest._id);
                      setGuestsOpen(false);
                    }}
                  >
                    <Text style={styles.guestName}>{guest.name}</Text>
                    <Text style={styles.guestMeta}>
                      {guest.groupId
                        ? groups.find((group) => group._id === String(guest.groupId))?.name || "חלק מקבוצה"
                        : "ללא קבוצה"}
                    </Text>
                    <Text style={table ? styles.seated : styles.unseated}>
                      {table ? `משובץ · ${table.name}` : "לא משובץ"}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(selectedGuest)} transparent animationType="fade" onRequestClose={() => setSelectedGuestId(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedGuestId(null)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>הקצאת שולחן</Text>
              <Pressable onPress={() => setSelectedGuestId(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>בחר שולחן</Text>
            <ScrollView style={{ maxHeight: 220 }}>
              <Pressable style={styles.tableChoice} onPress={() => selectedGuest && void assignGuest(selectedGuest._id, "")}>
                <Text style={styles.tableChoiceText}>ללא שולחן</Text>
              </Pressable>
              {tables.map((table) => {
                const used = table.seatedGuests.length;
                const free = table.seats - used;
                const needed = selectedGuest ? guestSeatCount(selectedGuest) : 1;
                return (
                  <Pressable
                    key={table.id}
                    disabled={free < needed}
                    style={[styles.tableChoice, free < needed && { opacity: 0.4 }]}
                    onPress={() => selectedGuest && void assignGuest(selectedGuest._id, table.id)}
                  >
                    <Text style={styles.tableChoiceText}>
                      {table.name} · {used}/{table.seats}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {selectedGuest ? (
              <View style={styles.guestDetails}>
                <Text style={styles.fieldLabel}>שם</Text>
                <Text style={styles.guestName}>{selectedGuest.name}</Text>
                <Text style={styles.fieldLabel}>טלפון</Text>
                <Text style={styles.guestMeta}>{selectedGuest.phone || "-"}</Text>
                <Text style={styles.fieldLabel}>מוזמנים</Text>
                <Text style={styles.guestMeta}>{selectedGuest.guestsCount ?? 1}</Text>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(selectedTable)} transparent animationType="fade" onRequestClose={() => setSelectedTableId(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedTableId(null)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>{selectedTable?.name}</Text>
            <Text style={styles.guestMeta}>
              תפוסה {selectedTable?.seatedGuests.length || 0}/{selectedTable?.seats || 0} · פנויים{" "}
              {Math.max(0, (selectedTable?.seats || 0) - (selectedTable?.seatedGuests.length || 0))}
            </Text>
            <Pressable
              style={styles.sheetBtnNavy}
              onPress={() => {
                setSelectedTableId(null);
                setGuestsOpen(true);
                setGuestFilter("unseated");
              }}
            >
              <Text style={styles.sheetBtnWhiteText}>שיבוץ אורח לשולחן</Text>
            </Pressable>
            <ScrollView style={{ maxHeight: 240, marginTop: 12 }}>
              {(selectedTable?.seatedGuests || []).map((seat) => {
                const guest = guests.find((item) => item._id === String(seat.guestId));
                if (!guest) return null;
                return (
                  <View key={`${seat.guestId}-${seat.seatIndex}`} style={styles.guestRow}>
                    <Text style={styles.guestName}>{guest.name}</Text>
                    <Pressable onPress={() => void assignGuest(guest._id, "")}>
                      <Text style={styles.unseated}>הסרה מהשולחן</Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAddOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>הוסף שולחן</Text>
            <View style={styles.filterRow}>
              {TABLE_TYPES.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => setTableType(option.id)}
                  style={[styles.filterChip, tableType === option.id && styles.filterChipOn]}
                >
                  <Text style={[styles.filterText, tableType === option.id && styles.filterTextOn]}>
                    {option.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>מספר מקומות</Text>
            <TextInput
              value={seatsInput}
              onChangeText={setSeatsInput}
              keyboardType="number-pad"
              style={styles.drawerSearch}
            />
            <Pressable style={styles.sheetBtnNavy} onPress={addTable}>
              <Text style={styles.sheetBtnWhiteText}>הוספת שולחן</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "plain" | "green" | "orange";
}) {
  const bg = tone === "green" ? "#ECFDF5" : tone === "orange" ? "#FFF7ED" : "#FFF9ED";
  const fg = tone === "green" ? "#166534" : tone === "orange" ? "#C2410C" : "#2F241D";
  return (
    <View style={[styles.miniStat, { backgroundColor: bg }]}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, { color: fg }]}>{value}</Text>
    </View>
  );
}

function TableNode({
  table,
  selected,
  onPress,
}: {
  table: SeatingTable;
  selected: boolean;
  onPress: () => void;
}) {
  const layout = getTableLayout(table);
  const footprint = tableFootprint(layout);
  const occupied = new Set(table.seatedGuests.map((seat) => Number(seat.seatIndex)));
  const body =
    layout.type === "round"
      ? { width: layout.radius * 2, height: layout.radius * 2, borderRadius: 999 }
      : layout.type === "square"
        ? { width: layout.size, height: layout.size, borderRadius: 10 }
        : { width: layout.width, height: layout.height, borderRadius: 12 };

  return (
    <Pressable
      onPress={onPress}
      style={{
        position: "absolute",
        left: table.x - footprint.width / 2,
        top: table.y - footprint.height / 2,
        width: footprint.width,
        height: footprint.height,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {layout.coords.map((coord, index) => (
        <View
          key={index}
          style={{
            position: "absolute",
            left: footprint.width / 2 + coord.x - 8,
            top: footprint.height / 2 + coord.y - 8,
            width: 16,
            height: 16,
            borderRadius: 4,
            borderWidth: 1,
            backgroundColor: occupied.has(index) ? "#B98A45" : "#FFF9EF",
            borderColor: occupied.has(index) ? "#8B6532" : "#D9C3A2",
          }}
        />
      ))}
      <View
        style={[
          styles.tableBody,
          body,
          selected && { borderColor: "#D7A63F", borderWidth: 2 },
        ]}
      >
        <Text style={styles.tableName} numberOfLines={1}>
          {table.name}
        </Text>
        <Text style={styles.tableCount}>
          {table.seatedGuests.length}/{table.seats}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FAF7F3" },
  header: {
    minHeight: 72,
    paddingHorizontal: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,250,243,0.92)",
    borderBottomWidth: 1,
    borderBottomColor: "#EAD8C8",
  },
  headerRight: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  crown: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7D3B6",
    backgroundColor: "#FFFAF3",
    alignItems: "center",
    justifyContent: "center",
  },
  crownText: { color: "#B78A45", fontSize: 18 },
  headerTitle: { fontFamily: "Heebo_700Bold", fontSize: 20, color: "#2B2119" },
  actionsBtn: {
    height: 44,
    borderRadius: 16,
    backgroundColor: "#17203A",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsBtnText: { color: "#FFFFFF", fontFamily: "Heebo_700Bold" },
  actionsSheet: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#EAD8C8",
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 12,
    gap: 8,
    zIndex: 20,
  },
  sheetBtnWhite: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5D2B8",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBtnBrown: { fontFamily: "Heebo_700Bold", color: "#6F5536" },
  sheetBtnGold: {
    height: 48,
    borderRadius: 16,
    backgroundColor: "#8B6B3E",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBtnNavy: {
    height: 48,
    borderRadius: 16,
    backgroundColor: "#17203A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  sheetBtnWhiteText: { color: "#FFFFFF", fontFamily: "Heebo_700Bold" },
  saveHint: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EADCCA",
    backgroundColor: "#FFFAF3",
    padding: 12,
    alignItems: "center",
  },
  saveHintText: { fontFamily: "Heebo_700Bold", fontSize: 12, color: "#8A765F" },
  error: { textAlign: "right", color: colors.danger, fontFamily: "Heebo_700Bold", padding: 12 },
  canvas: { flex: 1, overflow: "hidden", backgroundColor: "#F4EEE6" },
  guestsFab: {
    position: "absolute",
    left: 20,
    bottom: 28,
    borderRadius: 999,
    backgroundColor: "#2F241D",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  guestsFabText: { color: "#FFFFFF", fontFamily: "Heebo_600SemiBold" },
  drawerWrap: { flex: 1, flexDirection: "row" },
  drawerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  drawer: {
    width: "85%",
    maxWidth: 390,
    height: "100%",
    backgroundColor: "#F7F2EC",
    borderLeftWidth: 1,
    borderLeftColor: "#EAD8CC",
  },
  drawerHead: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EAD8CC",
    backgroundColor: "rgba(255,255,255,0.85)",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  drawerTitle: { fontFamily: "Heebo_700Bold", fontSize: 16, color: "#2F241D", textAlign: "right" },
  drawerSub: { marginTop: 4, fontSize: 11, color: "#8B6F5A", textAlign: "right" },
  drawerClose: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#EAD8CC",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  drawerStats: { flexDirection: "row-reverse", gap: 8, padding: 12 },
  miniStat: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "#EAD8CC", padding: 10, alignItems: "center" },
  miniLabel: { fontSize: 10, color: "#8B6F5A" },
  miniValue: { fontFamily: "Heebo_700Bold", fontSize: 18 },
  drawerSearch: {
    marginHorizontal: 12,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6C3AD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    textAlign: "right",
    color: "#2F241D",
    fontFamily: "Heebo_400Regular",
  },
  filterRow: { flexDirection: "row-reverse", gap: 8, padding: 12, flexWrap: "wrap" },
  filterChip: {
    height: 36,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6C3AD",
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  filterChipOn: { backgroundColor: "#2F241D" },
  filterText: { fontFamily: "Heebo_700Bold", color: "#6B4E3D", fontSize: 12 },
  filterTextOn: { color: "#FFFFFF" },
  guestRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2CDBB",
    backgroundColor: "#FFFFFF",
  },
  guestName: { textAlign: "right", fontFamily: "Heebo_700Bold", color: "#2F241D" },
  guestMeta: { textAlign: "right", color: "#8B6F5A", fontSize: 12, marginTop: 2 },
  seated: { textAlign: "right", color: "#16A34A", fontSize: 12, marginTop: 4, fontFamily: "Heebo_700Bold" },
  unseated: { textAlign: "right", color: "#9CA3AF", fontSize: 12, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 16 },
  modalCard: {
    borderRadius: 20,
    backgroundColor: "#FFF7F2",
    padding: 20,
    borderWidth: 1,
    borderColor: "#EAD8CC",
  },
  modalHead: { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { fontFamily: "Heebo_700Bold", fontSize: 18, color: "#2F241D", textAlign: "right" },
  modalClose: { fontSize: 20, color: "#9CA3AF" },
  fieldLabel: { textAlign: "right", color: "#6B7280", fontSize: 12, marginTop: 8, marginBottom: 6 },
  tableChoice: {
    borderWidth: 1,
    borderColor: "#E5D2B8",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  tableChoiceText: { textAlign: "right", fontFamily: "Heebo_700Bold", color: "#2F241D" },
  guestDetails: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EAD8CC",
    padding: 12,
  },
  tableBody: {
    backgroundColor: "#FFF9ED",
    borderWidth: 1.4,
    borderColor: "#D9C4A4",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  tableName: { fontFamily: "Heebo_700Bold", fontSize: 11, color: "#2B2119" },
  tableCount: { fontSize: 10, color: "#8B6F5A", fontFamily: "Heebo_600SemiBold" },
});
