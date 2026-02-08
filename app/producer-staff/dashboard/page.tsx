"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProducerStaffDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  /* ===============================
     Guard – הרשאות וניווט
  =============================== */
  useEffect(() => {
    if (loading) return;

    // לא מחובר
    if (!user) {
      router.replace("/login");
      return;
    }

    // לא עובד מפיק
    if (user.role !== "staff" || user.staffType !== "producer_staff") {
      router.replace("/");
      return;
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div style={{ padding: 32 }}>
        טוען…
      </div>
    );
  }

  /* ===============================
     UI
  =============================== */
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 8 }}>
        דשבורד עובד מפיק
      </h1>

      <p style={{ color: "#666", marginBottom: 24 }}>
        שלום {user.name}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <DashboardCard
          title="אירועים פעילים"
          value="—"
        />
        <DashboardCard
          title="סה״כ מוזמנים"
          value="—"
        />
        <DashboardCard
          title="אישורי הגעה השבוע"
          value="—"
        />
      </div>

      <div style={{ marginTop: 32 }}>
        <h2>פעולות זמינות</h2>

        <ul style={{ marginTop: 12, lineHeight: 1.8 }}>
          <li>✔️ צפייה באירועים של המפיק</li>
          <li>✔️ ניהול מוזמנים והושבה</li>
          <li>✔️ עדכון אישורי הגעה</li>
          <li style={{ color: "#999" }}>⛔ ניהול תשלומים</li>
          <li style={{ color: "#999" }}>⛔ יצירת משתמשים</li>
        </ul>
      </div>
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
      <div style={{ fontSize: 14, color: "#888" }}>
        {title}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}
