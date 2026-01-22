"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import heLocale from "@fullcalendar/core/locales/he";
import AddMeetingModal from "./AddMeetingModal";

export default function CalendarTab({ eventId }) {
  const [meetings, setMeetings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =========================
     Load meetings from DB
  ========================= */
  useEffect(() => {
    if (!eventId) return;

    setLoading(true);

    fetch(`/api/events/${eventId}/conversations`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) return;

        const calendarEvents = data.conversations
          .filter((c) => c.type === "meeting")
          .map((c) => ({
            id: c._id,
            title: c.entityName,
            date: c.date, // yyyy-mm-dd
          }));

        setMeetings(calendarEvents);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  /* =========================
     UI
  ========================= */
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">📅 לוח פגישות</h3>

        <button
          onClick={() => setSelectedDate(new Date())}
          className="bg-black text-white px-4 py-2 rounded"
        >
          ➕ פגישה חדשה
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">טוען פגישות…</div>
      ) : (
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          selectable
          height="auto"
          events={meetings}
          locale={heLocale} 
          dateClick={(info) => setSelectedDate(info.date)}
        />
      )}

      {/* Add Meeting Modal */}
      {selectedDate && (
        <AddMeetingModal
          eventId={eventId}
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onSave={(newConversation) => {
            // הוספה מיידית ליומן בלי ריענון
            setMeetings((prev) => [
              ...prev,
              {
                id: newConversation._id,
                title: newConversation.entityName,
                date: newConversation.date,
              },
            ]);
          }}
        />
      )}
    </div>
  );
}
