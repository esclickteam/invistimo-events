"use client";

import { useEffect, useMemo, useState } from "react";
import { UserPlus, X, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import CreateClientByProducer from "@/app/components/producer/CreateClientByProducer";
import { useAuth } from "@/context/AuthContext";
import CreateClientModal from "@/app/components/producer/CreateClientModal";

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
  let isMounted = true;

  const fetchEvents = async () => {
    setEventsLoading(true);
    try {
      const res = await fetch("/api/invitations/my", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to fetch invitation:", res.status, text.slice(0, 200));
        return;
      }

      const data = await res.json();

      if (!isMounted) return;

      const event =
        data?.invitation?.event ||
        (data?.invitation?.eventId ? { _id: data.invitation.eventId } : null);

      setEvents(event ? [event] : []);
    } catch (err) {
      console.error("Failed to fetch producer events:", err);
      if (isMounted) setEvents([]);
    } finally {
      if (isMounted) setEventsLoading(false);
    }
  };

  fetchEvents();

  return () => {
    isMounted = false;
  };
}, []);



  /* =========================
     Fetch Clients (table)
  ========================= */
  useEffect(() => {
  let isMounted = true;
  let intervalId;

  const fetchClients = async () => {
    if (isMounted) setClientsLoading(true);

    try {
      const res = await fetch("/api/producer/clients", {
        cache: "no-store",
        credentials: "include",
      });

      // ✅ guard לפני json
      if (!res.ok) {
        const text = await res.text();
        console.error(
          "Failed to fetch producer clients:",
          res.status,
          text.slice(0, 200)
        );
        if (isMounted) setClients([]);
        return;
      }

      const data = await res.json();

      if (!isMounted) return;

      if (data?.success) {
        setClients(Array.isArray(data.clients) ? data.clients : []);
      } else {
        setClients([]);
      }
    } catch (err) {
      console.error("Failed to fetch producer clients:", err);
      if (isMounted) setClients([]);
    } finally {
      if (isMounted) setClientsLoading(false);
    }
  };

  fetchClients();

  // 🔁 ריפרוש כל 30 שניות
  intervalId = setInterval(fetchClients, 30000);

  return () => {
    isMounted = false;
    clearInterval(intervalId);
  };
}, []);



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
      alert("שגיאה בכניסה ללקוח");
      return;
    }

    // ✅ eventId חייב להגיע מהשרת
    const eventId = data.eventId;

    if (!eventId) {
      alert("לא נמצא אירוע ללקוח");
      return;
    }

    // 🎬 כניסה ישירה להפקת האירוע
    window.location.href = `/events/production?eventId=${eventId}`;
  } catch (err) {
    console.error(err);
    alert("שגיאה בכניסה לניהול האירוע");
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
      <CreateClientModal
  open={showCreateClient}
  onClose={() => setShowCreateClient(false)}
/>

    </div>
  );
}
