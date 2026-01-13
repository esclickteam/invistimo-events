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
import CreateClientByProducer from "@/app/components/producer/CreateClientByProducer";
import { useAuth } from "@/context/AuthContext";

/* =========================
   Animations
========================= */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.55, ease: "easeOut" },
  }),
};

/* =========================
   Utils
========================= */
function isWithinDays(dateStr, days) {
  const d = new Date(dateStr);
  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + days);
  return d >= now && d <= end;
}

/* =========================
   Producer Dashboard
========================= */
export default function ProducerDashboard() {
  const { user, loading: authLoading } = useAuth();

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // פתיחה / סגירה של מיני טופס
  const [showCreateClient, setShowCreateClient] = useState(false);

  /* =========================
     Fetch Events
  ========================= */
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
          setEvents(Array.isArray(data.events) ? data.events : []);
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

  /* =========================
     Stats
  ========================= */
  const stats = useMemo(() => {
    const safeEvents = Array.isArray(events) ? events : [];
    const activeEvents = safeEvents.filter((e) => e.status === "active");
    const upcomingWeek = activeEvents.filter((e) =>
      isWithinDays(e.date, 7)
    );

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

  /* =========================
     Guards
  ========================= */
  if (authLoading) return <div className="p-6">🔐 טוען משתמש...</div>;
  if (!user) return <div className="p-6">❌ לא מחובר</div>;
  if (eventsLoading) return <div className="p-6">🔄 טוען אירועים...</div>;

  /* =========================
     Render
  ========================= */
  return (
    <div className="p-6 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">דשבורד מפיק</h1>

        <Button
          className="flex items-center gap-2 bg-[var(--brand-purple)] text-white rounded-xl px-4 py-2"
          onClick={() => setShowCreateClient(true)}
        >
          <Plus className="w-4 h-4" />
          יצירת לקוח חדש
        </Button>
      </div>

      {/* Mini Create Client Form */}
      {showCreateClient && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              יצירת לקוח חדש
            </h2>

            <button
              onClick={() => setShowCreateClient(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              סגור ✕
            </button>
          </div>

          <CreateClientByProducer
            onSuccess={() => {
              setShowCreateClient(false);
              alert("הלקוח נוצר בהצלחה");
            }}
          />
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-2xl p-5 border">
          <h3 className="text-sm text-gray-500">אירועים פעילים</h3>
          <p className="text-3xl font-bold">{stats.activeCount}</p>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-2xl p-5 border">
          <h3 className="text-sm text-gray-500">בשבוע הקרוב</h3>
          <p className="text-3xl font-bold">{stats.upcomingWeekCount}</p>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-2xl p-5 border">
          <h3 className="text-sm text-gray-500">סה״כ מוזמנים</h3>
          <p className="text-3xl font-bold">{stats.totalGuests}</p>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-2xl p-5 border">
          <h3 className="text-sm text-gray-500">אישרו הגעה</h3>
          <p className="text-3xl font-bold">{stats.totalConfirmed}</p>
        </motion.div>
      </div>

      {/* Events Table */}
      <div>
        <h2 className="text-xl font-semibold mb-3">האירועים שלי</h2>

        {events.length === 0 ? (
          <p className="text-gray-600">אין אירועים להצגה כרגע.</p>
        ) : (
          <div className="bg-white rounded-2xl border overflow-x-auto">
            <table className="min-w-full text-sm text-right">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3">תאריך</th>
                  <th className="p-3">שם</th>
                  <th className="p-3">מיקום</th>
                  <th className="p-3">מוזמנים</th>
                  <th className="p-3">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev._id} className="border-t">
                    <td className="p-3">
                      {ev.date
                        ? new Date(ev.date).toLocaleDateString("he-IL")
                        : "-"}
                    </td>
                    <td className="p-3 font-semibold">{ev.title}</td>
                    <td className="p-3">{ev.location || "-"}</td>
                    <td className="p-3">{ev.maxGuests || "-"}</td>
                    <td className="p-3">
                      {ev.status === "active" ? "פעיל" : "לא פעיל"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
