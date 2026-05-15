"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Users,
  CalendarDays,
  PhoneCall,
  Wallet,
  TrendingUp,
  Loader2,
  X,
  ReceiptText,
  Gift,
  CreditCard,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Search,
} from "lucide-react";

/* =====================================================
   TYPES
===================================================== */
interface PayingCustomer {
  email: string;
  totalPaid: number;
  paymentsCount: number;
  lastPaymentAt?: string | null;
  types?: string[];
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
  monthLabel?: string;
}

/* =====================================================
   HELPERS
===================================================== */
function getMonthLabel(date: Date) {
  return date.toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });
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

function getPaymentTypeLabel(type: string) {
  const labels: Record<string, string> = {
    package: "חבילה",
    addon: "תוספת",
    upgrade: "שדרוג",
    "producer-client": "לקוח מפיק",
  };

  return labels[type] || type;
}

/* =====================================================
   PAGE
===================================================== */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayingCustomers, setShowPayingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const selectedMonth = selectedDate.getMonth() + 1;
  const selectedYear = selectedDate.getFullYear();

  const monthTitle = useMemo(() => {
    return getMonthLabel(selectedDate);
  }, [selectedDate]);

  const isCurrentMonth = useMemo(() => {
    const now = new Date();

    return (
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth()
    );
  }, [selectedDate]);

  const payingCustomers = useMemo(() => {
    const list = stats?.payingCustomers || [];
    const q = customerSearch.trim().toLowerCase();

    if (!q) return list;

    return list.filter((customer) =>
      String(customer.email || "").toLowerCase().includes(q)
    );
  }, [stats?.payingCustomers, customerSearch]);

  const averagePayment = useMemo(() => {
    const paymentsCount = Number(stats?.paymentsCount || 0);
    const revenue = Number(stats?.revenue || 0);

    if (!paymentsCount) return 0;

    return Math.round(revenue / paymentsCount);
  }, [stats?.paymentsCount, stats?.revenue]);

  async function fetchStats() {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/admin/stats?month=${selectedMonth}&year=${selectedYear}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!res.ok) throw new Error("Failed to fetch stats");

      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("❌ Failed to load admin stats:", err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const goPrevMonth = () => {
    setSelectedDate((prev) => {
      return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
    });
  };

  const goNextMonth = () => {
    setSelectedDate((prev) => {
      return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
    });
  };

  const goCurrentMonth = () => {
    const now = new Date();
    setSelectedDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  return (
    <div
      dir="rtl"
      className="
        min-h-screen
        bg-[#F6F4F1]
        px-4 py-6
        md:px-8 md:py-8
      "
    >
      <div className="mx-auto max-w-7xl space-y-7">
        {/* =====================================================
            HERO
        ====================================================== */}
        <section
          className="
            relative overflow-hidden
            rounded-[34px]
            border border-[#E7D8C6]
            bg-gradient-to-br from-[#FFFDF8] via-[#F8EFE3] to-[#EEDFCC]
            p-5 md:p-8
            shadow-[0_22px_75px_rgba(84,58,32,0.12)]
          "
        >
          <div
            className="
              pointer-events-none absolute -left-20 -top-20
              h-64 w-64 rounded-full
              bg-white/55 blur-3xl
            "
          />

          <div
            className="
              pointer-events-none absolute -bottom-28 right-16
              h-72 w-72 rounded-full
              bg-[#D7B37C]/35 blur-3xl
            "
          />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div
                className="
                  mb-4 inline-flex items-center gap-2
                  rounded-full
                  border border-[#E7D8C6]
                  bg-white/60
                  px-4 py-2
                  text-xs font-black
                  text-[#8A6A43]
                  shadow-sm
                "
              >
                <ShieldCheck size={15} />
                Admin Panel
              </div>

              <h1 className="text-4xl font-black tracking-tight text-[#352618] md:text-6xl">
                סקירת מערכת
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#7B6754] md:text-base">
                דשבורד ניהול מקצועי עם הכנסות חודשיות, לקוחות משלמים,
                תשלומים, אירועים עתידיים ושירותים פעילים.
              </p>
            </div>

            {/* Month Controls */}
            <div
              className="
                w-full rounded-[28px]
                border border-white/75
                bg-white/80
                p-4
                shadow-[0_16px_45px_rgba(72,51,31,0.12)]
                backdrop-blur
                lg:w-[360px]
              "
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-[#9A7A52]">
                    חודש הכנסות
                  </div>

                  <div className="mt-1 text-2xl font-black text-[#3A2A1C]">
                    {monthTitle}
                  </div>
                </div>

                {isCurrentMonth && (
                  <span
                    className="
                      rounded-full
                      bg-[#FFF2D8]
                      px-3 py-1
                      text-xs font-black
                      text-[#B97821]
                    "
                  >
                    חודש נוכחי
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  className="
                    flex h-12 flex-1 items-center justify-center gap-2
                    rounded-2xl
                    border border-[#E7D9C7]
                    bg-white
                    text-sm font-black
                    text-[#6B4D2E]
                    transition
                    hover:bg-[#F7EBD9]
                  "
                >
                  <ChevronRight size={18} />
                  חודש קודם
                </button>

                <button
                  type="button"
                  onClick={goNextMonth}
                  className="
                    flex h-12 flex-1 items-center justify-center gap-2
                    rounded-2xl
                    border border-[#E7D9C7]
                    bg-white
                    text-sm font-black
                    text-[#6B4D2E]
                    transition
                    hover:bg-[#F7EBD9]
                  "
                >
                  חודש הבא
                  <ChevronLeft size={18} />
                </button>
              </div>

              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={goCurrentMonth}
                  className="
                    mt-3 flex h-11 w-full items-center justify-center gap-2
                    rounded-2xl
                    bg-[#3A2A1C]
                    text-sm font-black
                    text-white
                    transition
                    hover:bg-[#24190F]
                  "
                >
                  חזרה לחודש הנוכחי
                </button>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================
            MAIN REVENUE
        ====================================================== */}
        <section
          className="
            rounded-[32px]
            border border-[#E7D8C6]
            bg-white
            p-5 md:p-7
            shadow-[0_18px_55px_rgba(60,43,25,0.08)]
          "
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="
                  flex h-16 w-16 shrink-0 items-center justify-center
                  rounded-[24px]
                  bg-gradient-to-br from-[#D99B43] to-[#A8691D]
                  text-white
                  shadow-[0_14px_32px_rgba(168,105,29,0.30)]
                "
              >
                <Wallet size={30} />
              </div>

              <div>
                <p className="text-sm font-black text-[#9A7A52]">
                  הכנסה חודשית
                </p>

                <h2 className="mt-1 text-4xl font-black text-[#3A2A1C] md:text-6xl">
                  {loading ? "—" : formatMoney(stats?.revenue ?? 0)}
                </h2>

                <p className="mt-2 text-sm text-[#7B6754]">
                  לפי תשלומים בפועל בחודש {monthTitle}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[520px]">
              <MiniMetric
                title="לקוחות משלמים"
                value={loading ? "—" : String(stats?.payingUsers ?? 0)}
                icon={<Users size={18} />}
                onClick={() => setShowPayingCustomers(true)}
                clickable
              />

              <MiniMetric
                title="תשלומים"
                value={loading ? "—" : String(stats?.paymentsCount ?? 0)}
                icon={<ReceiptText size={18} />}
              />

              <MiniMetric
                title="ממוצע לתשלום"
                value={loading ? "—" : formatMoney(averagePayment)}
                icon={<CreditCard size={18} />}
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            STATS
        ====================================================== */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminBox
            title="משתמשים פעילים"
            subtitle="משתמשים שקיימים כרגע במערכת"
            value={loading ? "—" : String(stats?.users ?? 0)}
            icon={<Users size={24} />}
            tone="green"
          />

          <AdminBox
            title="אירועים פעילים"
            subtitle="אירועים עתידיים בלבד"
            value={loading ? "—" : String(stats?.invitations ?? 0)}
            icon={<CalendarDays size={24} />}
            tone="blue"
          />

          <AdminBox
            title="שירותי שיחות"
            subtitle="לקוחות עם שירות שיחות פעיל"
            value={loading ? "—" : String(stats?.calls ?? 0)}
            icon={<PhoneCall size={24} />}
            tone="orange"
          />

          <AdminBox
            title="הכנסות החודש"
            subtitle={`תשלומים ב-${monthTitle}`}
            value={loading ? "—" : formatMoney(stats?.revenue ?? 0)}
            icon={<Wallet size={24} />}
            tone="gold"
            highlight
          />
        </section>

        {/* =====================================================
            SECONDARY STATS
        ====================================================== */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminWideBox
            title="הכנסות משירותי שיחות"
            subtitle="סך תוספות שיחות ששולמו בחודש הנבחר"
            value={loading ? "—" : formatMoney(stats?.callsRevenue ?? 0)}
            icon={<PhoneCall size={22} />}
          />

          <AdminWideBox
            title="הכנסות ממתנות באשראי"
            subtitle="סך תוספות מתנות באשראי בחודש הנבחר"
            value={loading ? "—" : formatMoney(stats?.creditGiftsRevenue ?? 0)}
            icon={<Gift size={22} />}
          />

          <button
            type="button"
            onClick={fetchStats}
            className="
              group
              rounded-[28px]
              border border-[#E7D8C6]
              bg-[#FFFDF8]
              p-5
              text-right
              shadow-[0_14px_40px_rgba(60,43,25,0.06)]
              transition
              hover:-translate-y-1
              hover:bg-white
              hover:shadow-[0_20px_55px_rgba(60,43,25,0.10)]
            "
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-black text-[#3A2A1C]">
                  רענון נתונים
                </div>

                <div className="mt-1 text-xs leading-5 text-[#8A7867]">
                  משיכת נתונים עדכניים מהשרת
                </div>
              </div>

              <div
                className="
                  flex h-12 w-12 items-center justify-center
                  rounded-2xl
                  bg-[#F6EBDD]
                  text-[#8A5A24]
                  transition
                  group-hover:rotate-180
                "
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={22} />
                ) : (
                  <RefreshCcw size={22} />
                )}
              </div>
            </div>

            <div className="mt-5 text-2xl font-black text-[#8A5A24]">
              {loading ? "טוען..." : "עדכן עכשיו"}
            </div>
          </button>
        </section>

        {/* =====================================================
            MONTH CUSTOMERS TABLE PREVIEW
        ====================================================== */}
        <section
          className="
            rounded-[32px]
            border border-[#E7D8C6]
            bg-white
            p-5 md:p-6
            shadow-[0_18px_55px_rgba(60,43,25,0.07)]
          "
        >
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-black text-[#3A2A1C]">
                לקוחות משלמים בחודש {monthTitle}
              </h3>

              <p className="mt-1 text-sm text-[#8A7867]">
                תצוגה מהירה של הלקוחות ששילמו בחודש הנבחר
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPayingCustomers(true)}
              className="
                h-11 rounded-2xl
                bg-[#3A2A1C]
                px-5
                text-sm font-black
                text-white
                transition
                hover:bg-[#24190F]
              "
            >
              צפייה בכל הלקוחות
            </button>
          </div>

          {!stats?.payingCustomers?.length ? (
            <div
              className="
                rounded-2xl
                border border-[#EFE2D1]
                bg-[#FFF9EF]
                p-6
                text-center
                text-sm font-bold
                text-[#7B6754]
              "
            >
              אין לקוחות משלמים בחודש הזה.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#EFE2D1]">
              <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr] bg-[#FFF9EF] px-4 py-3 text-xs font-black text-[#7B6754] md:grid">
                <div>לקוח</div>
                <div>סכום</div>
                <div>תשלומים</div>
                <div>תשלום אחרון</div>
              </div>

              <div className="divide-y divide-[#EFE2D1]">
                {(stats.payingCustomers || []).slice(0, 5).map((customer) => (
                  <div
                    key={customer.email}
                    className="
                      grid grid-cols-1 gap-3
                      px-4 py-4
                      text-sm
                      md:grid-cols-[1.5fr_1fr_1fr_1fr]
                      md:items-center
                    "
                  >
                    <div className="font-black text-[#3A2A1C]">
                      {customer.email}
                    </div>

                    <div className="font-black text-[#B97821]">
                      {formatMoney(customer.totalPaid)}
                    </div>

                    <div className="text-[#7B6754]">
                      {customer.paymentsCount} תשלומים
                    </div>

                    <div className="text-[#7B6754]">
                      {formatDate(customer.lastPaymentAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* =====================================================
          PAYING CUSTOMERS MODAL
      ====================================================== */}
      {showPayingCustomers && (
        <div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-black/35
            px-4
            backdrop-blur-sm
          "
          onClick={() => setShowPayingCustomers(false)}
        >
          <div
            dir="rtl"
            className="
              w-full max-w-3xl
              overflow-hidden
              rounded-[32px]
              border border-[#E7D8C6]
              bg-white
              shadow-[0_28px_90px_rgba(0,0,0,0.22)]
            "
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="
                border-b border-[#EFE2D1]
                bg-gradient-to-br from-[#FFFDF8] to-[#F8EFE3]
                p-5 md:p-6
              "
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-[#3A2A1C]">
                    לקוחות משלמים
                  </h3>

                  <p className="mt-1 text-sm text-[#8A7867]">
                    פירוט לקוחות ששילמו בחודש {monthTitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPayingCustomers(false)}
                  className="
                    flex h-11 w-11 shrink-0 items-center justify-center
                    rounded-full
                    bg-white
                    text-[#6B5138]
                    shadow-sm
                    transition
                    hover:bg-[#F1E5D6]
                  "
                  aria-label="סגירה"
                >
                  <X size={20} />
                </button>
              </div>

              <div
                className="
                  mt-5 flex items-center gap-3
                  rounded-2xl
                  border border-[#E7D8C6]
                  bg-white
                  px-4 py-3
                "
              >
                <Search size={18} className="text-[#9A7A52]" />

                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="חיפוש לפי אימייל..."
                  className="
                    w-full bg-transparent
                    text-sm font-semibold
                    text-[#3A2A1C]
                    outline-none
                    placeholder:text-[#B6A28C]
                  "
                />
              </div>
            </div>

            <div className="max-h-[540px] overflow-y-auto p-5 md:p-6">
              {loading ? (
                <div className="flex items-center justify-center gap-3 py-12 text-[#7B6754]">
                  <Loader2 className="animate-spin" size={22} />
                  <span className="font-bold">טוען לקוחות...</span>
                </div>
              ) : !payingCustomers.length ? (
                <div
                  className="
                    rounded-2xl
                    border border-[#EFE2D1]
                    bg-[#FFF9EF]
                    p-6
                    text-center
                    text-sm font-bold
                    text-[#7B6754]
                  "
                >
                  אין לקוחות להצגה בחודש הזה.
                </div>
              ) : (
                <div className="space-y-3">
                  {payingCustomers.map((customer) => (
                    <div
                      key={customer.email}
                      className="
                        rounded-2xl
                        border border-[#EFE2D1]
                        bg-[#FFFDF8]
                        p-4
                        transition
                        hover:bg-white
                        hover:shadow-sm
                      "
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Mail
                              size={17}
                              className="shrink-0 text-[#9A7A52]"
                            />

                            <div className="truncate font-black text-[#3A2A1C]">
                              {customer.email || "ללא אימייל"}
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#8A7867]">
                            <span
                              className="
                                rounded-full
                                bg-white
                                px-3 py-1
                                font-bold
                                ring-1 ring-[#EFE2D1]
                              "
                            >
                              {customer.paymentsCount} תשלומים
                            </span>

                            <span
                              className="
                                rounded-full
                                bg-white
                                px-3 py-1
                                font-bold
                                ring-1 ring-[#EFE2D1]
                              "
                            >
                              תשלום אחרון:{" "}
                              {formatDate(customer.lastPaymentAt)}
                            </span>

                            {customer.types?.map((type) => (
                              <span
                                key={type}
                                className="
                                  rounded-full
                                  bg-[#FFF2D8]
                                  px-3 py-1
                                  font-bold
                                  text-[#9A6A24]
                                "
                              >
                                {getPaymentTypeLabel(type)}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="text-3xl font-black text-[#B97821]">
                          {formatMoney(customer.totalPaid)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="
                flex items-center justify-between gap-4
                border-t border-[#EFE2D1]
                bg-[#FFFDF8]
                px-5 py-4
                text-sm
              "
            >
              <span className="font-bold text-[#7B6754]">
                סה״כ לקוחות מוצגים: {payingCustomers.length}
              </span>

              <span className="font-black text-[#3A2A1C]">
                סה״כ הכנסות: {formatMoney(stats?.revenue ?? 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   MINI METRIC
===================================================== */
function MiniMetric({
  title,
  value,
  icon,
  clickable = false,
  onClick,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  clickable?: boolean;
  onClick?: () => void;
}) {
  const Comp = clickable ? "button" : "div";

  return (
    <Comp
      type={clickable ? "button" : undefined}
      onClick={onClick}
      className={`
        rounded-2xl
        border border-[#EFE2D1]
        bg-[#FFF9EF]
        p-4
        text-right
        transition
        ${
          clickable
            ? "cursor-pointer hover:bg-[#F7EBD9] hover:shadow-sm"
            : ""
        }
      `}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs font-black text-[#8A7867]">{title}</div>

        <div className="text-[#9A6A24]">{icon}</div>
      </div>

      <div className="text-2xl font-black text-[#3A2A1C]">{value}</div>
    </Comp>
  );
}

/* =====================================================
   ADMIN BOX
===================================================== */
function AdminBox({
  title,
  subtitle,
  value,
  icon,
  tone,
  highlight = false,
}: {
  title: string;
  subtitle: string;
  value: string;
  icon: React.ReactNode;
  tone: "green" | "blue" | "orange" | "gold";
  highlight?: boolean;
}) {
  const styles = {
    green: {
      box: "from-[#EAF8EF] to-white border-[#CFEED9]",
      icon: "bg-[#E8F8EE] text-[#1F9A55]",
      value: "text-[#1F9A55]",
    },
    blue: {
      box: "from-[#EEF5FF] to-white border-[#D7E6FF]",
      icon: "bg-[#EEF5FF] text-[#2E6FEA]",
      value: "text-[#2E6FEA]",
    },
    orange: {
      box: "from-[#FFF3E8] to-white border-[#F3DDC4]",
      icon: "bg-[#FFF1E5] text-[#E77721]",
      value: "text-[#E77721]",
    },
    gold: {
      box: "from-[#FFF7E8] to-white border-[#E8C98D]",
      icon: "bg-[#FFF2D8] text-[#B97821]",
      value: "text-[#B97821]",
    },
  }[tone];

  return (
    <div
      className={`
        relative overflow-hidden
        rounded-[28px]
        border
        bg-gradient-to-br
        p-5
        shadow-[0_16px_45px_rgba(60,43,25,0.07)]
        transition
        hover:-translate-y-1
        hover:shadow-[0_22px_60px_rgba(60,43,25,0.12)]
        ${styles.box}
        ${highlight ? "ring-1 ring-[#E2B96E]" : ""}
      `}
    >
      <div
        className="
          pointer-events-none absolute -left-10 -top-10
          h-28 w-28 rounded-full bg-white/60 blur-2xl
        "
      />

      <div className="relative z-10">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-black text-[#3A2A1C]">{title}</div>

            <div className="mt-1 text-xs leading-5 text-[#8A7867]">
              {subtitle}
            </div>
          </div>

          <div
            className={`
              flex h-12 w-12 shrink-0 items-center justify-center
              rounded-2xl
              ${styles.icon}
            `}
          >
            {icon}
          </div>
        </div>

        <div className={`text-3xl font-black md:text-4xl ${styles.value}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   WIDE BOX
===================================================== */
function AdminWideBox({
  title,
  subtitle,
  value,
  icon,
}: {
  title: string;
  subtitle: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="
        rounded-[28px]
        border border-[#E7D8C6]
        bg-white
        p-5
        shadow-[0_14px_40px_rgba(60,43,25,0.06)]
      "
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-black text-[#3A2A1C]">{title}</div>

          <div className="mt-1 text-xs leading-5 text-[#8A7867]">
            {subtitle}
          </div>
        </div>

        <div
          className="
            flex h-12 w-12 items-center justify-center
            rounded-2xl
            bg-[#FFF2D8]
            text-[#B97821]
          "
        >
          {icon}
        </div>
      </div>

      <div className="mt-5 text-3xl font-black text-[#B97821]">{value}</div>
    </div>
  );
}