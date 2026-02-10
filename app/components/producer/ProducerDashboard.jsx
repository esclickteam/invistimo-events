"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { UserPlus, ArrowUpRight, ChevronDown } from "lucide-react";
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

  /* ===== NEW: Staff assignment states ===== */
  const [staffList, setStaffList] = useState([]); // [{ _id,name,email,assignedClientIds }]
  const [staffLoading, setStaffLoading] = useState(false);
  const [openAssignForClientId, setOpenAssignForClientId] = useState(null);
  const [savingClientId, setSavingClientId] = useState(null);

  // חיפוש עובדים בתוך כל דרופדאון לפי clientId
  const [staffSearchByClientId, setStaffSearchByClientId] = useState({});

  const assignMenuRef = useRef(null);

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

  /* =========================
     NEW: Fetch Staff List
  ========================= */
  const fetchStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const res = await fetch("/api/producer/staff/list", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(
          "Failed to fetch producer staff:",
          res.status,
          text.slice(0, 300)
        );
        setStaffList([]);
        return;
      }

      const data = await res.json();
      setStaffList(Array.isArray(data?.staff) ? data.staff : []);
    } catch (err) {
      console.error("Failed to fetch producer staff:", err);
      setStaffList([]);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authResolved) return;
    if (!user || user.role !== "producer") return;

    let isMounted = true;
    let intervalId;

    const run = async () => {
      if (!isMounted) return;
      await Promise.all([fetchClients(), fetchStaff()]);
    };

    run();
    intervalId = setInterval(run, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [authResolved, user, fetchClients, fetchStaff]);

  /* =========================
     Close dropdown on outside click
  ========================= */
  useEffect(() => {
    const onClickOutside = (e) => {
      if (!openAssignForClientId) return;
      if (assignMenuRef.current && !assignMenuRef.current.contains(e.target)) {
        setOpenAssignForClientId(null);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openAssignForClientId]);

  /* =========================
     Impersonation
  ========================= */
  const handleManageClient = async (clientId) => {
  try {
    const res = await fetch("/api/producer/impersonate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ clientId }),
    });

    const data = await res.json();

    if (!res.ok || !data?.success) {
      alert(data?.message || "שגיאה בכניסה ללקוח");
      return;
    }

    // ✅ כניסה ישירה לדשבורד הלקוח (גם אם אין אירוע)
    window.location.href = data?.redirect || "/dashboard";
  } catch (err) {
    console.error("❌ handleManageClient error:", err);
    alert("שגיאה בכניסה לניהול הלקוח");
  }
};



  /* =========================
     NEW: Assignment helpers
  ========================= */
  const isClientAssignedToStaff = useCallback((clientId, staff) => {
    const ids = Array.isArray(staff?.assignedClientIds)
      ? staff.assignedClientIds
      : [];
    return ids.some((id) => String(id) === String(clientId));
  }, []);

  const assignedStaffNamesForClient = useCallback(
    (clientId) => {
      const names = staffList
        .filter((s) => isClientAssignedToStaff(clientId, s))
        .map((s) => s.name);

      if (names.length === 0) return "ללא";
      if (names.length <= 2) return names.join(", ");
      return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
    },
    [staffList, isClientAssignedToStaff]
  );

  // NEW: סינון עובדים לפי חיפוש בדרופדאון (שם/אימייל)
  const getFilteredStaffForClient = useCallback(
    (clientId) => {
      const q = String(staffSearchByClientId?.[String(clientId)] || "")
        .trim()
        .toLowerCase();

      if (!q) return staffList;

      return staffList.filter((s) => {
        const name = String(s?.name || "").toLowerCase();
        const email = String(s?.email || "").toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    },
    [staffList, staffSearchByClientId]
  );

  const toggleAssignClientToStaff = async (client, staff, shouldAssign) => {
  try {
    setSavingClientId(String(client._id));

    const res = await fetch("/api/producer/staff/assign-clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        staffId: String(staff._id),
        clientId: String(client._id),
        action: shouldAssign ? "add" : "remove",
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || "שגיאה בשמירה");
    }

    // ✅ עדכון לוקאלי לפי מה שחזר מהשרת
    setStaffList((prev) =>
      prev.map((s) =>
        String(s._id) === String(staff._id)
          ? { ...s, assignedClientIds: data.assignedClientIds }
          : s
      )
    );
  } catch (err) {
    console.error(err);
    alert(err.message || "שגיאה בשמירת ההקצאה");
  } finally {
    setSavingClientId(null);
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
          יצירת משתמש חדש
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
      <div className="bg-white border rounded-2xl">

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
                <th className="p-4">הקצאה לעובד/ים</th>
                <th className="p-4"></th>
              </tr>
            </thead>

            <tbody>
              {clients.map((client) => {
                const isOpen = openAssignForClientId === String(client._id);
                const isSavingThisRow = savingClientId === String(client._id);
                const filteredStaff = getFilteredStaffForClient(client._id);

                return (
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

                    {/* NEW: assignment dropdown */}
                    <td className="p-4 relative">
                      <div
                        className="inline-flex items-center gap-2"
                        ref={isOpen ? assignMenuRef : null}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() =>
                            setOpenAssignForClientId((prev) =>
                              prev === String(client._id)
                                ? null
                                : String(client._id)
                            )
                          }
                        >
                          {isSavingThisRow
                            ? "שומר..."
                            : assignedStaffNamesForClient(client._id)}
                          <ChevronDown className="w-4 h-4" />
                        </Button>

                        {isOpen && (
                          <div className="absolute z-50 mt-2 min-w-[320px] rounded-xl border bg-white shadow-lg p-2">
                            <div className="px-2 py-1 text-xs text-slate-500 border-b mb-2">
                              בחרי עובד/ים ללקוח זה
                            </div>

                            {/* NEW: חיפוש עובדים */}
                            <div className="px-2 pb-2">
                              <input
                                type="text"
                                value={
                                  staffSearchByClientId[String(client._id)] || ""
                                }
                                onChange={(e) =>
                                  setStaffSearchByClientId((prev) => ({
                                    ...prev,
                                    [String(client._id)]: e.target.value,
                                  }))
                                }
                                placeholder="חיפוש לפי שם/אימייל..."
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                              />
                            </div>

                            {staffLoading ? (
                              <div className="px-2 py-2 text-sm text-slate-500">
                                טוען עובדים…
                              </div>
                            ) : filteredStaff.length === 0 ? (
                              <div className="px-2 py-2 text-sm text-slate-500">
                                לא נמצאו עובדים
                              </div>
                            ) : (
                              <div className="max-h-64 overflow-auto">
                                {filteredStaff.map((staff) => {
                                  const checked = isClientAssignedToStaff(
                                    client._id,
                                    staff
                                  );
                                  return (
                                    <label
                                      key={staff._id}
                                      className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={isSavingThisRow}
                                        onChange={(e) =>
                                          toggleAssignClientToStaff(
                                            client,
                                            staff,
                                            e.target.checked
                                          )
                                        }
                                      />
                                      <span className="text-sm">
                                        {staff.name}{" "}
                                        <span className="text-slate-500">
                                          ({staff.email})
                                        </span>
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            <div className="pt-2 mt-1 border-t flex items-center justify-between">
                              <span className="text-xs text-slate-500">
                                מוקצים כרגע:{" "}
                                {
                                  staffList.filter((s) =>
                                    isClientAssignedToStaff(client._id, s)
                                  ).length
                                }
                              </span>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setOpenAssignForClientId(null)}
                              >
                                סגור
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <CreateClientModal
        open={showCreateClient}
        onClose={() => setShowCreateClient(false)}
        onSuccess={async () => {
          await Promise.all([fetchClients(), fetchStaff()]);
        }}
      />
    </div>
  );
}

