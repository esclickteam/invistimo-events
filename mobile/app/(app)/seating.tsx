import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/src/api";
import { useEventData } from "@/src/event";
import { messageFromApi } from "@/src/format";
import { Card, EmptyState, ErrorText, Page, StatusPill } from "@/src/ui";
import { colors } from "@/src/theme";

type TableItem = {
  id: string;
  label: string;
  capacity?: number;
};

export default function SeatingScreen() {
  const { invitation, event, guests, refresh } = useEventData();
  const eventId = String(invitation?.eventId || event?._id || "");
  const [tables, setTables] = useState<TableItem[]>([]);
  const [error, setError] = useState("");
  const [activeGuest, setActiveGuest] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    void api<{ success?: boolean; tables?: unknown[]; error?: string; message?: string }>(
      `/api/seating/tables/${eventId}`
    ).then((result) => {
      if (!result.ok) {
        setError(messageFromApi(result.data, "אין הרשאה להושבה או שאין סידור שמור"));
        return;
      }
      setTables(
        (result.data.tables || []).map((table, index) => {
          const row = table as Record<string, unknown>;
          const number = row.tableNumber ?? row.number ?? index + 1;
          return {
            id: String(row._id || row.id || row.tableNumber || row.number || index + 1),
            label: String(row.name || `שולחן ${number}`),
            capacity: Number(row.capacity || row.seats || row.seatCount || 0) || undefined,
          };
        })
      );
    });
  }, [eventId]);

  async function assign(guestId: string, tableId: string) {
    setError("");
    const result = await api("/api/seating/live/move-guest-table", {
      method: "PATCH",
      body: JSON.stringify({ eventId, guestId, toTableId: tableId }),
    });
    if (!result.ok) {
      setError(messageFromApi(result.data, "לא הצלחנו לשבץ את המוזמן"));
      return;
    }
    setActiveGuest(null);
    await refresh();
  }

  return (
    <Page refreshing={false} onRefresh={() => void refresh()}>
      <Text style={styles.lead}>
        שיבוץ מוזמנים לשולחנות נשמר באותו סידור הושבה של האתר. מפת הקנבס המלאה נשארת באתר.
      </Text>
      <ErrorText text={error} />
      {!tables.length ? <EmptyState text="עדיין אין שולחנות שמורים לאירוע." /> : null}
      {guests.map((guest) => (
        <Card key={guest._id}>
          <Pressable onPress={() => setActiveGuest(activeGuest === guest._id ? null : guest._id)}>
            <View style={styles.row}>
              <StatusPill status={guest.rsvp} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{guest.name}</Text>
                <Text style={styles.meta}>{guest.tableName || "ללא שולחן"}</Text>
              </View>
            </View>
          </Pressable>
          {activeGuest === guest._id ? (
            <View style={styles.tables}>
              {tables.map((table) => (
                <Pressable key={table.id} style={styles.table} onPress={() => void assign(guest._id, table.id)}>
                  <Text style={styles.tableText}>
                    {table.label}
                    {table.capacity ? ` · ${table.capacity}` : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Card>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  lead: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular", marginBottom: 12, lineHeight: 22 },
  row: { flexDirection: "row-reverse", gap: 10, alignItems: "center" },
  name: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText },
  meta: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular" },
  tables: { marginTop: 10, gap: 8 },
  table: {
    backgroundColor: colors.goldSoft,
    borderRadius: 14,
    padding: 10,
  },
  tableText: { textAlign: "right", fontFamily: "Heebo_600SemiBold", color: colors.brownText },
});
