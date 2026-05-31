"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import SoftphoneStatusPanel from "@/app/components/staff/SoftphoneStatusPanel";

type MenuItem = {
  label: string;
  icon: string;
  active?: boolean;
};

type ActivityItem = {
  title: string;
  subtitle: string;
  time: string;
  tone: "green" | "blue" | "gold" | "red";
};

type AlertItem = {
  title: string;
  subtitle: string;
  icon: string;
  tone: "blue" | "red" | "gold" | "green";
};

const menuItems: MenuItem[] = [
  { label: "ראשי", icon: "⌂", active: true },
  { label: "לוח בקרה", icon: "▦" },
  { label: "לקוחות", icon: "👥" },
  { label: "לידים", icon: "◉" },
  { label: "פניות ושיחות", icon: "☎" },
  { label: "משימות", icon: "◎" },
  { label: "יומן", icon: "▣" },
  { label: "דוחות", icon: "▥" },
  { label: "הגדרות", icon: "⚙" },
];

const activities: ActivityItem[] = [
  {
    title: "שיחה יוצאת אל 03-9876543",
    subtitle: "דן כהן · סיכום שיחה נוצר",
    time: "10:32",
    tone: "green",
  },
  {
    title: "שיחה נכנסת מ־050-1234567",
    subtitle: "מיכל לוי · נשלחה משימה להמשך טיפול",
    time: "10:21",
    tone: "blue",
  },
  {
    title: "נציג עבר לטיפול אחרי שיחה",
    subtitle: "משך טיפול: 04:12 דקות",
    time: "09:58",
    tone: "gold",
  },
  {
    title: "לקוח ביקש חזרה מאוחר יותר",
    subtitle: "נוצרה תזכורת לשעה 14:30",
    time: "09:41",
    tone: "red",
  },
];

const alerts: AlertItem[] = [
  {
    title: "פנייה חדשה מליד חם",
    subtitle: "אלון בר · לפני 2 דקות",
    icon: "↗",
    tone: "blue",
  },
  {
    title: "שיחה ממתינה לטיפול",
    subtitle: "050-9876543 · לפני 15 דקות",
    icon: "☎",
    tone: "red",
  },
  {
    title: "נציג בהפסקה",
    subtitle: "משך הפסקה פעיל: 00:07:12",
    icon: "☕",
    tone: "gold",
  },
];

function toneClasses(tone: ActivityItem["tone"] | AlertItem["tone"]) {
  if (tone === "green") {
    return {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
    };
  }

  if (tone === "blue") {
    return {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      dot: "bg-blue-500",
    };
  }

  if (tone === "red") {
    return {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      dot: "bg-rose-500",
    };
  }

  return {
    bg: "bg-[#fff8ed]",
    text: "text-[#9b6b20]",
    border: "border-[#ead7b7]",
    dot: "bg-[#b9945a]",
  };
}

function MiniLineChart() {
  const points = useMemo(
    () => [
      { x: 0, y: 72 },
      { x: 80, y: 44 },
      { x: 160, y: 78 },
      { x: 240, y: 34 },
      { x: 320, y: 58 },
      { x: 400, y: 43 },
      { x: 480, y: 68 },
    ],
    []
  );

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="relative h-[260px] overflow-hidden rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-slate-950">עומס שיחות לפי שעות</p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            תצוגת פעילות יומית בזמן אמת
          </p>
        </div>

        <div className="rounded-2xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
          Live
        </div>
      </div>

      <div className="absolute inset-x-5 bottom-8 top-20">
        <div className="absolute inset-0 grid grid-rows-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="border-t border-dashed border-slate-100" />
          ))}
        </div>

        <svg
          viewBox="0 0 480 120"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <path
            d={`${path} L 480 120 L 0 120 Z`}
            fill="rgba(59,130,246,0.08)"
          />
          <path
            d={path}
            fill="none"
            stroke="rgba(59,130,246,0.75)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((point) => (
            <circle
              key={`${point.x}-${point.y}`}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="white"
              stroke="rgba(59,130,246,0.85)"
              strokeWidth="3"
            />
          ))}
        </svg>
      </div>

      <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-[11px] font-bold text-slate-400">
        <span>08:00</span>
        <span>10:00</span>
        <span>12:00</span>
        <span>14:00</span>
        <span>16:00</span>
      </div>
    </div>
  );
}

