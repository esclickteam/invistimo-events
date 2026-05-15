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
} from "lucide-react";

/* =====================================================
   TYPES
===================================================== */
interface AdminStats {
  users: number;
  invitations: number;
  calls: number;
  revenue: number;
  month: number;
  year: number;
  monthLabel?: string;
  payingUsers?: number;
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

/* =====================================================
   PAGE
===================================================== */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const selectedMonth = selectedDate.getMonth() + 1;
  const selectedYear = selectedDate.getFullYear();

  const monthTitle = useMemo(() => {
    return getMonthLabel(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
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

  const isCurrentMonth = useMemo(() => {
    const now = new Date();

    return (
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth()
    );
  }, [selectedDate]);

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
      <div className="mx-auto max-w-7xl space-y-8">
        {/* ===== Header ===== */}
        <section
          className="
            relative overflow-hidden
            rounded-[32px]
            border border-[#E6D8C8]
            bg-gradient-to-br from-[#FFFDF8] via-[#F8EFE3] to-[#EFE1CF]
            p-6 md:p-8
            shadow-[0_20px_70px_rgba(84,58,32,0.10)]
          "
        >
          <div
            className="
              pointer-events-none absolute -left-16 -top-16
              h-48 w-48 rounded-full
              bg-white/50 blur-3xl
            "
          />

          <div
            className="
              pointer-events-none absolute -bottom-20 right-20
              h-56 w-56 rounded-full
              bg-[#D8B98C]/30 blur-3xl
            "
          />

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold text-[#9A7A52]">
                Admin Panel
              </p>

              <h1 className="text-3xl font-black text-[#3A2A1C] md:text-5xl">
                סקירת מערכת
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#7B6754] md:text-base">
                תצוגת ניהול חודשית: הכנסות, משתמשים, אירועים ושירותים — לפי
                חודש נבחר, בלי שהכנסות עבר יימחקו אם משתמש נמחק מהמערכת.
              </p>
            </div>

            {/* Month Controls */}
            <div
              className="
                rounded-[26px]
                border border-white/70
                bg-white/75
                p-3
                shadow-[0_14px_40px_rgba(72,51,31,0.10)]
                backdrop-blur
              "
            >
              <div className="mb-2 text-center text-xs font-bold text-[#9A7A52]">
                חודש הכנסות
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  className="
                    flex h-11 w-11 items-center justify-center
                    rounded-2xl
                    border border-[#E7D9C7]
                    bg-white
                    text-[#6B4D2E]
                    transition
                    hover:bg-[#F7EBD9]
                  "
                  aria-label="חודש קודם"
                >
                  <ChevronRight size={20} />
                </button>

                <div className="min-w-[150px] text-center">
                  <div className="text-lg font-black text-[#3A2A1C]">
                    {monthTitle}
                  </div>

                  {isCurrentMonth && (
                    <div className="mt-1 text-xs font-bold text-[#C0873A]">
                      חודש נוכחי
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={goNextMonth}
                  className="
                    flex h-11 w-11 items-center justify-center
                    rounded-2xl
                    border border-[#E7D9C7]
                    bg-white
                    text-[#6B4D2E]
                    transition
                    hover:bg-[#F7EBD9]
                  "
                  aria-label="חודש הבא"
                >
                  <ChevronLeft size={20} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Main Revenue Card ===== */}
        <section
          className="
            rounded-[30px]
            border border-[#E7D8C6]
            bg-white
            p-6
            shadow-[0_18px_50px_rgba(60,43,25,0.08)]
          "
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="
                  flex h-16 w-16 items-center justify-center
                  rounded-[24px]
                  bg-gradient-to-br from-[#D99B43] to-[#A8691D]
                  text-white
                  shadow-[0_14px_30px_rgba(168,105,29,0.28)]
                "
              >
                <Wallet size={30} />
              </div>

              <div>
                <p className="text-sm font-bold text-[#9A7A52]">
                  הכנסה חודשית
                </p>

                <h2 className="mt-1 text-3xl font-black text-[#3A2A1C] md:text-5xl">
                  {loading ? "—" : formatMoney(stats?.revenue ?? 0)}
                </h2>

                <p className="mt-2 text-sm text-[#7B6754]">
                  מחושב לפי תשלומים שנשמרו במערכת לחודש {monthTitle}
                </p>
              </div>
            </div>

            <div
              className="
                flex items-center gap-3
                rounded-2xl
                border border-[#EFE2D1]
                bg-[#FFF9EF]
                px-4 py-3
                text-[#6B4D2E]
              "
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <TrendingUp size={18} />
              )}

              <span className="text-sm font-bold">
                {loading
                  ? "טוען נתונים..."
                  : `${stats?.payingUsers ?? 0} לקוחות משלמים בחודש הזה`}
              </span>
            </div>
          </div>
        </section>

        {/* ===== Stats ===== */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminBox
            title="סה״כ משתמשים פעילים"
            subtitle="משתמשים שקיימים כרגע במערכת"
            value={loading ? "—" : String(stats?.users ?? 0)}
            icon={<Users size={24} />}
            tone="green"
          />

          <AdminBox
            title="אירועים פעילים"
            subtitle="אירועים קיימים במערכת"
            value={loading ? "—" : String(stats?.invitations ?? 0)}
            icon={<CalendarDays size={24} />}
            tone="blue"
          />

          <AdminBox
            title="שירותי שיחות"
            subtitle="כמות שירותי שיחות"
            value={loading ? "—" : String(stats?.calls ?? 0)}
            icon={<PhoneCall size={24} />}
            tone="orange"
          />

          <AdminBox
            title="הכנסות החודש"
            subtitle={`לפי תשלומים ב-${monthTitle}`}
            value={loading ? "—" : formatMoney(stats?.revenue ?? 0)}
            icon={<Wallet size={24} />}
            tone="gold"
            highlight
          />
        </section>

        {/* ===== Explanation ===== */}
        <section
          className="
            rounded-[28px]
            border border-[#E7D8C6]
            bg-[#FFFDF8]
            p-5 md:p-6
            shadow-sm
          "
        >
          <h3 className="mb-3 text-lg font-black text-[#3A2A1C]">
            איך ההכנסה מחושבת?
          </h3>

          <p className="max-w-4xl text-sm leading-7 text-[#7B6754]">
            ההכנסה החודשית צריכה להישמר לפי רשומות תשלום. כלומר, ברגע שלקוח
            שילם — נוצרת רשומת תשלום עם סכום, חודש ושנה. גם אם לאחר מכן מוחקים
            את המשתמש כי הוא סיים פעילות, רשומת התשלום נשארת ולכן הסכום של אותו
            חודש לא יורד.
          </p>
        </section>
      </div>
    </div>
  );
}

/* =====================================================
   CARD
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
            <div className="text-sm font-black text-[#3A2A1C]">
              {title}
            </div>

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