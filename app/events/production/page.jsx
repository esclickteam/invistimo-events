"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

import ProductionTabs from "./_components/ProductionTabs";
import OverviewTab from "./_components/OverviewTab";
import PlanningTab from "./_components/PlanningTab";
import SuppliersBudgetTab from "./_components/SuppliersBudgetTab";
import CalendarTab from "./_components/CalendarTab";
import LogisticsTab from "./_components/LogisticsTab";
import AlcoholManagementTab from "./_components/AlcoholManagementTab";
import EventGiftsTab from "./_components/EventGiftsTab";

import SeatingPage from "@/app/dashboard/seating/page";

export default function EventProductionPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingProductionEvent, setCreatingProductionEvent] = useState(false);
  const [fallbackEventId, setFallbackEventId] = useState(null);

  const eventIdFromUrl = searchParams.get("eventId");
  const userId = user?._id ? String(user._id) : "";
  const invitationEventId = String(
    invitation?.eventId || invitation?.event?._id || ""
  );

  /* =========================
     Load invitation
  ========================= */
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const invitationUrl = eventIdFromUrl
      ? `/api/invitations/my?eventId=${encodeURIComponent(eventIdFromUrl)}`
      : "/api/invitations/my";

    setLoading(true);

    fetch(invitationUrl, {
      credentials: "include",
      cache: "no-store",
      headers: {
        // ⭐ קריטי – מאפשר לבקאנד לדעת על מי האדמין מתחזה
        "x-impersonate-user": userId,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch invitation");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setInvitation(data?.invitation || null);
      })
      .catch((err) => {
        console.error("Invitation fetch error:", err);
        if (!cancelled) setInvitation(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, eventIdFromUrl]);

  /* =========================
     Extract eventId
     קודם URL
     אחר כך invitation
     אחר כך fallback שנוצר אוטומטית
  ========================= */
  const eventId = useMemo(() => {
    return (
      eventIdFromUrl ||
      invitationEventId ||
      fallbackEventId ||
      null
    );
  }, [eventIdFromUrl, invitationEventId, fallbackEventId]);

  /* =========================
     Fallback only:
     אם אין eventId ואין invitation —
     יוצרים/מביאים Event עצמאי.
     לא נוגעים בלוגיקה הישנה אם יש eventId.
  ========================= */
  useEffect(() => {
    if (!userId) return;
    if (loading) return;

    // אם כבר יש eventId בכתובת — לא נוגעים בכלום
    if (eventIdFromUrl) return;

    // אם יש invitation עם eventId — לא נוגעים בכלום
    if (invitationEventId) return;

    // אם כבר יצרנו fallback — לא עושים שוב
    if (fallbackEventId) return;

    let cancelled = false;

    async function createOrLoadProductionEvent() {
      try {
        setCreatingProductionEvent(true);

        const res = await fetch("/api/events/my-production", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (cancelled) return;

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
        if (!cancelled) setCreatingProductionEvent(false);
      }
    }

    createOrLoadProductionEvent();

    return () => {
      cancelled = true;
    };
  }, [userId, loading, invitationEventId, fallbackEventId, eventIdFromUrl]);

  /* =========================
     Loading
  ========================= */
  if (loading || creatingProductionEvent) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
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
      <div className="flex h-[60vh] items-center justify-center text-red-600">
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
      overview={<OverviewTab eventId={eventId} invitation={invitation} />}
      planning={<PlanningTab eventId={eventId} />}
      suppliers={<SuppliersBudgetTab eventId={eventId} />}
      calendar={<CalendarTab eventId={eventId} />}
      logistics={<LogisticsTab eventId={eventId} />}
      alcohol={<AlcoholManagementTab eventId={eventId} />}
      gifts={
        <EventGiftsTab
          eventId={eventId}
          invitationId={invitation?._id || null}
        />
      }
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
