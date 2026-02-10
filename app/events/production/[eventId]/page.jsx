"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";

// טאב סקירה (Overview)
import OverviewTab from "../_components/OverviewTab";

// טאב תכנון
import PlanningTab from "../_components/PlanningTab";

// טאב יומן
import CalendarTab from "../_components/CalendarTab";

export default function ProductionEventPage() {
  const { eventId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // קריאת tab מה-URL (ברירת מחדל: overview)
  const tab = searchParams.get("tab") || "overview";

  function setTab(nextTab) {
    router.replace(
      `/events/production/${eventId}?tab=${nextTab}`,
      { scroll: false }
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6" dir="rtl">
      {/* ================= HEADER ================= */}
      <h1 className="text-2xl font-semibold">
        ניהול הפקת אירוע
      </h1>

      {/* ================= TABS ================= */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("overview")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            tab === "overview"
              ? "border-black text-black"
              : "border-transparent text-gray-500 hover:text-black"
          }`}
        >
          📊 סקירה
        </button>

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

      {/* ================= CONTENT ================= */}
      <div>
        {tab === "overview" && (
          <OverviewTab eventId={eventId} />
        )}

        {tab === "planning" && (
          <PlanningTab eventId={eventId} />
        )}

        {tab === "calendar" && (
          <CalendarTab eventId={eventId} />
        )}
      </div>
    </div>
  );
}
