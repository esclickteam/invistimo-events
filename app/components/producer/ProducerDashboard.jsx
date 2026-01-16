"use client";

import { useEffect, useMemo, useState } from "react";
import { UserPlus, X, ArrowUpRight } from "lucide-react";
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
  const [clients, setClients] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);

  /* =========================
     Fetch Events (stats only)
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
     Fetch Clients (table)
  ========================= */
  useEffect(() => {
    if (!user?._id) return;

    const fetchClients = async () => {
      setClientsLoading(true);
      try {
        const res = await fetch("/api/producer/clients", {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.success) {
          setClients(data.clients || []);
        }
      } finally {
        setClientsLoading(false);
      }
    };

    fetchClients();
  }, [user?._id]);

  /* =========================
     Impersonation (ניהול לקוח)
  ========================= */
  const handleManageClient = async (clientId) => {
    try {
      const res = await fetch("/api/producer/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ clientId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert("שגיאה בכניסה לדשבורד הלקוח");
        return;
      }

      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      alert("שגיאה בכניסה לדשבורד הלקוח");
    }
  };

  /* =========================
     Stats
  ========================= */
  const stats = useMemo(() => {
    const active = events.filter((e) => e.status === "active");
    return {
      activeCount: active.length,
      upcomingWeekCount: active.filter((e) =>
        isWithinDays(e.date, 7)
      ).length,
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
        <h1 className="text-2xl font-bold text-slate-900">
          דשבורד מפיק
        </h1>

        <Button
          onClick={() => setShowCreateClient(true)}
          className="bg-[#3b2a22] hover:bg-[#2f211a] text-white rounded-full px-6 py-3 text-sm font-semibold flex items-center gap-2 shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          יצירת לקוח חדש
        </Button>
      </div>

      {/* Create Client */}
      {showCreateClient && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-slate-50 border border-slate-200 rounded-2xl shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">יצירת לקוח חדש</h2>

            <button
              onClick={() => setShowCreateClient(false)}
              className="p-2 rounded-lg hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <CreateClientByProducer
            onSuccess={() => setShowCreateClient(false)}
          />
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          ["אירועים פעילים", stats.activeCount],
          ["בשבוע הקרוב", stats.upcomingWeekCount],
          ["סה״כ מוזמנים", stats.totalGuests],
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
            <p className="text-3xl font-bold">{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Clients Table */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-4 font-semibold text-lg">לקוחות</div>

        {clientsLoading ? (
          <div className="p-6 text-slate-500">טוען לקוחות…</div>
        ) : clients.length === 0 ? (
          <div className="p-6 text-slate-500">עדיין לא נוצרו לקוחות</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-right">
                <th className="p-4">שם</th>
                <th className="p-4">אימייל</th>
                <th className="p-4">טלפון</th>
                <th className="p-4">תאריך אירוע</th>
                <th className="p-4">מקום</th>
                <th className="p-4">אישרו</th>
                <th className="p-4"></th>
              </tr>
            </thead>

            <tbody>
              {clients.map((client) => (
                <tr
                  key={client._id}
                  className="border-b hover:bg-slate-50"
                >
                  <td className="p-4 font-medium">{client.name}</td>
                  <td className="p-4">{client.email}</td>
                  <td className="p-4">{client.phone}</td>

                  <td className="p-4">
                    {client.event?.date
                      ? new Date(client.event.date).toLocaleDateString("he-IL")
                      : <span className="text-slate-400">—</span>}
                  </td>

                  <td className="p-4">
                    {client.event?.location || (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="p-4 font-medium">
                    {client.event
                      ? `${client.event.approvedCount} / ${client.event.totalGuests}`
                      : <span className="text-slate-400">—</span>}
                  </td>

                  <td className="p-4">
                    <Button
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => handleManageClient(client._id)}
                    >
                      ניהול
                      <ArrowUpRight className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
