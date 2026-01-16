"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PlanningTab() {
  const router = useRouter();

  /* ======================
     STATE (בהמשך מ-DB)
  ====================== */
  const [eventDefinition, setEventDefinition] = useState({
    goal: "",
    vibe: "",
    size: "",
    notes: "",
  });

  const [concept, setConcept] = useState("");

  // דוגמאות – בהמשך יגיעו מה-Calendar / DB
  const conversations = [
    {
      id: 1,
      date: "12.08.2024",
      type: "פגישה",
      with: "הזוג",
      summary: "רוצים אירוע קליל, חוששים מתקציב",
      tasksCreated: 2,
    },
    {
      id: 2,
      date: "05.08.2024",
      type: "שיחה",
      with: "הזוג",
      summary: "בדיקת אופציות DJ",
      tasksCreated: 1,
    },
  ];

  /* ======================
     HANDLERS
  ====================== */
  function goToCalendar() {
    router.push("/events/production/calendar");
  }

  /* ======================
     RENDER
  ====================== */
  return (
    <div className="space-y-6 max-w-4xl" dir="rtl">
      {/* =====================
          EVENT DEFINITION
      ===================== */}
      <section className="border rounded-2xl p-5 space-y-4 bg-white">
        <h3 className="font-semibold text-lg">🎯 הגדרת האירוע</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="border rounded-lg p-3"
            placeholder="מטרת האירוע (לדוגמה: חתונה אינטימית)"
            value={eventDefinition.goal}
            onChange={(e) =>
              setEventDefinition({ ...eventDefinition, goal: e.target.value })
            }
          />

          <input
            className="border rounded-lg p-3"
            placeholder="אופי / וייב (קליל, צעיר, יוקרתי...)"
            value={eventDefinition.vibe}
            onChange={(e) =>
              setEventDefinition({ ...eventDefinition, vibe: e.target.value })
            }
          />

          <input
            className="border rounded-lg p-3"
            placeholder="גודל משוער (מס׳ אורחים)"
            value={eventDefinition.size}
            onChange={(e) =>
              setEventDefinition({ ...eventDefinition, size: e.target.value })
            }
          />

          <textarea
            className="border rounded-lg p-3 md:col-span-2"
            rows={3}
            placeholder="רגישויות / דגשים חשובים (משפחה, רעש, תקציב, לו״ז...)"
            value={eventDefinition.notes}
            onChange={(e) =>
              setEventDefinition({ ...eventDefinition, notes: e.target.value })
            }
          />
        </div>
      </section>

      {/* =====================
          CONCEPT
      ===================== */}
      <section className="border rounded-2xl p-5 space-y-4 bg-white">
        <h3 className="font-semibold text-lg">🎨 קונספט ועיצוב</h3>

        <textarea
          className="border rounded-lg p-3 w-full"
          rows={4}
          placeholder="תיאור הקונספט העיצובי, השראה, צבעים, תחושה כללית..."
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
        />
      </section>

      {/* =====================
          CONVERSATIONS
      ===================== */}
      <section className="border rounded-2xl p-5 space-y-4 bg-white">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">🗣️ שיחות ופגישות עם הזוג</h3>

          <button
            onClick={goToCalendar}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm"
          >
            ➕ קבע שיחה / פגישה
          </button>
        </div>

        {conversations.length === 0 ? (
          <p className="text-sm text-gray-500">
            עדיין לא תועדו שיחות. כל שיחה מתחילה מתיאום בלוח שנה.
          </p>
        ) : (
          <ul className="space-y-3">
            {conversations.map((c) => (
              <li
                key={c.id}
                className="border rounded-lg p-4 flex justify-between items-start"
              >
                <div>
                  <p className="font-medium">
                    {c.type} עם {c.with}
                  </p>
                  <p className="text-sm text-gray-500">
                    {c.date}
                  </p>
                  <p className="text-sm mt-1">{c.summary}</p>
                </div>

                <div className="text-sm text-right">
                  <span className="block text-gray-500">
                    🛠️ משימות שנוצרו
                  </span>
                  <span className="font-semibold">
                    {c.tasksCreated}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* =====================
          UX NOTE
      ===================== */}
      <p className="text-xs text-gray-400">
        משימות שנוצרות משיחות מנוהלות בטאב "תמונת מצב".
      </p>
    </div>
  );
}
