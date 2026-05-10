"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function PlanningTab({ eventId }) {
  const router = useRouter();

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

  const completion = useMemo(() => {
    let done = 0;
    const total = 5;

    if (eventDefinition.goal?.trim()) done++;
    if (eventDefinition.vibe?.trim()) done++;
    if (eventDefinition.size?.trim()) done++;
    if (eventDefinition.notes?.trim()) done++;
    if (concept?.trim()) done++;

    return Math.round((done / total) * 100);
  }, [eventDefinition, concept]);

  useEffect(() => {
    if (!eventId) {
      setError("NO_EVENT_ID");
      setLoading(false);
      return;
    }

    async function loadPlanning() {
      try {
        const res = await fetch(`/api/events/${eventId}/planning`, {
          cache: "no-store",
        });

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

  useEffect(() => {
    if (!eventId) return;

    async function loadConversations() {
      try {
        const res = await fetch(`/api/events/${eventId}/conversations`, {
          cache: "no-store",
        });

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

  if (loading) {
    return <div className="p-8">טוען תכנון אירוע…</div>;
  }

  if (error === "NO_EVENT_ID") {
    return <div className="p-8 text-red-600">לא התקבל מזהה אירוע</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">שגיאה בטעינת נתוני התכנון</div>;
  }

  return (
    <div
      dir="rtl"
      className="
        max-w-7xl
        mx-auto
        grid
        grid-cols-1
        xl:grid-cols-[1fr_330px]
        gap-8
      "
    >
      <main className="space-y-7">
        {/* TOP BAR */}
        <div
          className="
            rounded-[32px]
            border
            border-white/60
            bg-white/80
            backdrop-blur-xl
            p-6
            shadow-[0_18px_50px_rgba(124,58,237,0.07)]
          "
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <p className="text-sm text-purple-600 font-semibold mb-2">
                Planning Workspace
              </p>

              <h2 className="text-2xl md:text-3xl font-black text-[#1E1B2E]">
                תכנון וקונספט האירוע
              </h2>

              <p className="text-sm text-gray-500 mt-2">
                כאן מרכזים את מטרת האירוע, האווירה, הקונספט, הדגשים והשיחות.
              </p>
            </div>

            <div
              className="
                rounded-2xl
                bg-white
                border
                border-purple-100
                px-5
                py-3
                text-sm
                font-semibold
                shadow-sm
              "
            >
              {saving ? "שומר…" : "✔ נשמר אוטומטית"}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-500">התקדמות תכנון</span>
              <span className="font-bold text-purple-700">{completion}%</span>
            </div>

            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </div>

        {/* EVENT DEFINITION */}
        <Panel
          icon="🎯"
          title="הגדרת האירוע"
          subtitle="הבסיס שממנו תיבנה כל ההפקה"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              placeholder="מטרת האירוע"
              value={eventDefinition.goal}
              onChange={(value) =>
                setEventDefinition({
                  ...eventDefinition,
                  goal: value,
                })
              }
            />

            <Field
              placeholder="אופי / וייב"
              value={eventDefinition.vibe}
              onChange={(value) =>
                setEventDefinition({
                  ...eventDefinition,
                  vibe: value,
                })
              }
            />

            <Field
              placeholder="גודל משוער (אורחים)"
              value={eventDefinition.size}
              onChange={(value) =>
                setEventDefinition({
                  ...eventDefinition,
                  size: value,
                })
              }
            />

            <textarea
              className="md:col-span-2 min-h-[120px] rounded-2xl border border-gray-200 bg-white/80 p-4 text-sm outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100 transition"
              placeholder="דגשים חשובים, אילוצים, דברים שאסור לשכוח..."
              value={eventDefinition.notes}
              onChange={(e) =>
                setEventDefinition({
                  ...eventDefinition,
                  notes: e.target.value,
                })
              }
            />
          </div>
        </Panel>

        {/* CONCEPT */}
        <Panel
          icon="🎨"
          title="קונספט ועיצוב"
          subtitle="סגנון, צבעים, השראה, תאורה ואווירה"
        >
          <div className="flex flex-wrap gap-2 mb-4">
            {["יוקרתי", "רומנטי", "חינה מרוקאית", "מודרני", "קלאסי"].map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setConcept((prev) =>
                      prev ? `${prev}, ${item}` : item
                    )
                  }
                  className="rounded-full bg-purple-50 text-purple-700 border border-purple-100 px-4 py-2 text-xs font-semibold hover:bg-purple-100 transition"
                >
                  {item}
                </button>
              )
            )}
          </div>

          <textarea
            className="min-h-[150px] w-full rounded-2xl border border-gray-200 bg-white/80 p-4 text-sm outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100 transition"
            placeholder="לדוגמה: קונספט יוקרתי, צבעי שמנת וזהב, פרחים לבנים, תאורה חמה, כניסה מרשימה..."
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
          />
        </Panel>

        {/* CONVERSATIONS */}
        <Panel
          icon="🗣️"
          title="שיחות ופגישות"
          subtitle="תיעוד החלטות, ספקים, שיחות ופגישות הפקה"
        >
          {conversations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-purple-200 bg-purple-50/40 p-7 text-center">
              <p className="font-bold text-[#1E1B2E]">עדיין אין שיחות מתועדות</p>
              <p className="text-sm text-gray-500 mt-2">
                אחרי שתתעדו שיחה או פגישה, היא תופיע כאן כציר זמן מסודר.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((c) => (
                <button
                  key={c._id}
                  onClick={() =>
                    router.push(`/events/production/${eventId}/meeting/${c._id}`)
                  }
                  className="w-full text-right rounded-2xl border border-gray-100 bg-white/80 p-4 hover:-translate-y-0.5 hover:shadow-md transition"
                >
                  <p className="font-bold text-[#1E1B2E]">
                    {c.type === "meeting" ? "פגישה" : "שיחה"} · {c.entityName}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    {c.date} · {c.entityType}
                  </p>

                  {c.summary && (
                    <p className="text-sm mt-2 text-gray-700 leading-6">
                      {c.summary}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() =>
              router.replace(`/events/production/${eventId}?tab=calendar`, {
                scroll: false,
              })
            }
            className="
              mt-5
              rounded-2xl
              bg-gradient-to-r
              from-violet-600
              to-purple-500
              px-5
              py-3
              text-white
              text-sm
              font-bold
              shadow-[0_12px_30px_rgba(124,58,237,0.25)]
              hover:-translate-y-0.5
              transition
            "
          >
            ➕ קבע שיחה / פגישה
          </button>
        </Panel>

        <p className="text-xs text-gray-400">
          🧠 תיעוד מלא, החלטות ויצירת משימות מתבצעים במסך הפגישה. משימות מנוהלות בטאב “תמונת מצב”.
        </p>
      </main>

      {/* SIDEBAR */}
      <aside className="space-y-6">
        <div
          className="
            sticky
            top-24
            rounded-[32px]
            border
            border-white/60
            bg-white/80
            backdrop-blur-xl
            p-6
            shadow-[0_20px_60px_rgba(124,58,237,0.08)]
          "
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center text-white text-xl">
              ✦
            </div>

            <div>
              <h3 className="font-bold text-[#1E1B2E]">מצב האירוע</h3>
              <p className="text-sm text-gray-500">תכנון והפקה</p>
            </div>
          </div>

          <div className="space-y-4">
            <StatusRow label="מטרת האירוע" done={!!eventDefinition.goal} />
            <StatusRow label="אופי / וייב" done={!!eventDefinition.vibe} />
            <StatusRow label="גודל משוער" done={!!eventDefinition.size} />
            <StatusRow label="דגשים חשובים" done={!!eventDefinition.notes} />
            <StatusRow label="קונספט ועיצוב" done={!!concept} />
          </div>

          <div className="mt-8">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-500">התקדמות</span>
              <span className="font-semibold text-violet-600">{completion}%</span>
            </div>

            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>

          <div className="mt-8 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border border-purple-100 p-4">
            <p className="text-sm font-bold text-[#1E1B2E]">
              💡 המלצה חכמה
            </p>

            <p className="text-sm text-gray-600 mt-2 leading-6">
              מומלץ למלא קונספט, צבעים ודגשים חשובים כדי שכל ההפקה תהיה מסודרת וברורה.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Panel({ icon, title, subtitle, children }) {
  return (
    <section
      className="
        rounded-[32px]
        border
        border-white/60
        bg-white/80
        backdrop-blur-xl
        p-7
        space-y-5
        shadow-[0_18px_50px_rgba(124,58,237,0.06)]
      "
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-xl">
          {icon}
        </div>

        <div>
          <h3 className="font-black text-xl text-[#1E1B2E]">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

function Field({ placeholder, value, onChange }) {
  return (
    <input
      className="rounded-2xl border border-gray-200 bg-white/80 p-4 text-sm outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100 transition"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function StatusRow({ label, done }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span
        className={
          done
            ? "text-green-600 font-bold"
            : "text-gray-300 font-bold"
        }
      >
        {done ? "✓" : "○"}
      </span>
    </div>
  );
}