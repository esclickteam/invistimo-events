"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

import ProductionTabs from "./_components/ProductionTabs";

import OverviewTab from "./_components/OverviewTab";
import PlanningTab from "./_components/PlanningTab";
import SuppliersBudgetTab from "./_components/SuppliersBudgetTab";
import CalendarTab from "./_components/CalendarTab";
import LogisticsTab from "./_components/LogisticsTab";
import AlcoholManagementTab from "./_components/AlcoholManagementTab";
import LiveGuestsTab from "./_components/LiveGuestsTab";
import LiveSeatingTab from "./_components/LiveSeating/LiveSeatingTab"; 

export default function EventProductionPage() {
  const { user } = useAuth();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetch("/api/invitations/my")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch invitation");
        return res.json();
      })
      .then((data) => {
        setInvitation(data?.invitation || null);
      })
      .catch((err) => {
        console.error("Invitation fetch error:", err);
        setInvitation(null);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div>טוען...</div>;
  if (!invitation) return <div>לא נמצאה הזמנה</div>;

  return (
    <ProductionTabs
      overview={<OverviewTab invitation={invitation} />}
      planning={<PlanningTab invitation={invitation} />}
      suppliers={<SuppliersBudgetTab invitation={invitation} />}
      calendar={<CalendarTab invitation={invitation} />}
      logistics={<LogisticsTab invitation={invitation} />}
      alcohol={<AlcoholManagementTab invitation={invitation} />}

      /* 🆕 לייב – אורחים */
      liveGuests={
  <LiveGuestsTab invitationId={invitation._id} />
}


      /* לייב – הושבה */
      liveSeating={
        <LiveSeatingTab invitationId={invitation._id} />
      }

      invitation={invitation}
    />
  );
}
