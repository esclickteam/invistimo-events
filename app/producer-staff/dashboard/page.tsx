"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/* ===============================
   Types
=============================== */
type StaffEvent = {
  _id: string;
  eventDate?: string;
  eventLocation?: {
    address?: string;
  };
  maxGuests?: number;
  approvedCount?: number;
  ownerId?: {
    _id: string;
    name: string;
    email: string;
  };
};

/* ===============================
   Page
=============================== */
export default function ProducerStaffDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<StaffEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

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
      return;
    }
  }, [user, loading, router]);

  /* ===============================
     Fetch events
  =============================== */
  useEffect(() => {
    if (!user || user.role !== "staff") return;

    const fetchEvents = async () => {
      setEventsLoading(true);
      try {
        const res = await fetch("/api/staff/events", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          setEvents([]);
          return;
        }

        const data = await res.json();
        setEvents(Array.isArray(data.events) ? data.events : []);
      } catch {
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
  }, [user]);

  const handleManageEvent = async (eventId: string) => {
  try {
    const res = await fetch("/api/staff/manage-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ eventId }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "אין הרשאה לאירוע");
      return;
    }

    // ✅ כניסה לאירוע בדיוק כמו אצל מפיק
    window.location.href = `/events/production?eventId=${data.eventId}`;
  } catch (err) {
    console.error(err);
    alert("שגיאה בכניסה לניהול האירוע");
  }
};


  if (loading || !user) {
    return <div style={{ padding: 32 }}>טוען…</div>;
  }

  /* ===============================
     Stats
  =============================== */
  const totalGuests = events.reduce(
    (sum, e) => sum + (e.maxGuests || 0),
    0
  );

  const totalApproved = events.reduce(
    (sum, e) => sum + (e.approvedCount || 0),
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
        <DashboardCard title="אירועים פעילים" value={events.length} />
        <DashboardCard title="סה״כ מוזמנים" value={totalGuests} />
        <DashboardCard title="אישרו הגעה" value={totalApproved} />
      </div>

      <h2 style={{ marginBottom: 16 }}>האירועים שלי</h2>

      {eventsLoading ? (
        <div>טוען אירועים…</div>
      ) : events.length === 0 ? (
        <div style={{ color: "#999" }}>לא הוקצו לך אירועים עדיין</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {events.map((event) => (
            <EventCard
              key={event._id}
              event={event}
              onManage={() => handleManageEvent(event._id)}

            />
          ))}
        </div>
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
        borderRadius: 14,
        padding: 20,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 14, color: "#888" }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function EventCard({
  event,
  onManage,
}: {
  event: StaffEvent;
  onManage: () => void;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 16 }}>
        {event.ownerId?.name || "לקוח"}
      </div>

      <div style={{ color: "#666", fontSize: 14 }}>
        📅{" "}
        {event.eventDate
          ? new Date(event.eventDate).toLocaleDateString("he-IL")
          : "ללא תאריך"}
      </div>

      <div style={{ color: "#666", fontSize: 14 }}>
        📍 {event.eventLocation?.address || "ללא מיקום"}
      </div>

      <div style={{ fontSize: 14 }}>
        👥 {event.approvedCount || 0} / {event.maxGuests || 0} אישרו הגעה
      </div>

      <button
        onClick={onManage}
        style={{
          marginTop: 8,
          padding: "10px 14px",
          borderRadius: 10,
          border: "none",
          background: "#111",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        ניהול אירוע
      </button>
    </div>
  );
}
