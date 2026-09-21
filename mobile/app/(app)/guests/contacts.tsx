import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Contact,
  ContactField,
  getPermissionsAsync,
  requestPermissionsAsync,
  type ExistingEmail,
  type ExistingPhone,
} from "expo-contacts";
import { router } from "expo-router";
import { useEventData } from "@/src/event";
import { useImportDraft, type ImportRow } from "@/src/importDraft";
import { displayPhone, phoneKey, phonesMatch, preferPhone } from "@/src/phones";
import { Card, EmptyState, Page, PrimaryButton } from "@/src/ui";
import { colors } from "@/src/theme";

type DeviceContact = {
  id: string;
  fullName?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  phones?: ExistingPhone[];
  emails?: ExistingEmail[];
};

type Selection = {
  contactId: string;
  name: string;
  phone: string;
  email: string;
};

const FIELDS = [
  ContactField.FULL_NAME,
  ContactField.GIVEN_NAME,
  ContactField.FAMILY_NAME,
  ContactField.PHONES,
  ContactField.EMAILS,
] as const;

export default function ContactsImportScreen() {
  const { guests } = useEventData();
  const { setRows } = useImportDraft();
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, Selection>>({});
  const [picking, setPicking] = useState<DeviceContact | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const current = await getPermissionsAsync();
    if (current.status !== "granted") {
      const asked = await requestPermissionsAsync();
      if (asked.status !== "granted") {
        setPermission("denied");
        return;
      }
    }
    setPermission("granted");
    const all: DeviceContact[] = [];
    const pageSize = 300;
    let offset = 0;
    while (true) {
      const page = await Contact.getAllDetails(FIELDS, { limit: pageSize, offset });
      all.push(...page);
      if (page.length < pageSize) break;
      offset += page.length;
    }
    setContacts(all.filter((contact) => contact.id));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qPhone = phoneKey(query);
    if (!q) return contacts;
    return contacts.filter((contact) => {
      const name = contactName(contact).toLowerCase();
      const phones = (contact.phones || []).some((item) =>
        qPhone ? phoneKey(item.number || "").includes(qPhone) : false
      );
      return name.includes(q) || phones;
    });
  }, [contacts, query]);

  function choose(contact: DeviceContact, phone: string) {
    const id = contact.id;
    setSelected((current) => ({
      ...current,
      [id]: {
        contactId: id,
        name: contactName(contact),
        phone: displayPhone(phone),
        email: contact.emails?.[0]?.address || "",
      },
    }));
    setPicking(null);
  }

  function toggle(contact: DeviceContact) {
    const id = contact.id;
    if (selected[id]) {
      setSelected((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    const numbers = (contact.phones || []).filter((item) => item.number);
    if (numbers.length > 1) {
      setPicking(contact);
      return;
    }
    const preferred = preferPhone(contact.phones);
    if (!preferred?.number) return;
    choose(contact, preferred.number);
  }

  function selectAll() {
    setSelected((current) => {
      const next = { ...current };
      for (const contact of filtered) {
        if (next[contact.id]) continue;
        const preferred = preferPhone(contact.phones);
        if (!preferred?.number) continue;
        next[contact.id] = {
          contactId: contact.id,
          name: contactName(contact),
          phone: displayPhone(preferred.number),
          email: contact.emails?.[0]?.address || "",
        };
      }
      return next;
    });
  }

  function continueToPreview() {
    const picks = Object.values(selected);
    if (!picks.length) {
      setError("בחרו לפחות איש קשר אחד");
      return;
    }
    const rows: ImportRow[] = picks.map((pick) => {
      const existing = guests.find((guest) => phonesMatch(guest.phone || "", pick.phone));
      const sibling = picks.find(
        (other) => other.contactId !== pick.contactId && phonesMatch(other.phone, pick.phone)
      );
      const duplicate = Boolean(existing || sibling);
      return {
        key: pick.contactId,
        name: pick.name,
        phone: pick.phone,
        email: pick.email,
        selected: !duplicate,
        duplicate,
        duplicateReason: existing
          ? `כבר קיים באירוע: ${existing.name}`
          : sibling
            ? "מספר זהה נבחר יותר מפעם אחת"
            : "",
      };
    });
    setRows(rows);
    router.push("/(app)/guests/preview");
  }

  if (permission === "denied") {
    return (
      <Page>
        <EmptyState text="אין גישה לאנשי הקשר. אפשר להפעיל את ההרשאה בהגדרות המכשיר, או להמשיך להוסיף מוזמנים ידנית. שאר האפליקציה נשארת זמינה." />
        <PrimaryButton label="פתיחת הגדרות" onPress={() => void Linking.openSettings()} />
        <View style={{ height: 10 }} />
        <PrimaryButton label="הוספה ידנית" onPress={() => router.replace("/(app)/guests/add")} />
      </Page>
    );
  }

  if (permission !== "granted") {
    return (
      <Page>
        <EmptyState text="מבקשים הרשאה לקרוא אנשי קשר. נשלחים לשרת רק אנשי קשר שתבחרו ותאשרו." />
      </Page>
    );
  }

  const selectedCount = Object.keys(selected).length;

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
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Pressable onPress={selectAll} style={styles.action}>
            <Text style={styles.actionText}>בחירת הכל</Text>
          </Pressable>
          <Pressable onPress={() => setSelected({})} style={styles.action}>
            <Text style={styles.actionText}>ניקוי בחירה</Text>
          </Pressable>
        </View>
        <Text style={styles.count}>נבחרו {selectedCount} אנשי קשר</Text>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const pick = selected[item.id];
          const numbers = item.phones || [];
          return (
            <Pressable onPress={() => toggle(item)}>
              <Card style={pick ? styles.selectedCard : undefined}>
                <Text style={styles.name}>{contactName(item)}</Text>
                <Text style={styles.meta}>
                  {pick
                    ? pick.phone
                    : numbers.length
                      ? numbers.map((number) => displayPhone(number.number || "")).join(" · ")
                      : "אין מספר טלפון"}
                </Text>
                {pick?.email ? <Text style={styles.meta}>{pick.email}</Text> : null}
              </Card>
            </Pressable>
          );
        }}
      />
      <View style={styles.footer}>
        <PrimaryButton
          label={`המשך לתצוגה מקדימה (${selectedCount})`}
          onPress={continueToPreview}
          disabled={!selectedCount}
        />
      </View>
      <Modal visible={Boolean(picking)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.name}>בחירת מספר עבור {picking ? contactName(picking) : ""}</Text>
            {(picking?.phones || []).map((number) => (
              <Pressable
                key={number.id}
                style={styles.phoneChoice}
                onPress={() => picking && number.number && choose(picking, number.number)}
              >
                <Text style={styles.meta}>{number.label || "טלפון"}</Text>
                <Text style={styles.name}>{displayPhone(number.number || "")}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setPicking(null)}>
              <Text style={styles.cancel}>ביטול</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function contactName(contact: DeviceContact) {
  return (
    contact.fullName ||
    [contact.givenName, contact.familyName].filter(Boolean).join(" ") ||
    "ללא שם"
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
  actions: { flexDirection: "row-reverse", gap: 8, marginTop: 10 },
  action: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  actionText: { fontFamily: "Heebo_600SemiBold", color: colors.ink },
  count: { textAlign: "right", marginVertical: 10, fontFamily: "Heebo_700Bold", color: colors.brownText },
  list: { padding: 16 },
  name: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText, fontSize: 16 },
  meta: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular", marginTop: 2 },
  selectedCard: { borderColor: colors.gold, backgroundColor: colors.goldSoft },
  footer: { padding: 16, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  error: { textAlign: "right", color: colors.danger, marginTop: 8, fontFamily: "Heebo_500Medium" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(30,27,46,0.45)" },
  modal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },
  phoneChoice: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancel: { textAlign: "center", marginTop: 16, color: colors.muted, fontFamily: "Heebo_700Bold" },
});
