"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EventDetailsForm from "@/app/components/EventDetailsForm";
import EventInvitationSettings from "@/app/components/EventInvitationSettings";

export default function EditEventPage() {
  const router = useRouter();

  const [event, setEvent] = useState<any | null>(null);
  const [invitation, setInvitation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        /* =========================
           1️⃣ Load Event
        ========================= */
        const eventRes = await fetch("/api/events", {
          credentials: "include",
          cache: "no-store",
        });

        if (!eventRes.ok) throw new Error("Event fetch failed");

        const eventData = await eventRes.json();

        if (!eventData?.success || !eventData.event) {
          setLoading(false);
          return;
        }

        const loadedEvent = eventData.event;
        setEvent(loadedEvent);

        /* =========================
           2️⃣ Load Invitation BY eventId
        ========================= */
        const invitationRes = await fetch(
  `/api/invitations/by-event/${loadedEvent._id}`,
  {
    credentials: "include",
    cache: "no-store",
  }
);

        if (!invitationRes.ok) {
          setLoading(false);
          return;
        }

        const invitationData = await invitationRes.json();

        if (invitationData?.success) {
          setInvitation(invitationData.invitation);
        }
      } catch (err) {
        console.error("❌ Failed to load page data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /* =========================
     Loading
  ========================= */
  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">
        טוען פרטי אירוע…
      </div>
    );
  }

  if (!event || !invitation) {
    return (
      <div className="p-10 text-center text-[#4a413a]" dir="rtl">
        ℹ️ כדי לערוך פרטי אירוע והגדרות – יש ליצור הזמנה קודם.
      </div>
    );
  }

  /* =========================
     Render
  ========================= */
  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10" dir="rtl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 mb-4 hover:underline"
      >
        ← חזרה
      </button>

      <h1 className="text-2xl font-semibold mb-8 text-[#4a413a]">
        ✏️ עריכת אירוע
      </h1>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* צד שמאל – הגדרות הזמנה */}
        <div>
          <EventInvitationSettings invitationId={invitation._id} />
        </div>

        {/* צד ימין – פרטי האירוע */}
        <div>
          <EventDetailsForm
            event={event}
            onSaved={() => router.refresh()}
          />
        </div>

      </div>
    </div>
  );
}
