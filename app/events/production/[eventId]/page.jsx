"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useMemo } from "react";

// טוענים את הטאבים כ־components
import PlanningTab from "./components/PlanningTab";
import CalendarTab from "./components/CalendarTab";
// אם יש לך בהמשך:
// import StatusTab from "./components/StatusTab";

export default function ProductionEventPage() {
  const { eventId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tab = searchParams.get("tab") || "planning";

  /* =========================
     Tabs config
  ========================= */
  const tabs = useMemo(
    () => [
      { key: "planning", label: "📝 תכנון" },
      { key: "calendar", label: "📅 יומן" },
      // { key: "status", label: "📊 תמונת מצב" },
    ],
    []
  );

  function changeTab(nextTab) {
    router.replace(
      `/events/production/${eventId}?tab=${nextTab}`,
      { scroll: false }
    );
  }

  /* =========================
     Render active tab
  ========================= */
  function renderTab() {
    switch (tab) {
      case "calendar":
        return <CalendarTab eventId={eventId} />;

      // case "status":
      //   return <StatusTab eventId={eventId} />;

      case "planning":
      default:
        return <PlanningTab eventId={eventId} />;
    }
  }

  /* =========================
     UI
  ========================= */
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">ניהול הפקת אירוע</h1>
        <p className="text-sm text-gray-500">Event ID: {eventId}</p>
      </header>

      {/* Tabs */}
      <nav className="flex gap-2 border-b">
        {tabs.map((t) => {
          const isActive = t.key === tab;

          return (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={`
                px-4 py-2 text-sm font-medium border-b-2
                ${
                  isActive
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-black"
                }
              `}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <section>{renderTab()}</section>
    </div>
  );
}
