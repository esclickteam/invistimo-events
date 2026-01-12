"use client";

import { useMemo } from "react";
import {
  CalendarDays,
  Users,
  CheckCircle2,
  Plus,
  MapPin,
  ArrowUpRight,
  ListChecks,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.55, ease: "easeOut" },
  }),
};

function isWithinDays(dateStr, days) {
  const d = new Date(dateStr);
  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + days);

  // לנקות שעות כדי לא "לפספס" בגלל שעה
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nn = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ee = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  return dd >= nn && dd <= ee;
}

export default function ProducerDashboard() {
  // ⚙️ נתונים מדומים זמניים
  const events = [
    {
      id: 1,
      title: "חתונת דניאל וטל",
      date: "2026-03-25",
      location: "גן האירועים הרמוניה בגן",
      guests: 280,
      confirmed: 230,
      status: "active",
    },
    {
      id: 2,
      title: "בר מצווה של עומר",
      date: "2026-02-10",
      location: "אולמי דניאלה",
      guests: 150,
      confirmed: 120,
      status: "active",
    },
  ];

  const stats = useMemo(() => {
    const activeEvents = events.filter((e) => e.status === "active");
    const upcomingWeek = activeEvents.filter((e) => isWithinDays(e.date, 7));
    const totalGuests = activeEvents.reduce((sum, e) => sum + (e.guests || 0), 0);
    const totalConfirmed = activeEvents.reduce(
      (sum, e) => sum + (e.confirmed || 0),
      0
    );

    const sorted = [...activeEvents].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const nextEvent = sorted[0] || null;

    return {
      activeCount: activeEvents.length,
      upcomingWeekCount: upcomingWeek.length,
      totalGuests,
      totalConfirmed,
      nextEvent,
    };
  }, [events]);

  const nextEvent = stats.nextEvent;

  return (
    <div className="p-6 space-y-8">
      {/* =====================
          כרטיסי סטטוס עליונים
      ====================== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-500">אירועים פעילים</h3>
            <CalendarDays className="w-5 h-5 text-[var(--brand-purple)]" />
          </div>
          <p className="text-3xl font-bold mt-2 text-slate-900">
            {stats.activeCount}
          </p>
          <p className="text-xs text-gray-500 mt-1">כל האירועים שבניהולך</p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-500">אירועים בשבוע הקרוב</h3>
            <CheckCircle2 className="w-5 h-5 text-[var(--brand-cyan-strong)]" />
          </div>
          <p className="text-3xl font-bold mt-2 text-slate-900">
            {stats.upcomingWeekCount}
          </p>
          <p className="text-xs text-gray-500 mt-1">7 ימים קדימה</p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-500">סה״כ מוזמנים</h3>
            <Users className="w-5 h-5 text-[var(--brand-purple)]" />
          </div>
          <p className="text-3xl font-bold mt-2 text-slate-900">
            {stats.totalGuests}
          </p>
          <p className="text-xs text-gray-500 mt-1">אירועים פעילים בלבד</p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-500">אישרו הגעה</h3>
            <ListChecks className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold mt-2 text-slate-900">
            {stats.totalConfirmed}
          </p>
          <p className="text-xs text-gray-500 mt-1">סה״כ אישורים</p>
        </motion.div>
      </div>

      {/* =====================
          האירוע הבא שלי
      ====================== */}
      {nextEvent ? (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-2xl p-6 shadow-sm border border-gray-100"
          style={{
            background: "linear-gradient(90deg, #faf6ff 0%, #fef9f3 100%)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <span>האירוע הבא שלי</span> <span>🎉</span>
              </h2>

              <div className="mt-3">
                <h3 className="text-lg font-bold text-slate-900">
                  {nextEvent.title}
                </h3>

                <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 text-sm text-gray-700">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[var(--brand-purple)]" />
                    {new Date(nextEvent.date).toLocaleDateString("he-IL")}
                  </span>

                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[var(--brand-purple)]" />
                    {nextEvent.location}
                  </span>

                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[var(--brand-purple)]" />
                    {nextEvent.confirmed}/{nextEvent.guests} אישרו
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2 min-w-[200px]">
              <Button
                className="rounded-xl px-5 py-2 bg-white border border-gray-200 text-slate-900 hover:bg-gray-50 transition"

                onClick={() => {
                  // בהמשך ננווט לניהול האירוע (למשל /dashboard/event/[id])
                  // כרגע זה placeholder
                  alert("בקרוב: ניווט לניהול האירוע");
                }}
              >
                כניסה לניהול האירוע
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>

              <Button
  className="rounded-xl px-5 py-2 bg-white border border-gray-200 text-slate-900 hover:bg-gray-50 transition"
  onClick={() => alert("בקרוב: פתיחת צ׳ק-אין")}
>
  צ׳ק-אין / כניסה
</Button>

            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                אין אירועים קרובים כרגע
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                אפשר ליצור אירוע חדש ולהתחיל לעבוד.
              </p>
            </div>

            <Button
              className="rounded-xl px-5 py-2 bg-white border border-gray-200 text-slate-900 hover:bg-gray-50 transition"

              onClick={() => alert("בקרוב: פתיחת יצירת אירוע")}
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף אירוע חדש
            </Button>
          </div>
        </motion.div>
      )}

      {/* =====================
          טבלת האירועים שלי
      ====================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-slate-900">האירועים שלי</h2>

          <Button
  className="flex items-center gap-2 bg-white border border-gray-200 text-slate-900 rounded-xl px-4 py-2 hover:bg-gray-50 transition"
  onClick={() => alert("בקרוב: יצירת אירוע + יצירת לקוח")}
>
  <Plus className="w-4 h-4" />
  הוסף אירוע חדש
</Button>

        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="min-w-full text-sm text-right">
            <thead className="bg-[#fbfafc] text-gray-600">
              <tr>
                <th className="p-3 font-medium">תאריך</th>
                <th className="p-3 font-medium">שם האירוע</th>
                <th className="p-3 font-medium">מיקום</th>
                <th className="p-3 font-medium">מוזמנים</th>
                <th className="p-3 font-medium">אישרו הגעה</th>
                <th className="p-3 font-medium">סטטוס</th>
                <th className="p-3 font-medium">פעולות</th>
              </tr>
            </thead>

            <tbody>
              {events.map((ev) => {
                const isActive = ev.status === "active";
                return (
                  <tr
                    key={ev.id}
                    className="border-t hover:bg-gray-50/70 transition text-slate-900"
                  >
                    <td className="p-3 text-gray-700">
                      {new Date(ev.date).toLocaleDateString("he-IL")}
                    </td>

                    <td className="p-3 font-semibold">{ev.title}</td>

                    <td className="p-3 text-gray-700">{ev.location}</td>

                    <td className="p-3 text-gray-800">{ev.guests}</td>

                    <td className="p-3 text-gray-800">{ev.confirmed}</td>

                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {isActive ? "פעיל" : "לא פעיל"}
                      </span>
                    </td>

                    <td className="p-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-[var(--brand-purple)] font-medium hover:underline"
                        onClick={() => alert(`בקרוב: ניהול אירוע ${ev.id}`)}
                      >
                        ניהול
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* שורת עזר קטנה */}
        <div className="text-xs text-gray-500 mt-2">
          טיפ: בהמשך נוסיף חיפוש, פילטרים (היום/שבוע/חודש), וייצוא דוחות.
        </div>
      </div>
    </div>
  );
}
