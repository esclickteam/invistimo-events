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
  UserPlus,
  X,
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
        }
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
    const active = events.filter((e) => e.status === "active");
    return {
      activeCount: active.length,
      upcomingWeekCount: active.filter((e) => isWithinDays(e.date, 7)).length,
      totalGuests: active.reduce((s, e) => s + (e.maxGuests || 0), 0),
      totalConfirmed: 0,
    };
  }, [events]);

  if (authLoading) return <div className="p-6">טוען…</div>;
  if (!user) return <div className="p-6">לא מחובר</div>;

  return (
    <div className="p-6 space-y-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">דשבורד מפיק</h1>

        <Button
          onClick={() => setShowCreateClient(true)}
          className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex gap-2"
        >
          <UserPlus className="w-4 h-4" />
          יצירת לקוח חדש
        </Button>
      </div>

      {/* Create Client – PROFESSIONAL FORM */}
      {showCreateClient && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-slate-50 border border-slate-200 rounded-2xl shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-[var(--brand-purple)]/10 text-[var(--brand-purple)] p-2 rounded-lg">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  יצירת לקוח חדש
                </h2>
                <p className="text-sm text-slate-500">
                  פתיחת לקוח חדש וניהול האירועים שלו
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateClient(false)}
              className="p-2 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <CreateClientByProducer
              onSuccess={() => {
                setShowCreateClient(false);
              }}
            />
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          ["אירועים פעילים", stats.activeCount],
          ["בשבוע הקרוב", stats.upcomingWeekCount],
          ['סה״כ מוזמנים', stats.totalGuests],
          ["אישרו הגעה", stats.totalConfirmed],
        ].map(([label, value], i) => (
          <motion.div
            key={label}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={i}
            className="bg-white rounded-2xl p-5 border"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
