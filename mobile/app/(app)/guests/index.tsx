import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useEventData } from "@/src/event";
import { type Guest } from "@/src/api";
import { phoneKey } from "@/src/phones";
import { Card, PrimaryButton, StatusPill } from "@/src/ui";
import { colors } from "@/src/theme";

export default function GuestsScreen() {
  const { guests, loading, refresh, usage } = useEventData();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qPhone = phoneKey(query);
    if (!q) return guests;
    return guests.filter((guest) => {
      const name = guest.name.toLowerCase();
      const phone = phoneKey(guest.phone || "");
      return name.includes(q) || (qPhone && phone.includes(qPhone));
    });
  }, [guests, query]);

  return (
    <View style={styles.page}>
      <View style={styles.toolbar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="חיפוש לפי שם או טלפון"
          placeholderTextColor={colors.soft}
          style={styles.search}
        />
        <Text style={styles.count}>
          {filtered.length} מוזמנים
          {usage?.limit ? ` · נותרו ${usage.remaining ?? 0}` : ""}
        </Text>
        <PrimaryButton label="הוספת מוזמן" onPress={() => router.push("/(app)/guests/add")} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        refreshing={loading}
        onRefresh={() => void refresh()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Card>
            <Text style={styles.empty}>עדיין אין מוזמנים באירוע, או שהחיפוש לא מצא התאמה.</Text>
          </Card>
        }
        renderItem={({ item }) => <GuestRow guest={item} />}
      />
    </View>
  );
}

function GuestRow({ guest }: { guest: Guest }) {
  return (
    <Pressable onPress={() => router.push(`/(app)/guests/${guest._id}`)}>
      <Card>
        <View style={styles.row}>
          <StatusPill status={guest.rsvp} />
          <View style={styles.rowText}>
            <Text style={styles.name}>{guest.name}</Text>
            <Text style={styles.meta}>
              {[guest.phone, guest.relation, guest.tableName].filter(Boolean).join(" · ")}
            </Text>
            <Text style={styles.meta}>{guest.guestsCount || 1} מוזמנים ברשומה</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  toolbar: { padding: 16, paddingBottom: 0 },
  search: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: "right",
    fontFamily: "Heebo_400Regular",
    color: colors.brownText,
  },
  count: {
    textAlign: "right",
    marginVertical: 10,
    color: colors.muted,
    fontFamily: "Heebo_500Medium",
  },
  list: { padding: 16, paddingTop: 12 },
  empty: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_500Medium" },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  rowText: { flex: 1 },
  name: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 16, color: colors.brownText },
  meta: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular", marginTop: 2 },
});
