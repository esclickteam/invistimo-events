"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProductionTabs from "./_components/ProductionTabs";
import LiveSeatingTab from "./_components/LiveSeating/LiveSeatingTab";

export default function EventProductionPage() {
  const { user } = useAuth();
  // 🔹 הסרת <any> כדי שזו תהיה JS רגיל
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetch("/api/invitations/my")
      .then((res) => res.json())
      .then((data) => {
        setInvitation(data.invitation || null);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div>טוען...</div>;

  return (
    <ProductionTabs
      overview={<OverviewTab invitation={invitation} />}
      planning={<PlanningTab invitation={invitation} />}
      suppliers={<SuppliersBudgetTab invitation={invitation} />}
      calendar={<CalendarTab invitation={invitation} />}
      logistics={<LogisticsTab invitation={invitation} />}
      alcohol={<AlcoholManagementTab invitation={invitation} />}
      liveSeating={<LiveSeatingTab invitation={invitation} />}
      invitation={invitation} // 🔹 חשוב ל־ProductionTabs
    />
  );
}
