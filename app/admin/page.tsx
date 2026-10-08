"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Users,
  CalendarDays,
  PhoneCall,
  Wallet,
  Loader2,
  X,
  ReceiptText,
  CreditCard,
  Search,
  CalendarRange,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import {
  AdminAlert,
  AdminBadge,
  AdminButton,
  AdminEmptyState,
  AdminFilterBar,
  AdminPanel,
  AdminStatCard,
  AdminTableShell,
} from "@/app/components/admin/ui/AdminUI";

/* =====================================================
   TYPES
===================================================== */
interface PayingCustomer {
  email: string;
  name?: string;
  packageName?: string;
  maxGuests?: number | null;
  totalPaid: number;
  paymentsCount: number;
  lastPaymentAt?: string | null;
  types?: string[];
  hasCallsAddon?: boolean;
  hasCreditGiftsAddon?: boolean;
}

interface RangeMonthItem {
  year: number;
  month: number;
  revenue: number;
  paymentsCount: number;
}

interface RangeTypeItem {
  type: string;
  revenue: number;
  paymentsCount: number;
}

interface RangeSummary {
  fromDay: number;
  fromMonth: number;
  fromYear: number;
  toDay: number;
  toMonth: number;
  toYear: number;
  revenue: number;
  customers: number;
  paymentsCount: number;
  monthlyBreakdown: RangeMonthItem[];
  byType: RangeTypeItem[];
}

interface UpcomingCallRound {
  id: string;
  userId: string;
  invitationId: string;
  clientName: string;
  clientEmail: string;
  eventName: string;
  eventDate?: string | null;
  roundNumber: number;
  scheduledAt: string;
  status: string;
  guestsWaiting: number;
  guestsDone: number;
}

interface UpcomingCallRoundsResponse {
  success: boolean;
  total: number;
  today: number;
  tomorrow: number;
  week: number;
  month: number;
  rounds: UpcomingCallRound[];
}

interface AdminStats {
  users: number;
  invitations: number;
  calls: number;
  revenue: number;
  payingUsers?: number;
  payingCustomers?: PayingCustomer[];
  paymentsCount?: number;
  callsRevenue?: number;
  creditGiftsRevenue?: number;
  month: number;
  year: number;
  rangeSummary?: RangeSummary;
}

const MONTHS = [
  { value: 1, label: "ינואר" },
  { value: 2, label: "פברואר" },
  { value: 3, label: "מרץ" },
  { value: 4, label: "אפריל" },
  { value: 5, label: "מאי" },
  { value: 6, label: "יוני" },
  { value: 7, label: "יולי" },
  { value: 8, label: "אוגוסט" },
  { value: 9, label: "ספטמבר" },
  { value: 10, label: "אוקטובר" },
  { value: 11, label: "נובמבר" },
  { value: 12, label: "דצמבר" },
];

const DAYS = Array.from({ length: 31 }, (_, index) => ({
  value: index + 1,
  label: String(index + 1),
}));

const AUTO_REFRESH_MS = 10000;

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}

