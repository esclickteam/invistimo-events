import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, type Href } from "expo-router";
import { api } from "@/src/api";
import { messageFromApi } from "@/src/format";
import { Card, EmptyState, ErrorText, Field, OutlineButton, Page, PrimaryButton } from "@/src/ui";
import { colors } from "@/src/theme";

const LIST_KEYS = [
  "customers",
  "users",
  "employees",
  "staff",
  "clients",
  "leads",
  "workOrders",
  "orders",
  "recordings",
  "rounds",
      "employees",
  "halls",
  "events",
  "shifts",
  "sales",
  "files",
  "menus",
  "templates",
  "routes",
  "registrations",
  "tasks",
  "messages",
  "items",
  "rows",
  "data",
];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function extractList(data: unknown): Record<string, unknown>[] {
  const root = asRecord(data);
  if (!root) return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  for (const key of LIST_KEYS) {
    const value = root[key];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
  }
  if (Array.isArray(root.results)) return root.results as Record<string, unknown>[];
  return [];
}

export function recordId(item: Record<string, unknown>) {
  return String(item._id || item.id || item.userId || item.email || "");
}

export function recordTitle(item: Record<string, unknown>) {
  return String(
    item.fullName ||
      item.name ||
      item.clientName ||
      item.title ||
      item.eventName ||
      item.email ||
      item.phone ||
      "רשומה"
  );
}

export function recordMeta(item: Record<string, unknown>, keys: string[]) {
  return keys
    .map((key) => {
      const value = item[key];
      if (value == null || value === "") return "";
      if (typeof value === "object") return "";
      return String(value);
    })
    .filter(Boolean)
    .join(" · ");
}

export function money(value: unknown) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("he-IL")} ₪`;
}

export function RecordsScreen({
  title,
  path,
  query,
  metaKeys = ["email", "phone", "status", "packageName", "role"],
  hrefForItem,
  emptyText = "אין רשומות להצגה.",
}: {
  title?: string;
  path: string;
  query?: string;
  metaKeys?: string[];
  hrefForItem?: (item: Record<string, unknown>) => Href | null;
  emptyText?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const url = query ? `${path}${path.includes("?") ? "&" : "?"}${query}` : path;
      const result = await api<Record<string, unknown>>(url);
      if (!result.ok) {
        setError(messageFromApi(result.data, "אין הרשאה או שהטעינה נכשלה"));
        setItems([]);
        return;
      }
      setItems(extractList(result.data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "הטעינה נכשלה");
    } finally {
      setLoading(false);
    }
  }, [path, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
  }, [items, search]);

  return (
    <Page refreshing={loading} onRefresh={() => void load()}>
      {title ? <Text style={styles.heading}>{title}</Text> : null}
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="חיפוש"
        placeholderTextColor={colors.soft}
        style={styles.search}
      />
      <ErrorText text={error} />
      {!visible.length && !loading ? <EmptyState text={emptyText} /> : null}
      {visible.map((item) => {
        const id = recordId(item);
        const href = hrefForItem?.(item);
        return (
          <Pressable
            key={id || recordTitle(item)}
            onPress={() => {
              if (href) router.push(href);
            }}
            disabled={!href}
          >
            <Card>
              <Text style={styles.title}>{recordTitle(item)}</Text>
              {recordMeta(item, metaKeys) ? (
                <Text style={styles.meta}>{recordMeta(item, metaKeys)}</Text>
              ) : null}
            </Card>
          </Pressable>
        );
      })}
    </Page>
  );
}

export function RecordDetailScreen({
  path,
  fields,
  actions,
}: {
  path: string;
  fields: Array<{ key: string; label: string }>;
  actions?: Array<{ label: string; onPress: (record: Record<string, unknown>) => void }>;
}) {
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api<Record<string, unknown>>(path);
      if (!result.ok) {
        setError(messageFromApi(result.data, "אין הרשאה לצפות בפריט הזה"));
        setRecord(null);
        return;
      }
      const data = result.data;
      setRecord(
        asRecord(data.customer) ||
          asRecord(data.user) ||
          asRecord(data.employee) ||
          asRecord(data.lead) ||
          asRecord(data.event) ||
          asRecord(data.workOrder) ||
          asRecord(data)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "הטעינה נכשלה");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Page refreshing={loading} onRefresh={() => void load()}>
      <ErrorText text={error} />
      {!record && !loading ? <EmptyState text="הרשומה לא נמצאה." /> : null}
      {record
        ? fields.map((field) => (
            <Card key={field.key}>
              <Text style={styles.meta}>{field.label}</Text>
              <Text style={styles.title}>{String(record[field.key] ?? "—")}</Text>
            </Card>
          ))
        : null}
      {record
        ? (actions || []).map((action) => (
            <OutlineButton key={action.label} label={action.label} onPress={() => action.onPress(record)} />
          ))
        : null}
    </Page>
  );
}

export function SaveTextScreen({
  path,
  field,
  title,
  helper,
  method = "PUT",
}: {
  path: string;
  field: string;
  title: string;
  helper?: string;
  method?: string;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void api<Record<string, unknown>>(path).then((result) => {
      if (!result.ok) {
        setError(messageFromApi(result.data, "אין הרשאה"));
        return;
      }
      setValue(String(result.data[field] || result.data.body || result.data.template || ""));
    });
  }, [field, path]);

  return (
    <Page>
      <Text style={styles.heading}>{title}</Text>
      {helper ? <Text style={styles.meta}>{helper}</Text> : null}
      <ErrorText text={error} />
      {saved ? <Text style={styles.ok}>{saved}</Text> : null}
      <Field label={title} value={value} onChangeText={setValue} multiline />
      <PrimaryButton
        label="שמירה"
        loading={loading}
        onPress={() => {
          void (async () => {
            setLoading(true);
            setError("");
            setSaved("");
            const result = await api(path, {
              method,
              body: JSON.stringify({ [field]: value, reminderSmsBody: value, body: value }),
            });
            setLoading(false);
            if (!result.ok) {
              setError(messageFromApi(result.data, "השמירה נכשלה"));
              return;
            }
            setSaved("נשמר");
          })();
        }}
      />
    </Page>
  );
}

export function StatsGrid({ items }: { items: Array<{ title: string; value: string; subtitle?: string }> }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <Card key={item.title} style={styles.stat}>
          <Text style={styles.meta}>{item.title}</Text>
          <Text style={styles.statValue}>{item.value}</Text>
          {item.subtitle ? <Text style={styles.meta}>{item.subtitle}</Text> : null}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    textAlign: "right",
    fontFamily: "Heebo_700Bold",
    fontSize: 24,
    color: colors.brownText,
    marginBottom: 12,
  },
  title: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText, fontSize: 16 },
  meta: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular", marginTop: 4 },
  ok: { textAlign: "right", color: colors.yes, fontFamily: "Heebo_700Bold", marginBottom: 8 },
  search: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    textAlign: "right",
    marginBottom: 12,
    fontFamily: "Heebo_400Regular",
    color: colors.brownText,
  },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between" },
  stat: { width: "48%" },
  statValue: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 22, color: colors.brownText },
});
