"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import ProductionTabs from "./_components/ProductionTabs";
import OverviewTab from "./_components/OverviewTab";
import PlanningTab from "./_components/PlanningTab";
import SuppliersBudgetTab from "./_components/SuppliersBudgetTab";
import CalendarTab from "./_components/CalendarTab";
import LogisticsTab from "./_components/LogisticsTab";
import AlcoholManagementTab from "./_components/AlcoholManagementTab";
import SeatingPage from "@/app/dashboard/seating/page";

export default function EventProductionPage() {
  const { user } = useAuth();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingProductionEvent, setCreatingProductionEvent] = useState(false);
  const [fallbackEventId, setFallbackEventId] = useState(null);

  /* =========================
     Load invitation
     לוגיקה ישנה נשארת כמו שהיא
  ========================= */
  useEffect(() => {
    if (!user?._id) return;

    fetch("/api/invitations/my", {
      credentials: "include",
      cache: "no-store",
      headers: {
        // ⭐ קריטי – מאפשר לבקאנד לדעת על מי האדמין מתחזה
        "x-impersonate-user": user._id,
      },
    })
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
     Extract eventId
     קודם URL
     אחר כך invitation
     אחר כך fallback שנוצר אוטומטית
  ========================= */
  const eventId = useMemo(() => {
    if (typeof window === "undefined") return null;

    const params = new URLSearchParams(window.location.search);

    return (
      params.get("eventId") ||
      invitation?.eventId ||
      invitation?.event?._id ||
      fallbackEventId ||
      null
    );
  }, [invitation, fallbackEventId]);

  /* =========================
     Fallback only:
     אם אין eventId ואין invitation —
     יוצרים/מביאים Event עצמאי.
     לא נוגעים בלוגיקה הישנה אם יש eventId.
  ========================= */
  useEffect(() => {
    if (!user?._id) return;
    if (loading) return;

    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const eventIdFromUrl = params.get("eventId");

    // אם כבר יש eventId בכתובת — לא נוגעים בכלום
    if (eventIdFromUrl) return;

    // אם יש invitation עם eventId — לא נוגעים בכלום
    if (invitation?.eventId || invitation?.event?._id) return;

    // אם כבר יצרנו fallback — לא עושים שוב
    if (fallbackEventId) return;

    async function createOrLoadProductionEvent() {
      try {
        setCreatingProductionEvent(true);

        const res = await fetch("/api/events/my-production", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success || !data?.eventId) {
          console.error("My production event error:", data);
          return;
        }

        const nextEventId = String(data.eventId);

        setFallbackEventId(nextEventId);

        window.location.href = `/events/production?eventId=${nextEventId}&tab=overview`;
      } catch (err) {
        console.error("Create/load production event error:", err);
      } finally {
        setCreatingProductionEvent(false);
      }
    }

    createOrLoadProductionEvent();
  }, [user?._id, loading, invitation, fallbackEventId]);

  /* =========================
     Loading
  ========================= */
  if (loading || creatingProductionEvent) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        טוען נתוני אירוע…
      </div>
    );
  }

  /* =========================
     Safety
     שינוי קטן:
     כבר לא דורשים invitation.
     דורשים רק eventId.
  ========================= */
  if (!eventId) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-red-600">
        לא נמצא אירוע
      </div>
    );
  }

  /* =========================
     Render – מסך הפקה בלבד
     invitation יכול להיות null וזה בסדר
  ========================= */
  return (
    <ProductionTabs
      eventId={eventId}
      invitation={invitation}
      overview={<OverviewTab eventId={eventId} />}
      planning={<PlanningTab eventId={eventId} />}
      suppliers={<SuppliersBudgetTab eventId={eventId} />}
      calendar={<CalendarTab eventId={eventId} />}
      logistics={<LogisticsTab eventId={eventId} />}
      alcohol={<AlcoholManagementTab eventId={eventId} />}
      liveSeating={
        invitation ? (
          <SeatingPage />
        ) : (
          <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-[#eadfce] bg-white text-[#8b7b68]">
            הושבה זמינה רק ללקוחות עם מודול אישורי הגעה והושבה.
          </div>
        )
      }
    />
  );
}