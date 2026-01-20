"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSeatingStore } from "@/store/seatingStore";

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

  const importSnapshot = useSeatingStore((s) => s.importSnapshot);

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =========================
     Load invitation
  ========================= */
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

  /* 🔒 חשוב: לא להוריד את הקומפוננטה */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        טוען נתוני אירוע…
      </div>
    );
  }

  return (
    <ProductionTabs
      overview={
        invitation ? <OverviewTab invitation={invitation} /> : null
      }
      planning={
        invitation ? <PlanningTab invitation={invitation} /> : null
      }
      suppliers={
        invitation ? <SuppliersBudgetTab invitation={invitation} /> : null
      }
      calendar={
        invitation ? <CalendarTab invitation={invitation} /> : null
      }
      logistics={
        invitation ? <LogisticsTab invitation={invitation} /> : null
      }
      alcohol={
        invitation ? (
          <AlcoholManagementTab invitation={invitation} />
        ) : null
      }
      liveGuests={
        invitation ? (
          <LiveGuestsTab invitationId={invitation._id} />
        ) : null
      }
      liveSeating={
        invitation ? (
          <LiveSeatingTab invitationId={invitation._id} />
        ) : null
      }
      invitation={invitation}
    />
  );
}