function getMonthName(month: number) {
  return MONTHS.find((item) => item.value === month)?.label || String(month);
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("he-IL")} ₪`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getDateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDate(a: Date, b: Date) {
  return getDateOnly(a).getTime() === getDateOnly(b).getTime();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfCurrentWeek(date: Date) {
  const start = getDateOnly(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function startOfNextWeek(date: Date) {
  return addDays(startOfCurrentWeek(date), 7);
}

function startOfNextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function getRelativeDayLabel(value?: string | null) {
  if (!value) return "לא הוגדר";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "לא הוגדר";
  const today = getDateOnly(new Date());
  const target = getDateOnly(date);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "היום";
  if (diffDays === 1) return "מחר";
  if (diffDays === 2) return "מחרתיים";
  return date.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

function getHourLabel(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPaymentTypeLabel(type: string) {
  const labels: Record<string, string> = {
    package: "חבילה",
    addon: "תוספת",
    upgrade: "שדרוג",
    deposit: "מקדמה",
    full: "תשלום מלא",
    balance: "יתרה",
    manual: "ידני",
    legacy: "היסטורי",
    "producer-client": "לקוח מפיק",
    other: "אחר",
  };
  return labels[type] || type;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayingCustomers, setShowPayingCustomers] = useState(false);
  const [showUpcomingCalls, setShowUpcomingCalls] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [upcomingCalls, setUpcomingCalls] =
    useState<UpcomingCallRoundsResponse | null>(null);
  const [loadingUpcomingCalls, setLoadingUpcomingCalls] = useState(true);

  const [selectedDate, setSelectedDate] = useState(
    () => new Date(Date.UTC(2026, 0, 1))
  );
  const [currentYear, setCurrentYear] = useState(2026);
  const [fromDay, setFromDay] = useState(1);
  const [fromMonth, setFromMonth] = useState(1);
  const [fromYear, setFromYear] = useState(2026);
  const [toDay, setToDay] = useState(31);
  const [toMonth, setToMonth] = useState(12);
  const [toYear, setToYear] = useState(2026);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    setSelectedDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setCurrentYear(year);
    setFromYear(year);
    setToYear(year);
  }, []);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let year = currentYear - 3; year <= currentYear + 5; year++) {
      years.push(year);
    }
    return years;
  }, [currentYear]);

  const selectedMonth = selectedDate.getMonth() + 1;
  const selectedYear = selectedDate.getFullYear();
  const monthTitle = useMemo(() => getMonthLabel(selectedDate), [selectedDate]);
  const isCurrentMonth = useMemo(() => {
    const realNow = new Date();
    return (
      selectedDate.getFullYear() === realNow.getFullYear() &&
      selectedDate.getMonth() === realNow.getMonth()
    );
  }, [selectedDate]);

  const payingCustomers = useMemo(() => {
    const list = stats?.payingCustomers || [];
    const q = customerSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((customer) => {
      const email = String(customer.email || "").toLowerCase();
      const name = String(customer.name || "").toLowerCase();
      const packageName = String(customer.packageName || "").toLowerCase();
      return email.includes(q) || name.includes(q) || packageName.includes(q);
    });
  }, [stats?.payingCustomers, customerSearch]);

  const averagePayment = useMemo(() => {
    const paymentsCount = Number(stats?.paymentsCount || 0);
    const revenue = Number(stats?.revenue || 0);
    if (!paymentsCount) return 0;
    return Math.round(revenue / paymentsCount);
  }, [stats?.paymentsCount, stats?.revenue]);

  const rangeAverageMonthlyRevenue = useMemo(() => {
    const revenue = Number(stats?.rangeSummary?.revenue || 0);
    const fromIndex = fromYear * 12 + (fromMonth - 1);
    const toIndex = toYear * 12 + (toMonth - 1);
    const monthsCount = Math.max(0, toIndex - fromIndex + 1);
    if (!monthsCount) return 0;
    return Math.round(revenue / monthsCount);
  }, [stats?.rangeSummary?.revenue, fromMonth, fromYear, toMonth, toYear]);

  const upcomingCallRounds = useMemo(
    () => upcomingCalls?.rounds || [],
    [upcomingCalls?.rounds]
  );

  const nearestCallRound = useMemo(() => {
    if (!upcomingCallRounds.length) return null;
    return [...upcomingCallRounds].sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )[0];
  }, [upcomingCallRounds]);

  const maxMonthlyRevenue = useMemo(() => {
    const list = stats?.rangeSummary?.monthlyBreakdown || [];
    return Math.max(1, ...list.map((item) => Number(item.revenue || 0)));
  }, [stats?.rangeSummary?.monthlyBreakdown]);

  async function fetchStats(showLoader = true) {
    try {
      if (showLoader) setLoading(true);
      const params = new URLSearchParams({
        month: String(selectedMonth),
        year: String(selectedYear),
        fromDay: String(fromDay),
        fromMonth: String(fromMonth),
        fromYear: String(fromYear),
        toDay: String(toDay),
        toMonth: String(toMonth),
        toYear: String(toYear),
      });
      const res = await fetch(`/api/admin/stats?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      setStats(await res.json());
    } catch (err) {
      console.error("❌ Failed to load admin stats:", err);
      setStats(null);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function fetchUpcomingCallRounds(showLoader = true) {
    try {
      if (showLoader) setLoadingUpcomingCalls(true);
      const res = await fetch("/api/admin/call-rounds/upcoming?days=30", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to fetch upcoming call rounds");
      }
      setUpcomingCalls(data);
    } catch (err) {
      console.error("❌ Failed to load upcoming call rounds:", err);
      setUpcomingCalls({
        success: false,
        total: 0,
        today: 0,
        tomorrow: 0,
        week: 0,
        month: 0,
        rounds: [],
      });
    } finally {
      if (showLoader) setLoadingUpcomingCalls(false);
    }
  }

  useEffect(() => {
    fetchStats(true);
    fetchUpcomingCallRounds(true);
    const intervalId = window.setInterval(() => {
      fetchStats(false);
      fetchUpcomingCallRounds(false);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedMonth,
    selectedYear,
    fromDay,
    fromMonth,
    fromYear,
    toDay,
    toMonth,
    toYear,
  ]);

  return (
    <div dir="rtl" className="space-y-4">
      {/* Compact month controls — header title comes from layout */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-[var(--admin-muted)] md:hidden">
          נתוני פעילות וסקירה עסקית
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <AdminButton
            size="sm"
            variant="secondary"
            onClick={() =>
              setSelectedDate(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
              )
            }
          >
            <ChevronRight className="h-3.5 w-3.5" />
            חודש קודם
          </AdminButton>
          <span className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--admin-border)] bg-white px-3 text-xs font-bold">
            {monthTitle}
            {isCurrentMonth ? <AdminBadge tone="brand">נוכחי</AdminBadge> : null}
          </span>
          <AdminButton
            size="sm"
            variant="secondary"
            onClick={() =>
              setSelectedDate(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
              )
            }
          >
            חודש הבא
            <ChevronLeft className="h-3.5 w-3.5" />
          </AdminButton>
          {!isCurrentMonth ? (
            <AdminButton
              size="sm"
              variant="ghost"
              onClick={() => {
                const now = new Date();
                setSelectedDate(new Date(now.getFullYear(), now.getMonth(), 1));
              }}
            >
              חודש נוכחי
            </AdminButton>
          ) : null}
        </div>
      </div>

      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <AdminStatCard
          title="הכנסה חודשית"
          value={loading ? "—" : formatMoney(stats?.revenue ?? 0)}
          icon={<Wallet className="h-3.5 w-3.5" />}
          hint={`תשלומים ב-${monthTitle}`}
        />
        <AdminStatCard
          title="משתמשים פעילים"
          value={loading ? "—" : String(stats?.users ?? 0)}
          icon={<Users className="h-3.5 w-3.5" />}
          hint="סה״כ משתמשים במערכת"
        />
        <AdminStatCard
          title="אירועים עתידיים"
          value={loading ? "—" : String(stats?.invitations ?? 0)}
          icon={<CalendarDays className="h-3.5 w-3.5" />}
          hint="אירועים פעילים בלבד"
        />
        <AdminStatCard
          title="שירותי שיחות"
          value={loading ? "—" : String(stats?.calls ?? 0)}
          icon={<PhoneCall className="h-3.5 w-3.5" />}
          hint="לקוחות עם שירות פעיל"
        />
        <AdminStatCard
          title="סבבי שיחות קרובים"
          value={
            loadingUpcomingCalls ? "—" : String(upcomingCalls?.total ?? 0)
          }
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          hint="30 הימים הקרובים"
          onClick={() => setShowUpcomingCalls(true)}
        />
      </section>

      {/* Compact operational alert */}
      {!loadingUpcomingCalls &&
      upcomingCalls?.total &&
      nearestCallRound ? (
        <AdminAlert
          tone="warning"
          count={upcomingCalls.total}
          title="סבבי שיחות קרובים לטיפול"
          description={`הקרוב: ${nearestCallRound.clientName || "לקוח"} · ${
            nearestCallRound.eventName || "אירוע"
          } · סבב ${nearestCallRound.roundNumber} · ${getRelativeDayLabel(
            nearestCallRound.scheduledAt
          )} ${getHourLabel(nearestCallRound.scheduledAt)} · היום ${
            upcomingCalls.today
          } · מחר ${upcomingCalls.tomorrow} · השבוע ${upcomingCalls.week}`}
          actionLabel="טיפול"
          onAction={() => setShowUpcomingCalls(true)}
        />
      ) : null}

      {/* Revenue summary strip */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <AdminStatCard
          title="לקוחות משלמים"
          value={loading ? "—" : String(stats?.payingUsers ?? 0)}
          icon={<Users className="h-3.5 w-3.5" />}
          onClick={() => setShowPayingCustomers(true)}
        />
        <AdminStatCard
          title="תשלומים החודש"
          value={loading ? "—" : String(stats?.paymentsCount ?? 0)}
          icon={<ReceiptText className="h-3.5 w-3.5" />}
        />
        <AdminStatCard
          title="ממוצע לתשלום"
          value={loading ? "—" : formatMoney(averagePayment)}
          icon={<CreditCard className="h-3.5 w-3.5" />}
        />
      </section>

      {/* Range + charts */}
      <AdminPanel>
        <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-[var(--admin-muted)]">
              <CalendarRange className="h-3.5 w-3.5" />
              סיכום לפי טווח
            </div>
            <h2 className="text-sm font-bold text-[var(--admin-text)]">
              הכנסות לאורך זמן
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <SelectBox
              label="מיום"
              value={fromDay}
              onChange={setFromDay}
              options={DAYS}
            />
            <SelectBox
              label="מחודש"
              value={fromMonth}
              onChange={setFromMonth}
              options={MONTHS}
            />
            <SelectBox
              label="משנה"
              value={fromYear}
              onChange={setFromYear}
              options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
            />
            <SelectBox
              label="עד יום"
              value={toDay}
              onChange={setToDay}
              options={DAYS}
            />
            <SelectBox
              label="עד חודש"
              value={toMonth}
              onChange={setToMonth}
              options={MONTHS}
            />
            <SelectBox
              label="עד שנה"
              value={toYear}
              onChange={setToYear}
              options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
            />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat
            label="הכנסות בטווח"
            value={
              loading ? "—" : formatMoney(stats?.rangeSummary?.revenue ?? 0)
            }
          />
          <MiniStat
            label="לקוחות משלמים"
            value={
              loading ? "—" : String(stats?.rangeSummary?.customers ?? 0)
            }
          />
          <MiniStat
            label="תשלומים"
            value={
              loading
                ? "—"
                : String(stats?.rangeSummary?.paymentsCount ?? 0)
            }
          />
          <MiniStat
            label="ממוצע חודשי"
            value={loading ? "—" : formatMoney(rangeAverageMonthlyRevenue)}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] p-3">
            <h3 className="mb-3 text-xs font-bold text-[var(--admin-muted)]">
              השוואה בין חודשים
            </h3>
            {!stats?.rangeSummary?.monthlyBreakdown?.length ? (
              <AdminEmptyState text="אין הכנסות בטווח שנבחר." />
            ) : (
              <div className="space-y-2">
                {stats.rangeSummary.monthlyBreakdown.map((item) => {
                  const width = Math.max(
                    4,
                    Math.round((item.revenue / maxMonthlyRevenue) * 100)
                  );
                  return (
                    <div key={`${item.month}-${item.year}`}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--admin-text)]">
                          {getMonthName(item.month)} {item.year}
                        </span>
                        <span className="font-bold text-[var(--admin-brand)]">
                          {formatMoney(item.revenue)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-[var(--admin-brand)]"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] font-medium text-[var(--admin-subtle)]">
                        {item.paymentsCount} תשלומים
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] p-3">
            <h3 className="mb-3 text-xs font-bold text-[var(--admin-muted)]">
              פילוח לפי סוג תשלום
            </h3>
            {!stats?.rangeSummary?.byType?.length ? (
              <AdminEmptyState text="אין סוגי תשלום להצגה." />
            ) : (
              <div className="space-y-2">
                {stats.rangeSummary.byType.map((item) => (
                  <div
                    key={item.type}
                    className="flex items-center justify-between rounded-md border border-[var(--admin-border)] px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-bold text-[var(--admin-text)]">
                        {getPaymentTypeLabel(item.type)}
                      </p>
                      <p className="text-[10px] font-medium text-[var(--admin-subtle)]">
                        {item.paymentsCount} תשלומים
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[var(--admin-brand)]">
                      {formatMoney(item.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AdminPanel>

      {/* Paying customers preview table */}
      <AdminPanel>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[var(--admin-text)]">
              לקוחות משלמים · {monthTitle}
            </h2>
            <p className="text-[11px] font-medium text-[var(--admin-muted)]">
              פעילות תשלומים בחודש הנבחר
            </p>
          </div>
          <AdminButton
            size="sm"
            variant="secondary"
            onClick={() => setShowPayingCustomers(true)}
          >
            כל הלקוחות
          </AdminButton>
        </div>

        <AdminTableShell
          headers={["לקוח", "אימייל", "חבילה", "סכום", "תשלום אחרון"]}
          isEmpty={!stats?.payingCustomers?.length}
          empty="אין לקוחות משלמים בחודש הזה."
        >
          {(stats?.payingCustomers || []).slice(0, 8).map((customer) => (
            <tr key={customer.email}>
              <td className="font-bold">{customer.name || "לא הוגדר שם"}</td>
              <td className="text-[var(--admin-muted)]">{customer.email}</td>
              <td>{customer.packageName || "—"}</td>
              <td className="font-bold text-[var(--admin-brand)]">
                {formatMoney(customer.totalPaid)}
              </td>
              <td>{formatDate(customer.lastPaymentAt)}</td>
            </tr>
          ))}
        </AdminTableShell>
      </AdminPanel>

      {showPayingCustomers ? (
        <ModalShell
          title="לקוחות משלמים"
          subtitle={`פירוט לקוחות ששילמו ב${monthTitle}`}
          onClose={() => setShowPayingCustomers(false)}
        >
          <AdminFilterBar>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--admin-subtle)]" />
              <input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="חיפוש לפי שם, אימייל או חבילה..."
                className="admin-input h-9 pr-8"
              />
            </div>
          </AdminFilterBar>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--admin-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              טוען לקוחות…
            </div>
          ) : !payingCustomers.length ? (
            <AdminEmptyState text="אין לקוחות להצגה בחודש הזה." />
          ) : (
            <AdminTableShell
              headers={["לקוח", "אימייל", "חבילה", "תשלומים", "סכום", "אחרון"]}
            >
              {payingCustomers.map((customer) => (
                <tr key={customer.email}>
                  <td className="font-bold">
                    {customer.name || "לא הוגדר שם"}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {customer.hasCallsAddon ? (
                        <AdminBadge tone="warning">שיחות</AdminBadge>
                      ) : null}
                      {customer.hasCreditGiftsAddon ? (
                        <AdminBadge tone="brand">מתנות</AdminBadge>
                      ) : null}
                    </div>
                  </td>
                  <td className="text-[var(--admin-muted)]">{customer.email}</td>
                  <td>{customer.packageName || "—"}</td>
                  <td>{customer.paymentsCount}</td>
                  <td className="font-bold text-[var(--admin-brand)]">
                    {formatMoney(customer.totalPaid)}
                  </td>
                  <td>{formatDate(customer.lastPaymentAt)}</td>
                </tr>
              ))}
            </AdminTableShell>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[var(--admin-muted)]">
            <span>מוצגים: {payingCustomers.length}</span>
            <span className="font-bold text-[var(--admin-text)]">
              סה״כ: {formatMoney(stats?.revenue ?? 0)}
            </span>
          </div>
        </ModalShell>
      ) : null}

      {showUpcomingCalls ? (
        <UpcomingCallRoundsModal
          loading={loadingUpcomingCalls}
          rounds={upcomingCallRounds}
          data={upcomingCalls}
          onClose={() => setShowUpcomingCalls(false)}
        />
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-gray-50 px-3 py-2.5">
      <p className="text-[11px] font-bold text-[var(--admin-muted)]">{label}</p>
      <p className="mt-1 text-base font-bold text-[var(--admin-text)]">{value}</p>
    </div>
  );
}

function SelectBox({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: Array<{ value: number; label: string }>;
}) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="admin-select h-9"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-3"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--admin-text)]">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--admin-border)] text-[var(--admin-muted)] hover:bg-gray-50"
            aria-label="סגירה"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-64px)] overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function UpcomingCallRoundsModal({
  loading,
  rounds,
  data,
  onClose,
}: {
  loading: boolean;
  rounds: UpcomingCallRound[];
  data: UpcomingCallRoundsResponse | null;
  onClose: () => void;
}) {
  const groupedRounds = useMemo(() => {
    const groups: Record<string, UpcomingCallRound[]> = {
      today: [],
      tomorrow: [],
      week: [],
      month: [],
    };
    const todayStart = getDateOnly(new Date());
    const tomorrowStart = addDays(todayStart, 1);
    const afterTomorrowStart = addDays(todayStart, 2);
    const nextWeekStart = startOfNextWeek(todayStart);
    const nextMonthStart = startOfNextMonth(todayStart);

    rounds.forEach((round) => {
      const scheduledAt = new Date(round.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) return;
      if (isSameDate(scheduledAt, todayStart)) groups.today.push(round);
      else if (scheduledAt >= tomorrowStart && scheduledAt < afterTomorrowStart)
        groups.tomorrow.push(round);
      else if (scheduledAt >= afterTomorrowStart && scheduledAt < nextWeekStart)
        groups.week.push(round);
      else if (scheduledAt >= nextWeekStart && scheduledAt < nextMonthStart)
        groups.month.push(round);
    });
    return groups;
  }, [rounds]);

  const sections = [
    { key: "today", label: "היום", items: groupedRounds.today },
    { key: "tomorrow", label: "מחר", items: groupedRounds.tomorrow },
    { key: "week", label: "השבוע", items: groupedRounds.week },
    { key: "month", label: "החודש", items: groupedRounds.month },
  ];

  return (
    <ModalShell
      title="לו״ז סבבי שיחות"
      subtitle={`סה״כ ${data?.total || 0} · היום ${data?.today || 0} · מחר ${
        data?.tomorrow || 0
      }`}
      onClose={onClose}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--admin-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          טוען סבבים…
        </div>
      ) : !rounds.length ? (
        <AdminEmptyState text="אין סבבי שיחות קרובים." />
      ) : (
        <div className="space-y-4">
          {sections.map((section) =>
            section.items.length ? (
              <div key={section.key}>
                <div className="mb-2 flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[var(--admin-muted)]">
                    {section.label}
                  </h4>
                  <AdminBadge tone="neutral">{section.items.length}</AdminBadge>
                </div>
                <AdminTableShell
                  headers={[
                    "לקוח",
                    "אירוע",
                    "סבב",
                    "מועד",
                    "ממתינים",
                    "בוצעו",
                  ]}
                >
                  {section.items.map((round) => (
                    <tr key={round.id}>
                      <td>
                        <p className="font-bold">
                          {round.clientName || "ללא שם"}
                        </p>
                        <p className="text-[11px] text-[var(--admin-muted)]">
                          {round.clientEmail}
                        </p>
                      </td>
                      <td>{round.eventName || "—"}</td>
                      <td>{round.roundNumber}</td>
                      <td>{formatDateTime(round.scheduledAt)}</td>
                      <td>{round.guestsWaiting}</td>
                      <td>{round.guestsDone}</td>
                    </tr>
                  ))}
                </AdminTableShell>
              </div>
            ) : null
          )}
        </div>
      )}
    </ModalShell>
  );
}
