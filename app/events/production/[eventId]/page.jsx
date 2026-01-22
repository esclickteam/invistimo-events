"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";

// רכיבים פנימיים
import PlanningTab from "../_components/PlanningTab";
import CalendarTab from "../_components/CalendarTab";

export default function ProductionEventPage() {
  const { eventId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // tab מה־URL (ברירת מחדל: planning)
  const tab = searchParams.get("tab") || "planning";

  function setTab(nextTab) {
    router.replace(
      `/events/production/${eventId}?tab=${nextTab}`,
      { scroll: false }
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <h1 className="text-2xl font-semibold">ניהול הפקת אירוע</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("planning")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            tab === "planning"
              ? "border-black text-black"
              : "border-transparent text-gray-500 hover:text-black"
          }`}
        >
          📝 תכנון
        </button>

        <button
          onClick={() => setTab("calendar")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            tab === "calendar"
              ? "border-black text-black"
              : "border-transparent text-gray-500 hover:text-black"
          }`}
        >
          📅 יומן
        </button>
      </div>

      {/* Content */}
      <div>
        {tab === "calendar" ? (
          <CalendarTab eventId={eventId} />
        ) : (
          <PlanningTab eventId={eventId} />
        )}
      </div>
    </div>
  );
}