export default function StaffDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState("");

  const isSystemStaff =
    user?.effectiveRole === "system_staff" ||
    user?.isSystemStaff === true ||
    (user?.role === "staff" &&
      user?.staffType === "general_staff" &&
      user?.employeeScope === "system");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setError("לא נמצאה התחברות פעילה");
      return;
    }

    if (!isSystemStaff && user.role !== "admin") {
      setError("אין הרשאה לצפייה בעמדת הסופטפון");
    }
  }, [authLoading, user, isSystemStaff]);

  if (authLoading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen overflow-x-hidden bg-[#f7f8fb] px-4 py-4"
      >
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="rounded-[28px] border border-slate-200 bg-white px-8 py-7 text-center shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
            <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />

            <p className="text-sm font-bold text-slate-700">טוען סופטפון...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main
        dir="rtl"
        className="min-h-screen overflow-x-hidden bg-[#f7f8fb] px-4 py-4"
      >
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="max-w-md rounded-[28px] border border-red-200 bg-white p-8 text-center shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
            <p className="text-3xl">⚠️</p>

            <h1 className="mt-4 text-xl font-black text-slate-950">
              לא ניתן להציג את הסופטפון
            </h1>

            <p className="mt-3 text-sm leading-7 text-red-700">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#f7f8fb]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-28 -top-28 h-[360px] w-[360px] rounded-full bg-blue-100/60 blur-3xl" />
        <div className="absolute left-10 top-40 h-[280px] w-[280px] rounded-full bg-[#f0dec1]/70 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 h-[260px] w-[260px] rounded-full bg-emerald-100/50 blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="sticky top-0 z-50 border-b border-white/70 bg-[#f7f8fb]/80 px-3 py-3 backdrop-blur-2xl md:px-4">
          <SoftphoneStatusPanel />
        </div>

        <div className="grid min-h-[calc(100vh-96px)] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[260px_1fr]">
          <aside className="hidden rounded-[32px] border border-white/80 bg-white/85 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:block">
            <div className="mb-4 overflow-hidden rounded-[26px] bg-slate-950 px-5 py-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.22)]">
              <p className="text-[11px] font-black tracking-[0.28em] text-[#d8bd84]">
                INVISTIMO
              </p>

              <h2 className="mt-2 text-2xl font-black">Call Center</h2>

              <p className="mt-2 text-xs font-bold leading-5 text-slate-300">
                עמדת עבודה חכמה לניהול שיחות, זמינות ונציגים בזמן אמת.
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-[11px] font-bold text-slate-300">עובד מחובר</p>
                <p className="mt-1 truncate text-sm font-black text-white">
                  {user?.name || user?.email || "עובד מערכת"}
                </p>
              </div>
            </div>

            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm font-black transition ${
                    item.active
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-base shadow-sm">
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <section className="min-w-0 space-y-4">
            <header className="overflow-hidden rounded-[34px] border border-white/80 bg-white/85 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-xs font-black tracking-[0.28em] text-[#9b7a3c]">
                    INVISTIMO CALL CENTER
                  </p>

                  <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                    מרכז שליטה לשיחות
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-slate-500">
                    ניהול שיחות נכנסות, חיוג יוצא, זמינות נציגים, הפסקות, טיפול אחרי
                    שיחה ותיעוד פעילות — במסך עבודה אחד.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:w-[620px]">
                  {[
                    { label: "שיחות היום", value: "128", change: "+12%" },
                    { label: "ממוצע שיחה", value: "04:32", change: "-8%" },
                    { label: "נענו", value: "72%", change: "+6%" },
                    { label: "נציגים פעילים", value: "8", change: "Live" },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <p className="text-[11px] font-black text-slate-400">
                        {card.label}
                      </p>

                      <p className="mt-1 text-2xl font-black text-slate-950">
                        {card.value}
                      </p>

                      <p className="mt-1 text-xs font-black text-emerald-600">
                        {card.change}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
              <div className="rounded-[32px] border border-white/80 bg-white/85 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      ביצועי שיחות
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      סטטוס יומי לפי נציגים
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                    72% נענו
                  </div>
                </div>

                <div className="mt-7 flex justify-center">
                  <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-[conic-gradient(#3b82f6_0_72%,#eef2ff_72%_100%)]">
                    <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                      <p className="text-4xl font-black text-slate-950">72%</p>
                      <p className="text-xs font-bold text-slate-400">
                        שיחות שנענו
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-7 space-y-3">
                  {[
                    { label: "זמן פנוי", value: "03:18:44", tone: "emerald" },
                    { label: "זמן שיחה", value: "01:42:09", tone: "blue" },
                    { label: "הפסקות", value: "00:21:33", tone: "amber" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <span className="text-sm font-black text-slate-600">
                        {item.label}
                      </span>
                      <span dir="ltr" className="font-mono text-sm font-black text-slate-950">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <MiniLineChart />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-[32px] border border-white/80 bg-white/85 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      פעילות אחרונה
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      כל הפעולות האחרונות של הנציגים
                    </p>
                  </div>

                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                  >
                    הצג הכול
                  </button>
                </div>

                <div className="space-y-3">
                  {activities.map((activity) => {
                    const tone = toneClasses(activity.tone);

                    return (
                      <div
                        key={`${activity.title}-${activity.time}`}
                        className="flex items-center gap-3 rounded-[22px] border border-slate-100 bg-white px-4 py-3 shadow-sm"
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${tone.dot}`}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-950">
                            {activity.title}
                          </p>
                          <p className="mt-1 truncate text-xs font-bold text-slate-500">
                            {activity.subtitle}
                          </p>
                        </div>

                        <span className="text-xs font-black text-slate-400">
                          {activity.time}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/80 bg-white/85 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-950">התראות</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      אירועים חשובים לטיפול מהיר
                    </p>
                  </div>

                  <span className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
                    3 חדשות
                  </span>
                </div>

                <div className="space-y-3">
                  {alerts.map((alert) => {
                    const tone = toneClasses(alert.tone);

                    return (
                      <div
                        key={alert.title}
                        className={`flex items-center gap-3 rounded-[22px] border px-4 py-3 ${tone.bg} ${tone.border}`}
                      >
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-lg font-black ${tone.text}`}
                        >
                          {alert.icon}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-950">
                            {alert.title}
                          </p>
                          <p className="mt-1 truncate text-xs font-bold text-slate-500">
                            {alert.subtitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-white/70 p-4">
                  <p className="text-sm font-black text-slate-950">
                    טיפ חכם למנהל
                  </p>
                  <p className="mt-2 text-xs font-bold leading-6 text-slate-500">
                    כשנציג עובר ל״לא פנוי״ יותר מדי זמן, כדאי להציג התראה למנהל
                    ולבקש בחירת סיבה ברורה.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}