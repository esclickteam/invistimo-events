"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/*
Conversation:
- נוצר תמיד דרך לוח שנה
- כאן מוצג כהיסטוריה / כניסה לתיעוד
- תיעוד + החלטות + משימות = במסך פגישה ייעודי
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
      entityType: "couple",
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
      summary: "בדיקת תאריך, תפריט ותנאים",
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
    <div className="space-y-8 max-w-4xl" dir="rtl">
      {/* =====================
          EVENT DEFINITION
      ===================== */}
      <section className="bg-white border rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-lg">🎯 הגדרת האירוע</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="border rounded-lg p-3"
            placeholder="מטרת האירוע (למשל: חתונה אינטימית)"
            value={eventDefinition.goal}
            onChange={(e) =>
              setEventDefinition({ ...eventDefinition, goal: e.target.value })
            }
          />

          <input
            className="border rounded-lg p-3"
            placeholder="אופי / וייב (קליל, יוקרתי, צעיר...)"
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
            placeholder="רגישויות / דגשים חשובים (משפחה, תקציב, לו״ז, מוזיקה...)"
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
      <section className="bg-white border rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-lg">🎨 קונספט ועיצוב</h3>

        <textarea
          className="border rounded-lg p-3 w-full"
          rows={4}
          placeholder="קונספט עיצובי, השראה, צבעים, סגנון ותאורה"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
        />
      </section>

      {/* =====================
          CONVERSATIONS
      ===================== */}
      <section className="bg-white border rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg">
              🗣️ שיחות ופגישות
            </h3>
            <p className="text-sm text-gray-500">
              כל פגישה נקבעת ביומן ומתועדת לאחר קיומה
            </p>
          </div>

          <button
            onClick={goToCalendar}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm"
          >
            ➕ קבע שיחה / פגישה
          </button>
        </div>

        {conversations.length === 0 ? (
          <div className="text-sm text-gray-500 border rounded-lg p-4">
            עדיין לא תועדו שיחות או פגישות.
            <br />
            תיאום פגישה מתבצע דרך לוח השנה.
          </div>
        ) : (
          <ul className="space-y-3">
            {conversations.map((c) => (
              <li
                key={c.id}
                onClick={() => openConversation(c.id)}
                className="border rounded-xl p-4 flex justify-between items-start hover:bg-gray-50 cursor-pointer transition"
              >
                <div className="space-y-1">
                  <p className="font-medium">
                    {c.interactionType} · {c.entityName}
                  </p>

                  <p className="text-sm text-gray-500">
                    {c.date} · {entityBadge(c.entityType)}
                  </p>

                  <p className="text-sm mt-1 text-gray-700">
                    {c.summary}
                  </p>
                </div>

                <div className="text-sm text-right">
                  <span className="block text-gray-500">
                    משימות שנוצרו
                  </span>
                  <span className="font-semibold text-black">
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
        🧠 תיעוד מלא, החלטות ויצירת משימות מתבצעים במסך הפגישה.
        <br />
        משימות מנוהלות ומעודכנות בטאב "תמונת מצב".
      </p>
    </div>
  );
}
