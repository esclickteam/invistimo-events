"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EventDetailsForm from "@/app/components/EventDetailsForm";

export default function EditEventPage() {
  const router = useRouter();

  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  /* ============================================================
     📥 Load event
  ============================================================ */
  useEffect(() => {
    async function loadEvent() {
      try {
        const res = await fetch("/api/events", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          console.error("❌ Failed to fetch event:", res.status);
          return;
        }

        const data = await res.json();

        if (data?.success) {
          setEvent(data.event || null);
        } else {
          setEvent(null);
        }
      } catch (err) {
        console.error("❌ Failed to load event:", err);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, []);

  /* ============================================================
     ⏳ Loading
  ============================================================ */
  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">
        טוען פרטי אירוע…
      </div>
    );
  }

  /* ============================================================
     Render
  ============================================================ */
  return (
    <div className="max-w-xl mx-auto p-6 md:p-10" dir="rtl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 mb-4 hover:underline"
      >
        ← חזרה
      </button>

      <h1 className="text-2xl font-semibold mb-6 text-[#4a413a]">
        ✏️ פרטי האירוע
      </h1>

      <EventDetailsForm
        event={event}
        onSaved={() => {
          router.back();
        }}
      />
    </div>
  );
}
