"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function MeetingPage() {
  const { conversationId } = useParams();

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState(null);
  const [summary, setSummary] = useState("");
  const [decisions, setDecisions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [creatingTaskIndex, setCreatingTaskIndex] = useState(null);

  /* =====================
     LOAD
  ===================== */
  useEffect(() => {
    if (!conversationId) return;

    fetch(`/api/conversations/${conversationId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setConversation(data.conversation);
          setSummary(data.conversation.summary || "");
          setDecisions(data.conversation.decisions || []);
        }
      })
      .finally(() => setLoading(false));
  }, [conversationId]);

  /* =====================
     AUTO SAVE
  ===================== */
  useEffect(() => {
    if (!conversationId || loading) return;

    const t = setTimeout(async () => {
      try {
        setSaving(true);
        await fetch(`/api/conversations/${conversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summary, decisions }),
        });
      } finally {
        setSaving(false);
      }
    }, 700);

    return () => clearTimeout(t);
  }, [summary, decisions, conversationId, loading]);

  /* =====================
     CREATE TASK FROM DECISION
  ===================== */
  async function createTaskFromDecision(index) {
    if (!conversation?._id) return;

    setCreatingTaskIndex(index);

    try {
      const res = await fetch(
        `/api/conversations/${conversation._id}/create-task`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decisionIndex: index }),
        }
      );

      const data = await res.json();

      if (data.success) {
        const copy = [...decisions];
        copy[index] = {
          ...copy[index],
          createdTaskId: data.task._id,
        };
        setDecisions(copy);
      }
    } finally {
      setCreatingTaskIndex(null);
    }
  }

  /* =====================
     UI STATES
  ===================== */
  if (loading) return <div className="p-6">טוען פגישה…</div>;
  if (!conversation)
    return <div className="p-6 text-red-600">פגישה לא נמצאה</div>;

  /* =====================
     RENDER
  ===================== */
  return (
    <div className="max-w-3xl space-y-6 p-6" dir="rtl">
      <div className="text-xs text-gray-400 text-left">
        {saving ? "שומר…" : "✔ נשמר"}
      </div>

      <h1 className="text-xl font-semibold">
        {conversation.type === "meeting" ? "פגישה" : "שיחה"} ·{" "}
        {conversation.entityName}
      </h1>

      {/* SUMMARY */}
      <section className="bg-white border rounded-xl p-4">
        <h3 className="font-medium mb-2">📝 סיכום</h3>
        <textarea
          className="border rounded-lg p-3 w-full"
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </section>

      {/* DECISIONS */}
      <section className="bg-white border rounded-xl p-4 space-y-3">
        <h3 className="font-medium">✅ החלטות</h3>

        {decisions.map((d, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              className="border rounded-lg p-2 flex-1"
              value={d.text}
              onChange={(e) => {
                const copy = [...decisions];
                copy[i] = { ...copy[i], text: e.target.value };
                setDecisions(copy);
              }}
            />

            {d.createdTaskId ? (
              <span className="text-xs text-green-600">
                ✔ משימה נוצרה
              </span>
            ) : (
              <button
                disabled={creatingTaskIndex === i || !d.text?.trim()}
                onClick={() => createTaskFromDecision(i)}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded disabled:opacity-50"
              >
                {creatingTaskIndex === i ? "יוצר…" : "צור משימה"}
              </button>
            )}
          </div>
        ))}

        <button
          onClick={() => setDecisions([...decisions, { text: "" }])}
          className="text-sm text-blue-600"
        >
          ➕ הוסף החלטה
        </button>
      </section>
    </div>
  );
}
