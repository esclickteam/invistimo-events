"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EventDetailsForm from "@/app/components/EventDetailsForm";

export default function EditEventPage() {
  const router = useRouter();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const data = await res.json();

        if (!res.ok || !data || Object.keys(data).length === 0) {
          setError("לא נמצא אירוע");
          return;
        }

        setEvent(data);
      } catch (err) {
        console.error("❌ Failed to load event:", err);
        setError("שגיאה בטעינת פרטי האירוע");
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, []);

  /* ============================================================
     ⏳ States
  ============================================================ */
  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">
        טוען פרטי אירוע…
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-10 text-center text-red-600">
        {error || "לא נמצא אירוע"}
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

      {/* Title */}
      <h1 className="text-2xl font-semibold mb-6 text-[#4a413a]">
        ✏️ עריכת פרטי האירוע
      </h1>

      {/* Form */}
      <EventDetailsForm
        event={event}
        onSaved={() => {
          router.back();
        }}
      />
    </div>
  );
}
