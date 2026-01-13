"use client";

import { useEffect, useMemo, useState } from "react";
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
import CreateClientAndEvent from "@/app/components/producer/CreateClientAndEvent";
import { useAuth } from "@/context/AuthContext";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.55, ease: "easeOut" },
  }),
};

/* =========================================================
   פונקציית עזר — לבדוק אם תאריך בתוך X ימים קדימה
========================================================= */
function isWithinDays(dateStr, days) {
  const d = new Date(dateStr);
  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + days);
  return d >= now && d <= end;
}

/* =========================================================
   רכיב ראשי: דשבורד של מפיק אירועים
========================================================= */
export default function ProducerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
const [eventsLoading, setEventsLoading] = useState(false);

  /* =========================================================
     שליפת אירועים שקשורים למפיק (לפי producerId)
  ========================================================= */
  useEffect(() => {

    if (!user?._id) return;

const fetchEvents = async () => {
  setEventsLoading(true);

  try {
    const res = await fetch(`/api/events?producerId=${user._id}`, {
      cache: "no-store",
    });
    const data = await res.json();

    if (data.success) {
      setEvents(data.events);
    } else {
      console.error("❌ שגיאה בטעינת אירועים:", data.error);
    }
  } catch (err) {
    console.error("❌ שגיאה בטעינה:", err);
  } finally {
    setEventsLoading(false);
  }
};


    fetchEvents();
  }, [user?._id]);

  /* =========================================================
     חישוב נתוני סטטיסטיקות כלליים
  ========================================================= */
  const stats = useMemo(() => {
    const activeEvents = events.filter((e) => e.status === "active");
    const upcomingWeek = activeEvents.filter((e) => isWithinDays(e.date, 7));
    const totalGuests = activeEvents.reduce(
      (sum, e) => sum + (e.maxGuests || 0),
      0
    );

    const nextEvent = [...activeEvents].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    )[0];

    return {
      activeCount: activeEvents.length,
      upcomingWeekCount: upcomingWeek.length,
      totalGuests,
      totalConfirmed: 0,
      nextEvent: nextEvent || null,
    };
  }, [events]);

  const nextEvent = stats.nextEvent;

  /* =========================================================
   Guards – חובה
========================================================= */
if (authLoading) {
  return <div className="p-6">🔐 טוען משתמש...</div>;
}

if (!user) {
  return <div className="p-6">❌ לא מחובר</div>;
}

if (eventsLoading) {
  return <div className="p-6">🔄 טוען אירועים...</div>;
}



  /* =========================================================
     Render
  ========================================================= */
  return (
    <div className="p-6 space-y-8">
      {/* =====================
          כרטיסי סטטוס עליונים
      ====================== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* אירועים פעילים */}
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

        {/* אירועים בשבוע הקרוב */}
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

        {/* סה"כ מוזמנים */}
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

        {/* סה"כ אישרו הגעה */}
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
                    {nextEvent.maxGuests} מוזמנים
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2 min-w-[200px]">
              <Button
                className="bg-[var(--brand-purple)] text-white rounded-xl px-5 py-2 font-medium hover:bg-[var(--brand-purple-hover)] hover:shadow-md hover:-translate-y-[1px] transition"
                onClick={() => alert("בקרוב: ניהול האירוע")}
              >
                כניסה לניהול האירוע
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>

              <Button
                variant="outline"
                className="rounded-xl px-5 py-2 bg-white hover:bg-gray-50 transition border-gray-200 text-slate-900"
                onClick={() => alert("בקרוב: צ׳ק-אין לאירוע")}
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
              onClick={() => alert("בקרוב: יצירת אירוע חדש")}
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף אירוע חדש
            </Button>
          </div>
        </motion.div>
      )}

      {/* =====================
          טופס יצירת לקוח + אירוע חדש
      ====================== */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <CreateClientAndEvent producerId={user?._id} />
      </div>

      {/* =====================
          טבלת האירועים שלי
      ====================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-slate-900">האירועים שלי</h2>

          <Button
            className="flex items-center gap-2 bg-white border border-gray-200 text-slate-900 rounded-xl px-4 py-2 hover:bg-gray-50 transition"
            onClick={() => alert("בקרוב: יצירת אירוע + לקוח")}
          >
            <Plus className="w-4 h-4" />
            הוסף אירוע חדש
          </Button>
        </div>

        {events.length === 0 ? (
          <p className="text-gray-600">אין אירועים להצגה כרגע.</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="min-w-full text-sm text-right">
              <thead className="bg-[#fbfafc] text-gray-600">
                <tr>
                  <th className="p-3 font-medium">תאריך</th>
                  <th className="p-3 font-medium">שם האירוע</th>
                  <th className="p-3 font-medium">מיקום</th>
                  <th className="p-3 font-medium">מוזמנים</th>
                  <th className="p-3 font-medium">סטטוס</th>
                  <th className="p-3 font-medium">פעולות</th>
                </tr>
              </thead>

              <tbody>
                {events.map((ev) => (
                  <tr
                    key={ev._id}
                    className="border-t hover:bg-gray-50/70 transition text-slate-900"
                  >
                    <td className="p-3 text-gray-700">
                      {ev.date
                        ? new Date(ev.date).toLocaleDateString("he-IL")
                        : "-"}
                    </td>
                    <td className="p-3 font-semibold">{ev.title}</td>
                    <td className="p-3 text-gray-700">{ev.location || "-"}</td>
                    <td className="p-3 text-gray-800">{ev.maxGuests || "-"}</td>
                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          ev.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {ev.status === "active" ? "פעיל" : "לא פעיל"}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-[var(--brand-purple)] font-medium hover:underline"
                        onClick={() => alert(`בקרוב: ניהול ${ev.title}`)}
                      >
                        ניהול
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-2">
          טיפ: בהמשך נוסיף חיפוש, פילטרים וייצוא דוחות.
        </div>
      </div>
    </div>
  );
}
