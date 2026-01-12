"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EventDetailsForm from "@/app/components/EventDetailsForm";

export default function EditEventPage() {
  const router = useRouter();

  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ============================================================
     📥 Load invitation
  ============================================================ */
  useEffect(() => {
    async function loadInvitation() {
      try {
        const res = await fetch("/api/invitations/my", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (!data.success) {
          setError("לא נמצאה הזמנה");
          return;
        }

        setInvitation(data.invitation);
      } catch (err) {
        console.error("❌ Failed to load invitation:", err);
        setError("שגיאה בטעינת ההזמנה");
      } finally {
        setLoading(false);
      }
    }

    loadInvitation();
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

  if (error || !invitation) {
    return (
      <div className="p-10 text-center text-red-600">
        {error || "לא נמצאה הזמנה"}
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
