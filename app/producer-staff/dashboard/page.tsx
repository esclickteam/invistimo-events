"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/* ===============================
   Types
=============================== */
type StaffClient = {
  _id: string;
  name: string;
  email: string;
  event?: {
    _id: string;
    date?: string;
    location?: string;
    totalGuests?: number;
    approvedCount?: number;
  };
};

/* ===============================
   Page
=============================== */
export default function ProducerStaffDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [clients, setClients] = useState<StaffClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  /* ===============================
     Guard – הרשאות וניווט
  =============================== */
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "staff" || user.staffType !== "producer_staff") {
      router.replace("/");
      return;
    }
  }, [user, loading, router]);

  /* ===============================
     Fetch assigned clients + events
  =============================== */
  useEffect(() => {
    if (!user || user.role !== "staff") return;

    const fetchClients = async () => {
      setClientsLoading(true);
      try {
        const res = await fetch("/api/staff/clients", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          console.error("Failed to load staff clients");
          setClients([]);
          return;
        }

        const data = await res.json();
        setClients(Array.isArray(data.clients) ? data.clients : []);
      } catch (err) {
        console.error(err);
        setClients([]);
      } finally {
        setClientsLoading(false);
      }
    };

    fetchClients();
  }, [user]);

  if (loading || !user) {
    return <div style={{ padding: 32 }}>טוען…</div>;
  }

  /* ===============================
     Stats
  =============================== */
  const activeEvents = clients.filter((c) => c.event);
  const totalGuests = activeEvents.reduce(
    (sum, c) => sum + (c.event?.totalGuests || 0),
    0
  );
  const totalApproved = activeEvents.reduce(
    (sum, c) => sum + (c.event?.approvedCount || 0),
    0
  );

  /* ===============================
     UI
  =============================== */
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 8 }}>דשבורד עובד מפיק</h1>

      <p style={{ color: "#666", marginBottom: 24 }}>
        שלום {user.name}
      </p>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <DashboardCard title="אירועים פעילים" value={activeEvents.length} />
        <DashboardCard title="סה״כ מוזמנים" value={totalGuests} />
        <DashboardCard title="אישרו הגעה" value={totalApproved} />
      </div>

      {/* Clients / Events */}
      <h2 style={{ marginBottom: 12 }}>האירועים שלי</h2>

      {clientsLoading ? (
        <div>טוען אירועים…</div>
      ) : activeEvents.length === 0 ? (
        <div style={{ color: "#999" }}>לא הוקצו לך אירועים עדיין</div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#fff",
          }}
        >
          <thead>
            <tr style={{ background: "#f7f7f7", textAlign: "right" }}>
              <th style={th}>לקוח</th>
              <th style={th}>תאריך</th>
              <th style={th}>מקום</th>
              <th style={th}>אישרו</th>
              <th style={th}></th>
            </tr>
          </thead>

          <tbody>
            {activeEvents.map((c) => (
              <tr key={c._id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={td}>{c.name}</td>
                <td style={td}>
                  {c.event?.date
                    ? new Date(c.event.date).toLocaleDateString("he-IL")
                    : "—"}
                </td>
                <td style={td}>{c.event?.location || "—"}</td>
                <td style={td}>
                  {c.event?.approvedCount} / {c.event?.totalGuests}
                </td>
                <td style={td}>
                  <button
                    onClick={() =>
                      router.push(
                        `/events/production?eventId=${c.event!._id}`
                      )
                    }
                  >
                    ניהול
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ===============================
   Components
=============================== */

function DashboardCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 20,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 14, color: "#888" }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

/* ===============================
   Styles
=============================== */
const th = { padding: 12 };
const td = { padding: 12 };
