"use client";

import { useState, useEffect } from "react";

export default function PublicInvitePage({
  params,
}: {
  params: { shareId: string };
}) {
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [form, setForm] = useState({
    rsvp: "pending",
    guestsCount: 1,
    notes: "",
  });
  const [sent, setSent] = useState(false);

  /* ============================================================
     📦 טעינת נתוני ההזמנה לפי shareId
  ============================================================ */
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/invite/${params.shareId}`);
        const data = await res.json();

        if (data.success && data.invitation) {
          setInvite(data.invitation);
        } else {
          setInvite(null);
        }
      } catch (err) {
        console.error("❌ Error fetching invite:", err);
        setInvite(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.shareId]);

  /* ============================================================
     📨 שליחת תשובת אורח
  ============================================================ */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedGuest) {
      alert("נא לבחור שם אורח מהרשימה");
      return;
    }

    try {
      const res = await fetch(
        `/api/invitationGuests/${selectedGuest._id}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();
      if (data.success) setSent(true);
    } catch (err) {
      console.error("❌ Error sending RSVP:", err);
    }
  }

  /* ============================================================
     🕒 מצבים שונים של טעינה / שגיאה
  ============================================================ */
  if (loading) return <div className="p-10 text-center">טוען הזמנה...</div>;
  if (!invite)
    return <div className="p-10 text-center">❌ ההזמנה לא נמצאה.</div>;

  /* ============================================================
     🎨 רינדור הדף הציבורי להזמנה
  ============================================================ */
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-4 text-center">{invite.title}</h1>

      {/* אזור תצוגת הקנבס שנשמר בעורך */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 mb-8">
        {invite?.canvasData ? (
          <pre className="text-sm text-gray-600 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(invite.canvasData, null, 2)}
          </pre>
        ) : (
          <div className="text-gray-400 text-center">
            אין נתוני עיצוב להצגה
          </div>
        )}
      </div>

      {/* טופס תשובת אורח */}
      {!sent ? (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white rounded-xl shadow p-6 flex flex-col gap-4"
        >
          {/* רשימת אורחים */}
          <label className="text-gray-700">בחר את שמך:</label>
          <select
            className="border rounded p-2"
            value={selectedGuest?._id || ""}
            onChange={(e) =>
              setSelectedGuest(
                invite?.guests?.find((g: any) => g._id === e.target.value)
              )
            }
          >
            <option value="">בחר מהרשימה</option>
            {invite?.guests?.length ? (
              invite.guests.map((g: any) => (
                <option key={g._id} value={g._id}>
                  {g.name}
                </option>
              ))
            ) : (
              <option disabled>אין אורחים להזמנה זו</option>
            )}
          </select>

          {/* כפתורי מגיע / לא מגיע */}
          <label className="text-gray-700">מגיעים?</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, rsvp: "yes" })}
              className={`px-4 py-2 rounded ${
                form.rsvp === "yes"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              מגיע
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, rsvp: "no" })}
              className={`px-4 py-2 rounded ${
                form.rsvp === "no"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              לא מגיע
            </button>
          </div>

          {/* מספר מוזמנים */}
          <label className="text-gray-700">כמה אנשים יגיעו:</label>
          <input
            type="number"
            min="1"
            value={form.guestsCount}
            onChange={(e) =>
              setForm({ ...form, guestsCount: Number(e.target.value) })
            }
            className="border rounded p-2"
          />

          {/* הערות */}
          <label className="text-gray-700">בקשות מיוחדות / הערות:</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="border rounded p-2"
            placeholder="כשר, טבעוני, מושבים מסוימים וכו'..."
          />

          <button
            type="submit"
            className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            שלח תשובה
          </button>
        </form>
      ) : (
        <div className="text-center text-green-600 text-lg font-medium">
          ✅ תודה! התשובה שלך נשמרה.
        </div>
      )}
    </div>
  );
}
