"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/*
Conversation:
- נוצר תמיד דרך לוח שנה
- כאן מוצג כהיסטוריה / כניסה לתיעוד
- תיעוד + משימות = במסך פגישה ייעודי
*/

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

  const conversations = [
    {
      id: "c1",
      date: "12.08.2024",
      interactionType: "פגישה",
      entityType: "couple", // couple | supplier | venue | other
      entityName: "הזוג",
      summary: "רוצים אירוע קליל, חוששים מתקציב",
      tasksCreated: 2,
    },
    {
      id: "c2",
      date: "05.08.2024",
      interactionType: "שיחה",
      entityType: "supplier",
      entityName: "DJ – אופציות",
      summary: "בדיקת זמינות ומחירים",
      tasksCreated: 1,
    },
    {
      id: "c3",
      date: "01.08.2024",
      interactionType: "פגישה",
      entityType: "venue",
      entityName: "אולם – גן האירועים",
      summary: "בדיקת תאריך ותפריט",
      tasksCreated: 3,
    },
  ];

  /* ======================
     HANDLERS
  ====================== */

  // מעבר לטאב קלנדר באותו עמוד
  function goToCalendar() {
    router.push("/events/production?tab=calendar");
  }

  // פתיחת מסך פגישה ייעודי
  function openConversation(conversationId) {
    router.push(`/events/production/meeting/${conversationId}`);
  }

  function entityBadge(entityType) {
    switch (entityType) {
      case "couple":
        return "👰🤵 זוג";
      case "supplier":
        return "🎧 ספק";
      case "venue":
        return "🏛️ אולם";
      default:
        return "📌 אחר";
    }
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
            placeholder="מטרת האירוע"
            value={eventDefinition.goal}
            onChange={(e) =>
              setEventDefinition({ ...eventDefinition, goal: e.target.value })
            }
          />

          <input
            className="border rounded-lg p-3"
            placeholder="אופי / וייב"
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
            placeholder="רגישויות / דגשים חשובים"
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
          placeholder="תיאור הקונספט, השראה, צבעים ותחושה כללית"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
        />
      </section>

      {/* =====================
          CONVERSATIONS
      ===================== */}
      <section className="border rounded-2xl p-5 space-y-4 bg-white">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">
            🗣️ שיחות ופגישות (זוג · ספקים · אולם)
          </h3>

          <button
            onClick={goToCalendar}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm"
          >
            ➕ קבע שיחה / פגישה
          </button>
        </div>

        {conversations.length === 0 ? (
          <p className="text-sm text-gray-500">
            עדיין לא תועדו שיחות. התיעוד מתבצע לאחר קיום הפגישה.
          </p>
        ) : (
          <ul className="space-y-3">
            {conversations.map((c) => (
              <li
                key={c.id}
                onClick={() => openConversation(c.id)}
                className="border rounded-xl p-4 flex justify-between items-start hover:bg-gray-50 cursor-pointer"
              >
                <div className="space-y-1">
                  <p className="font-medium">
                    {c.interactionType} · {c.entityName}
                  </p>

                  <p className="text-sm text-gray-500">
                    {c.date} · {entityBadge(c.entityType)}
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
        תיעוד מלא, החלטות ויצירת משימות מתבצעים במסך הפגישה עצמו.
        משימות מנוהלות בטאב "תמונת מצב".
      </p>
    </div>
  );
}
