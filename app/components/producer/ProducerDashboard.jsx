"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { UserPlus, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
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
  const { user, loading: authLoading, setUser, setIsAuthenticated } = useAuth();

  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);

  // כדי למנוע "אין הרשאה" מוקדם מדי
  const [authResolved, setAuthResolved] = useState(false);

  /* =========================
     Ensure auth synced (important after set-password/login)
  ========================= */
  useEffect(() => {
    let mounted = true;

    const syncAuthFromServer = async () => {
      // מחכים שה-auth הראשוני יסיים
      if (authLoading) return;

      // אם כבר יש user אין צורך
      if (user) {
        if (mounted) setAuthResolved(true);
        return;
      }

      // fallback: ננסה למשוך את המשתמש מה-cookie (authToken כבר קיים)
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!mounted) return;

        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setUser?.(data.user);
            setIsAuthenticated?.(true);
          }
        }
      } catch (err) {
        console.error("Auth sync failed:", err);
      } finally {
        if (mounted) setAuthResolved(true);
      }
    };

    syncAuthFromServer();

    return () => {
      mounted = false;
    };
  }, [authLoading, user, setUser, setIsAuthenticated]);

  /* =========================
     Fetch Clients
  ========================= */
  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const res = await fetch("/api/producer/clients", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(
          "Failed to fetch producer clients:",
          res.status,
          text.slice(0, 300)
        );
        setClients([]);
        return;
      }

      const data = await res.json();
      setClients(Array.isArray(data?.clients) ? data.clients : []);
    } catch (err) {
      console.error("Failed to fetch producer clients:", err);
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authResolved) return;
    if (!user || user.role !== "producer") return;

    let isMounted = true;
    let intervalId;

    const run = async () => {
      if (!isMounted) return;
      await fetchClients();
    };

    run();
    intervalId = setInterval(run, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [authResolved, user, fetchClients]);

  /* =========================
     Impersonation
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

      if (!data.eventId) {
        alert("לא נמצא אירוע ללקוח");
        return;
      }

      window.location.href = `/events/production?eventId=${data.eventId}`;
    } catch (err) {
      console.error(err);
      alert("שגיאה בכניסה לניהול האירוע");
    }
  };

  /* =========================
     Stats
  ========================= */
  const stats = useMemo(() => {
    const withEvent = clients.filter((c) => c.event);

    return {
      activeCount: withEvent.length,
      upcomingWeekCount: withEvent.filter(
        (c) => c.event?.date && isWithinDays(c.event.date, 7)
      ).length,
      totalGuests: withEvent.reduce(
        (sum, c) => sum + (c.event?.totalGuests || 0),
        0
      ),
      totalConfirmed: withEvent.reduce(
        (sum, c) => sum + (c.event?.approvedCount || 0),
        0
      ),
    };
  }, [clients]);

  /* =========================
     Guards
  ========================= */
  if (authLoading || !authResolved) return <div className="p-6">טוען…</div>;
  if (!user) return <div className="p-6">לא מחובר</div>;
  if (user.role !== "producer") return <div className="p-6">אין הרשאה</div>;

  /* =========================
     UI
  ========================= */
  return (
    <div className="p-6 space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">דשבורד מפיק</h1>

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
                <tr key={client._id} className="border-b hover:bg-slate-50">
                  <td className="p-4 font-medium">{client.name}</td>
                  <td className="p-4">{client.email}</td>
                  <td className="p-4">{client.phone}</td>

                  <td className="p-4">
                    {client.event?.date ? (
                      new Date(client.event.date).toLocaleDateString("he-IL")
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="p-4">
                    {client.event?.location || (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="p-4 font-medium">
                    {client.event ? (
                      `${client.event.approvedCount} / ${client.event.totalGuests}`
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
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
