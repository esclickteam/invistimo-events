import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/src/api";
import { messageFromApi } from "@/src/format";
import { money, StatsGrid } from "@/src/records";
import { Card, ErrorText, OutlineButton, Page } from "@/src/ui";
import { colors } from "@/src/theme";

const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

type PayingCustomer = {
  email?: string;
  name?: string;
  packageName?: string;
  totalPaid?: number;
};

type Upcoming = {
  total?: number;
  today?: number;
  tomorrow?: number;
  week?: number;
  month?: number;
  rounds?: Array<{
    id?: string;
    clientName?: string;
    eventName?: string;
    scheduledAt?: string;
    roundNumber?: number;
    guestsWaiting?: number;
  }>;
};

type AdminStats = {
  users?: number;
  invitations?: number;
  calls?: number;
  revenue?: number;
  payingUsers?: number;
  paymentsCount?: number;
  payingCustomers?: PayingCustomer[];
  rangeSummary?: { revenue?: number; customers?: number; paymentsCount?: number };
};

export default function AdminOverview() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [upcoming, setUpcoming] = useState<Upcoming | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPaying, setShowPaying] = useState(false);
  const [showRounds, setShowRounds] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      month: String(month),
      year: String(year),
      fromDay: "1",
      fromMonth: "1",
      fromYear: String(year),
      toDay: "31",
      toMonth: "12",
      toYear: String(year),
    });
    const [statsResult, roundsResult] = await Promise.all([
      api<AdminStats>(`/api/admin/stats?${params}`),
      api<Upcoming>("/api/admin/call-rounds/upcoming?days=30"),
    ]);
    if (!statsResult.ok) setError(messageFromApi(statsResult.data, "אין הרשאת מנהל"));
    else setStats(statsResult.data);
    if (roundsResult.ok) setUpcoming(roundsResult.data);
    setLoading(false);
  }, [month, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const averagePayment = useMemo(() => {
    const count = Number(stats?.paymentsCount || 0);
    const revenue = Number(stats?.revenue || 0);
    return count ? Math.round(revenue / count) : 0;
  }, [stats]);

  function shiftMonth(delta: number) {
    const date = new Date(year, month - 1 + delta, 1);
    setMonth(date.getMonth() + 1);
    setYear(date.getFullYear());
  }

  const monthTitle = `${MONTHS[month - 1]} ${year}`;

  return (
    <Page refreshing={loading} onRefresh={() => void load()}>
      <Text style={styles.kicker}>Admin Panel</Text>
      <Text style={styles.h1}>סקירת מערכת</Text>
      <Text style={styles.lede}>
        דשבורד ניהול מקצועי עם הכנסות חודשיות, לקוחות משלמים, חבילות, תשלומים, אירועים עתידיים וסיכום הכנסות לפי טווח.
      </Text>
      <ErrorText text={error} />
      <Card>
        <Text style={styles.meta}>חודש הכנסות</Text>
        <Text style={styles.h2}>{monthTitle}</Text>
        <View style={styles.row}>
          <OutlineButton label="חודש קודם" onPress={() => shiftMonth(-1)} />
          <OutlineButton label="חודש הבא" onPress={() => shiftMonth(1)} />
        </View>
      </Card>
      <Card>
        <Text style={styles.meta}>הכנסה חודשית</Text>
        <Text style={styles.revenue}>{loading ? "—" : money(stats?.revenue)}</Text>
        <Text style={styles.meta}>לפי תשלומים בפועל בחודש {monthTitle}</Text>
      </Card>
      <StatsGrid
        items={[
          { title: "לקוחות משלמים", value: String(stats?.payingUsers ?? "—") },
          { title: "תשלומים", value: String(stats?.paymentsCount ?? "—") },
          { title: "ממוצע לתשלום", value: money(averagePayment) },
          { title: "משתמשים פעילים", value: String(stats?.users ?? "—"), subtitle: "משתמשים שקיימים כרגע במערכת" },
          { title: "אירועים פעילים", value: String(stats?.invitations ?? "—"), subtitle: "אירועים עתידיים בלבד" },
          { title: "שירותי שיחות", value: String(stats?.calls ?? "—"), subtitle: "לקוחות עם שירות שיחות פעיל" },
          { title: "סבבים קרובים", value: String(upcoming?.total ?? "—"), subtitle: "סבבי שיחות לחודש הקרוב" },
          { title: "הכנסות החודש", value: loading ? "—" : money(stats?.revenue), subtitle: `תשלומים ב-${monthTitle}` },
        ]}
      />
      <Card>
        <Text style={styles.h2}>סיכום הכנסות בין חודשים ושנים</Text>
        <Text style={styles.meta}>הכנסה בטווח: {money(stats?.rangeSummary?.revenue)}</Text>
        <Text style={styles.meta}>לקוחות בטווח: {String(stats?.rangeSummary?.customers ?? 0)}</Text>
        <Text style={styles.meta}>תשלומים בטווח: {String(stats?.rangeSummary?.paymentsCount ?? 0)}</Text>
      </Card>
      <Pressable onPress={() => setShowPaying((value) => !value)}>
        <Text style={styles.link}>לקוחות משלמים</Text>
      </Pressable>
      {showPaying
        ? (stats?.payingCustomers || []).map((customer) => (
            <Card key={customer.email}>
              <Text style={styles.title}>{customer.name || customer.email}</Text>
              <Text style={styles.meta}>
                {[customer.packageName, money(customer.totalPaid)].filter(Boolean).join(" · ")}
              </Text>
            </Card>
          ))
        : null}
      <Pressable onPress={() => setShowRounds((value) => !value)}>
        <Text style={styles.link}>סבבים קרובים · היום {upcoming?.today ?? 0} · מחר {upcoming?.tomorrow ?? 0}</Text>
      </Pressable>
      {showRounds
        ? (upcoming?.rounds || []).map((round) => (
            <Card key={round.id}>
              <Text style={styles.title}>{round.clientName || round.eventName}</Text>
              <Text style={styles.meta}>
                {[round.eventName, round.scheduledAt, `סבב ${round.roundNumber || ""}`, `ממתינים ${round.guestsWaiting || 0}`]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </Card>
          ))
        : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  kicker: { textAlign: "right", color: colors.gold, fontFamily: "Heebo_700Bold", fontSize: 11 },
  h1: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 32, color: colors.brownText },
  h2: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 20, color: colors.brownText, marginTop: 4 },
  lede: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular", marginBottom: 12, lineHeight: 22 },
  meta: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular", marginTop: 4 },
  revenue: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 36, color: colors.brownText },
  title: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText },
  row: { marginTop: 8 },
  link: { textAlign: "right", color: colors.gold, fontFamily: "Heebo_700Bold", marginVertical: 8 },
});
