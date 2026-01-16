"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useState } from "react";
import AddMeetingModal from "./AddMeetingModal";

export default function CalendarTab() {
  const [meetings, setMeetings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

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

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        selectable
        height="auto"
        events={meetings}
        dateClick={(info) => setSelectedDate(info.date)}
      />

      {selectedDate && (
        <AddMeetingModal
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onSave={(meeting) =>
            setMeetings((prev) => [...prev, meeting])
          }
        />
      )}
    </div>
  );
}
