"use client";

import { useEffect, useState } from "react";
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

/* ===============================
   Page
=============================== */
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

    if (user.role !== "staff" || user.staffType !== "producer_staff") {
      router.replace("/");
    }
  }, [user, loading, router]);

  /* ===============================
     Fetch assigned users
  =============================== */
  useEffect(() => {
    if (!user || user.role !== "staff") return;

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
        setUsers(Array.isArray(data.users) ? data.users : []);
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
  const totalEvents = users.filter(
    (u) => u.role === "client" && u.event
  ).length;

  const totalGuests = users.reduce(
    (sum, u) => sum + (u.event?.totalGuests || 0),
    0
  );

  const totalApproved = users.reduce(
    (sum, u) => sum + (u.event?.approvedCount || 0),
    0
  );

  /* ===============================
     UI
  =============================== */
 return (
  <>
    <main dir="rtl" className="pt-16 px-6 md:px-10">
        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <DashboardCard title="משתמשים מוקצים" value={users.length} />
          <DashboardCard title="אירועים פעילים" value={totalEvents} />
          <DashboardCard title="סה״כ מוזמנים" value={totalGuests} />
          <DashboardCard title="אישרו הגעה" value={totalApproved} />
        </div>

        <h2 style={{ marginBottom: 16, fontSize: 20 }}>הלקוחות שלי</h2>

        {usersLoading ? (
          <div>טוען משתמשים…</div>
        ) : users.length === 0 ? (
          <div style={{ color: "#999" }}>לא הוקצו לך לקוחות עדיין</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {users.map((u) => (
              <UserCard
                key={u._id}
                user={u}
                onEnter={() => handleEnterUser(u._id)}
              />
            ))}
          </div>
        )}
      </main>
    </>
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
  value: number | string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 14, color: "#777" }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function UserCard({
  user,
  onEnter,
}: {
  user: AssignedUser;
  onEnter: () => void;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 18,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 600 }}>
        {user.name || "לקוח"}
      </div>

      <div style={{ fontSize: 14, color: "#555" }}>
        {user.email}
      </div>

      {user.role === "client" && (
        <>
          <div style={{ fontSize: 14 }}>
            📅{" "}
            {user.event?.date
              ? new Date(user.event.date).toLocaleDateString("he-IL")
              : "ללא תאריך"}
          </div>

          <div style={{ fontSize: 14 }}>
            📍 {user.event?.location?.address || "ללא מיקום"}
          </div>

          <div style={{ fontSize: 14, fontWeight: 500 }}>
            👥 {user.event?.approvedCount || 0} /{" "}
            {user.event?.totalGuests || 0} אישרו הגעה
          </div>
        </>
      )}

      <button
        onClick={onEnter}
        style={{
          marginTop: 10,
          background: "#111",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "12px 16px",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        כניסה
      </button>
    </div>
  );
}
