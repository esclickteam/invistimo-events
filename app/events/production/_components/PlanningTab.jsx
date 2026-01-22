"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PlanningTab({ eventId }) {
  const router = useRouter();

  /* ======================
     STATE
  ====================== */
  const [eventDefinition, setEventDefinition] = useState({
    goal: "",
    vibe: "",
    size: "",
    notes: "",
  });

  const [concept, setConcept] = useState("");

  const [conversations, setConversations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* ======================
     LOAD PLANNING FROM DB
  ====================== */
  useEffect(() => {
    if (!eventId) {
      setError("NO_EVENT_ID");
      setLoading(false);
      return;
    }

    async function loadPlanning() {
      try {
        const res = await fetch(
          `/api/events/${eventId}/planning`,
          { cache: "no-store" }
        );

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError("LOAD_FAILED");
          return;
        }

        if (data.planning) {
          setEventDefinition(
            data.planning.eventDefinition || {
              goal: "",
              vibe: "",
              size: "",
              notes: "",
            }
          );
          setConcept(data.planning.concept || "");
        }
      } catch (err) {
        console.error("❌ planning load error:", err);
        setError("NETWORK_ERROR");
      } finally {
        setLoading(false);
      }
    }

    loadPlanning();
  }, [eventId]);

  /* ======================
     LOAD CONVERSATIONS (NEW)
  ====================== */
  useEffect(() => {
    if (!eventId) return;

    async function loadConversations() {
      try {
        const res = await fetch(
          `/api/events/${eventId}/conversations`,
          { cache: "no-store" }
        );

        const data = await res.json();

        if (res.ok && data.success) {
          setConversations(data.conversations || []);
        }
      } catch (err) {
        console.error("❌ conversations load error:", err);
      }
    }

    loadConversations();
  }, [eventId]);

  /* ======================
     AUTO SAVE (DB only)
  ====================== */
  useEffect(() => {
    if (!eventId || loading) return;

    const timeout = setTimeout(async () => {
      try {
        setSaving(true);

        await fetch(`/api/events/${eventId}/planning`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventDefinition,
            concept,
          }),
        });
      } catch (err) {
        console.error("❌ planning save error:", err);
      } finally {
        setSaving(false);
      }
    }, 700);

    return () => clearTimeout(timeout);
  }, [eventDefinition, concept, eventId, loading]);

  /* ======================
     UI STATES
  ====================== */
  if (loading) {
    return <div className="p-6">טוען תכנון אירוע…</div>;
  }

  if (error === "NO_EVENT_ID") {
    return <div className="p-6 text-red-600">לא התקבל מזהה אירוע</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">שגיאה בטעינת נתוני התכנון</div>;
  }

  /* ======================
     RENDER
  ====================== */
  return (
    <div className="space-y-8 max-w-4xl" dir="rtl">
      <div className="text-xs text-gray-400 text-left">
        {saving ? "שומר…" : "✔ נשמר"}
      </div>

      {/* EVENT DEFINITION */}
      <section className="bg-white border rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-lg">🎯 הגדרת האירוע</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="border rounded-lg p-3"
            placeholder="מטרת האירוע"
            value={eventDefinition.goal}
            onChange={(e) =>
              setEventDefinition({
                ...eventDefinition,
                goal: e.target.value,
              })
            }
          />

          <input
            className="border rounded-lg p-3"
            placeholder="אופי / וייב"
            value={eventDefinition.vibe}
            onChange={(e) =>
              setEventDefinition({
                ...eventDefinition,
                vibe: e.target.value,
              })
            }
          />

          <input
            className="border rounded-lg p-3"
            placeholder="גודל משוער (אורחים)"
            value={eventDefinition.size}
            onChange={(e) =>
              setEventDefinition({
                ...eventDefinition,
                size: e.target.value,
              })
            }
          />

          <textarea
            className="border rounded-lg p-3 md:col-span-2"
            rows={3}
            placeholder="דגשים חשובים"
            value={eventDefinition.notes}
            onChange={(e) =>
              setEventDefinition({
                ...eventDefinition,
                notes: e.target.value,
              })
            }
          />
        </div>
      </section>

      {/* CONCEPT */}
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

      {/* CONVERSATIONS */}
      <section className="bg-white border rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-lg">🗣️ שיחות ופגישות</h3>

        {conversations.length === 0 ? (
          <p className="text-sm text-gray-500">
            עדיין לא תועדו שיחות או פגישות.
          </p>
        ) : (
          <ul className="space-y-3">
            {conversations.map((c) => (
              <li
                key={c._id}
                onClick={() =>
                  router.push(
                    `/events/production/${eventId}/meeting/${c._id}`
                  )
                }
                className="border rounded-xl p-4 hover:bg-gray-50 cursor-pointer"
              >
                <p className="font-medium">
                  {c.type === "meeting" ? "פגישה" : "שיחה"} · {c.entityName}
                </p>
                <p className="text-sm text-gray-500">
                  {c.date} · {c.entityType}
                </p>
                {c.summary && (
                  <p className="text-sm mt-1 text-gray-700">
                    {c.summary}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() =>
            router.push(`/events/production/${eventId}?tab=calendar`)
          }
          className="bg-black text-white px-4 py-2 rounded-lg text-sm"
        >
          ➕ קבע שיחה / פגישה
        </button>
      </section>

      <p className="text-xs text-gray-400">
        🧠 תיעוד מלא, החלטות ויצירת משימות מתבצעים במסך הפגישה.
        <br />
        משימות מנוהלות בטאב "תמונת מצב".
      </p>
    </div>
  );
}
