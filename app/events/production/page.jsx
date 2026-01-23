"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSeatingStore } from "@/store/seatingStore";
import ProductionTabs from "./_components/ProductionTabs";
import OverviewTab from "./_components/OverviewTab";
import PlanningTab from "./_components/PlanningTab";
import SuppliersBudgetTab from "./_components/SuppliersBudgetTab";
import CalendarTab from "./_components/CalendarTab";
import LogisticsTab from "./_components/LogisticsTab";
import AlcoholManagementTab from "./_components/AlcoholManagementTab";
import DashboardPage from "@/app/dashboard/page";
import LiveSeatingTab from "./_components/LiveSeating/LiveSeatingTab";

export default function EventProductionPage() {
  const { user } = useAuth();
  const importSnapshot = useSeatingStore((s) => s.importSnapshot);

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

  const url =
    user.role === "producer" && eventIdFromUrl
      ? `/api/invitations/by-event/${eventIdFromUrl}`
      : "/api/invitations/my";

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
     Load LIVE snapshot (guests + seating)
     ⭐ מקור אמת יחיד
  ========================= */
  useEffect(() => {
    if (!invitation?._id) return;

    let cancelled = false;

    async function loadLiveSnapshot() {
      try {
        const res = await fetch(
          `/api/live-snapshot?invitationId=${invitation._id}`
        );

        if (!res.ok) throw new Error("Failed to load live snapshot");

        const snapshot = await res.json();

        if (!cancelled) {
          importSnapshot(snapshot);
        }
      } catch (err) {
        console.error("Live snapshot load error:", err);
      }
    }

    loadLiveSnapshot();

    return () => {
      cancelled = true;
    };
  }, [invitation?._id, importSnapshot]);

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
    overview={<OverviewTab eventId={eventId} />}
    planning={<PlanningTab eventId={eventId} />}
    suppliers={<SuppliersBudgetTab eventId={eventId} />}
    calendar={<CalendarTab eventId={eventId} />}
    logistics={<LogisticsTab eventId={eventId} />}
    alcohol={<AlcoholManagementTab eventId={eventId} />}
    liveGuests={
  <DashboardPage />
}

    liveSeating={<LiveSeatingTab invitationId={invitation._id} />}
    invitation={invitation}
  />
  );
}
