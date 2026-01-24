"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import ProductionTabs from "./_components/ProductionTabs";
import OverviewTab from "./_components/OverviewTab";
import PlanningTab from "./_components/PlanningTab";
import SuppliersBudgetTab from "./_components/SuppliersBudgetTab";
import CalendarTab from "./_components/CalendarTab";
import LogisticsTab from "./_components/LogisticsTab";
import DashboardPage from "@/app/dashboard/page";
import SeatingPage from "@/app/dashboard/seating/page";


export default function EventProductionPage() {
  const { user } = useAuth();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =========================
     Load invitation
  ========================= */
  useEffect(() => {
  if (!user) return;

  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  const eventIdFromUrl = params?.get("eventId");

  const url = "/api/invitations/my";


  fetch(url, { credentials: "include", cache: "no-store" })
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

  /* =========================
     Extract eventId (מקור אמת)
  ========================= */
  const eventId = useMemo(() => {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  const eventIdFromUrl = params?.get("eventId");

  return (
    eventIdFromUrl ||
    invitation?.eventId ||
    invitation?.event?._id ||
    null
  );
}, [invitation]);


 

  /* =========================
     Loading state
  ========================= */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        טוען נתוני אירוע…
      </div>
    );
  }

  /* =========================
     Safety fallback
  ========================= */
  if (!invitation || !eventId) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-red-600">
        לא נמצא אירוע / הזמנה
      </div>
    );
  }

  /* =========================
     Render
  ========================= */
  return (
  <ProductionTabs
    eventId={eventId}   // ✅ זה כל הסיפור
    overview={<OverviewTab eventId={eventId} />}
    planning={<PlanningTab eventId={eventId} />}
    suppliers={<SuppliersBudgetTab eventId={eventId} />}
    calendar={<CalendarTab eventId={eventId} />}
    logistics={<LogisticsTab eventId={eventId} />}
    liveGuests={<DashboardPage />}
    liveSeating={<SeatingPage />}
    invitation={invitation}
  />
);
}
