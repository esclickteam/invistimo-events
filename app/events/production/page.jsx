"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

  const router = useRouter();
  const searchParams = useSearchParams();

  const eventIdFromUrl = searchParams.get("eventId");

  const [event, setEvent] = useState(null);
  const [eventId, setEventId] = useState("");

  /*
    invitation אופציונלי בלבד.
    ניהול אירוע עצמאי לא חייב הזמנה.
  */
  const [invitation, setInvitation] = useState(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const canUseEventProduction = useMemo(() => {
    return (
      user?.role === "admin" ||
      user?.role === "producer" ||
      user?.accessModules?.eventProduction === true ||
      user?.includeEventManagement === true ||
      user?.selfManageEnabled === true
    );
  }, [user]);

  const hasRsvpSeatingAccess = useMemo(() => {
    return (
      user?.role === "admin" ||
      user?.role === "producer" ||
      user?.accessModules?.rsvpSeating === true ||
      user?.includeDigitalSeating === true ||
      user?.planLimits?.seatingEnabled === true
    );
  }, [user]);

  /* =========================
     Load / create production event
     מקור אמת: Event, לא Invitation
  ========================= */
  useEffect(() => {
    if (!user?._id) return;

    let cancelled = false;

    async function loadProductionEvent() {
      try {
        setLoading(true);
        setErrorMessage("");

        if (!canUseEventProduction) {
          if (!cancelled) {
            setErrorMessage("אין לך גישה למערכת ניהול אירוע");
            setLoading(false);
          }

          return;
        }

        /*
          אם יש eventId בכתובת — משתמשים בו.
          אם אין — מביאים/יוצרים Event עצמאי דרך my-production.
        */
        if (eventIdFromUrl) {
          const res = await fetch(`/api/events/${eventIdFromUrl}`, {
            credentials: "include",
            cache: "no-store",
          });

          const data = await res.json();

          if (!res.ok || !data.success || !data.event) {
            console.error("Event fetch error:", data);

            if (!cancelled) {
              setErrorMessage("לא נמצא אירוע");
              setEvent(null);
              setEventId("");
              setLoading(false);
            }

            return;
          }

          if (!cancelled) {
            setEvent(data.event);
            setEventId(String(data.event._id || eventIdFromUrl));
            setLoading(false);
          }

          return;
        }

        const res = await fetch("/api/events/my-production", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok || !data.success || !data.eventId) {
          console.error("My production event error:", data);

          if (!cancelled) {
            setErrorMessage(data.message || "לא נמצא אירוע");
            setEvent(null);
            setEventId("");
            setLoading(false);
          }

          return;
        }

        if (!cancelled) {
          setEvent(data.event || null);
          setEventId(String(data.eventId));

          /*
            מעדכן URL כדי שכל הטאבים יקבלו eventId מסודר.
          */
          router.replace(
            `/events/production?eventId=${data.eventId}&tab=overview`
          );

          setLoading(false);
        }
      } catch (err) {
        console.error("Production event load error:", err);

        if (!cancelled) {
          setErrorMessage("שגיאה בטעינת ניהול האירוע");
          setEvent(null);
          setEventId("");
          setLoading(false);
        }
      }
    }

    loadProductionEvent();

    return () => {
      cancelled = true;
    };
  }, [user?._id, canUseEventProduction, eventIdFromUrl, router]);

  /* =========================
     Load invitation – אופציונלי בלבד
     רק למי שיש לו אישורי הגעה/הושבה.
  ========================= */
  useEffect(() => {
    if (!user?._id) return;
    if (!eventId) return;

    if (!hasRsvpSeatingAccess) {
      setInvitation(null);
      return;
    }

    let cancelled = false;

    async function loadOptionalInvitation() {
      try {
        const res = await fetch(`/api/invitations/by-event/${eventId}`, {
          credentials: "include",
          cache: "no-store",
          headers: {
            "x-impersonate-user": user._id,
          },
        });

        const data = await res.json();

        if (cancelled) return;

        if (res.ok && data.success && data.invitation) {
          setInvitation(data.invitation);
        } else {
          setInvitation(null);
        }
      } catch (err) {
        console.warn("Optional invitation fetch error:", err);

        if (!cancelled) {
          setInvitation(null);
        }
      }
    }

    loadOptionalInvitation();

    return () => {
      cancelled = true;
    };
  }, [user?._id, eventId, hasRsvpSeatingAccess]);

  /* =========================
     Loading
  ========================= */
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        טוען נתוני אירוע…
      </div>
    );
  }

  /* =========================
     Safety
     עכשיו בודקים Event בלבד.
     לא בודקים Invitation.
  ========================= */
  if (errorMessage || !eventId) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-red-600">
        {errorMessage || "לא נמצא אירוע"}
      </div>
    );
  }

  /* =========================
     Render – מסך ניהול אירוע
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
        invitation && hasRsvpSeatingAccess ? (
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