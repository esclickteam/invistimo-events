"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EventDetailsForm from "@/app/components/EventDetailsForm";

export default function EditEventPage() {
  const router = useRouter();

  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ============================================================
     📥 Load event (GET /api/event)
  ============================================================ */
  async function loadEvent() {
    try {
      setError(null);

      const res = await fetch("/api/event", {
        credentials: "include", // ✅ חובה – שולח cookie
        cache: "no-store",
      });

      if (res.status === 401) {
        setError("יש להתחבר מחדש כדי לערוך את האירוע");
        return;
      }

      if (!res.ok) {
        setError("שגיאה בטעינת פרטי האירוע");
        return;
      }

      const data = await res.json();

      if (!data?.success) {
        setError(data?.error || "שגיאה בטעינת האירוע");
        return;
      }

      // event יכול להיות null – וזה תקין (ייווצר בשמירה)
      setEvent(data.event || null);
    } catch (err) {
      console.error("❌ Failed to load event:", err);
      setError("שגיאת שרת בטעינת האירוע");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
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

  if (error) {
    return (
      <div className="p-10 text-center text-red-600">
        {error}
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
        onSaved={async () => {
          // רענון + חזרה לדשבורד
          await loadEvent();
          router.back();
        }}
      />
    </div>
  );
}
