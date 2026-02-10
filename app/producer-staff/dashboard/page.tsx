"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProducerDashboardHeader from "@/app/dashboard/ProducerDashboardHeader";

/* ===============================
   Types
=============================== */
type AssignedUser = {
  _id: string;
  name?: string;
  email?: string;
  role: "client" | "user";
  event?: {
    _id: string;
    date?: string;
    location?: {
      address?: string;
    };
    totalGuests?: number;
    approvedCount?: number;
  };
};

export default function ProducerStaffDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AssignedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  /* ===============================
     Guard – הרשאות
  =============================== */
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user?.role !== "staff" || user?.staffType !== "producer_staff") {
  router.replace("/");
}


  }, [user, loading, router]);

  /* ===============================
     Fetch assigned users
  =============================== */
  useEffect(() => {
    if (user?.role !== "staff") return;


    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const res = await fetch("/api/producer-staff/clients", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          setUsers([]);
          return;
        }

        const data = await res.json();
        setUsers(Array.isArray(data.clients) ? data.clients : []);

      } catch {
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  /* ===============================
     Impersonate & enter
  =============================== */
  const handleEnterUser = async (targetUserId: string) => {
    try {
      const res = await fetch("/api/producer-staff/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetUserId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "אין הרשאה");
        return;
      }

      if (data.eventId) {
        window.location.href = `/events/production?eventId=${data.eventId}`;
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      alert("שגיאה בכניסה");
    }
  };

  if (loading || !user) {
    return <div style={{ padding: 32 }}>טוען…</div>;
  }

  /* ===============================
     Stats
  =============================== */
  const totalEvents = users.filter((u) => u.role === "client" && u.event).length;

  const totalGuests = users.reduce((sum, u) => sum + (u.event?.totalGuests || 0), 0);

  const totalApproved = users.reduce((sum, u) => sum + (u.event?.approvedCount || 0), 0);

  const rows = useMemo(() => {
    return users.map((u) => {
      const total = u.event?.totalGuests || 0;
      const approved = u.event?.approvedCount || 0;

      return {
        id: u._id,
        name: u.name || "לקוח",
        email: u.email || "—",
        phone: "—", // אם אין phone במודל כרגע
        date: u.event?.date
          ? new Date(u.event.date).toLocaleDateString("he-IL")
          : "—",
        location:
  typeof u.event?.location === "string"
    ? u.event.location
    : u.event?.location?.address || "—",

        approvedText: `${approved} / ${total}`,
      };
    });
  }, [users]);

  return (
    <>
      <ProducerDashboardHeader />

      <main dir="rtl" className="pt-16 px-3 md:px-6 lg:px-8 pb-10 bg-[#efeeeb] min-h-screen">
        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <DashboardCard title="משתמשים מוקצים" value={users.length} />
          <DashboardCard title="אירועים פעילים" value={totalEvents} />
          <DashboardCard title="סה״כ מוזמנים" value={totalGuests} />
          <DashboardCard title="אישרו הגעה" value={totalApproved} />
        </div>

        <section
          style={{
            background: "#f7f6f4",
            border: "1px solid #d9d9d9",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "18px 20px 14px",
              fontSize: 26,
              fontWeight: 700,
              color: "#4b321f",
              lineHeight: 1,
            }}
          >
            לקוחות
          </div>

          {usersLoading ? (
            <div style={{ padding: 20 }}>טוען משתמשים…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 20, color: "#777" }}>לא הוקצו לך לקוחות עדיין</div>
          ) : (
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: 0,
                  minWidth: 980,
                  direction: "rtl",
                }}
              >
                <thead>
                  <tr style={{ background: "#e2e3e6", color: "#5a3c25" }}>
                    <Th>שם</Th>
                    <Th>אימייל</Th>
                    <Th>טלפון</Th>
                    <Th>תאריך אירוע</Th>
                    <Th>מקום</Th>
                    <Th>אישור</Th>
                    <Th>הקצאה לעובד/ים</Th>
                    <Th>פעולה</Th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r, index) => (
                    <tr
                      key={r.id}
                      style={{
                        background: index % 2 === 0 ? "#f4f4f4" : "#efefef",
                        borderTop: "1px solid #ddd",
                      }}
                    >
                      <Td>{r.name}</Td>
                      <Td>{r.email}</Td>
                      <Td>{r.phone}</Td>
                      <Td>{r.date}</Td>
                      <Td>{r.location}</Td>
                      <Td>{r.approvedText}</Td>
                      <Td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 92,
                            height: 32,
                            padding: "0 10px",
                            border: "1px solid #d0d0d0",
                            borderRadius: 8,
                            background: "#fff",
                            color: "#5d5d5d",
                            fontSize: 14,
                          }}
                        >
                          ללא
                        </span>
                      </Td>
                      <Td>
                        <button
                          onClick={() => handleEnterUser(r.id)}
                          style={{
                            background: "#6a4a2f",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "8px 16px",
                            fontSize: 15,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          נהל ↗
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

/* ===============================
   UI bits
=============================== */
function DashboardCard({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e6e6e6",
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 13, color: "#777" }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#4b321f" }}>{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: "14px 16px",
        textAlign: "right",
        fontSize: 15,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "16px",
        textAlign: "right",
        fontSize: 15,
        lineHeight: "20px",
        color: "#4b321f",
        whiteSpace: "nowrap",
        borderTop: "1px solid #dadada",
      }}
    >
      {children}
    </td>
  );
}
