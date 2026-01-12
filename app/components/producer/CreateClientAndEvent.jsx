"use client";

import { useState } from "react";

export default function CreateClientAndEvent({ producerId }) {
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [eventType, setEventType] = useState("wedding");
  const [maxGuests, setMaxGuests] = useState(200);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    try {
      setLoading(true);

      /* =========================
         Step 1: יצירת / מציאת לקוח
      ========================= */
      const clientRes = await fetch("/api/producer/create-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ חשוב (cookie authToken)
        body: JSON.stringify({
          email: clientEmail,
          name: clientName,
          producerId, // ✅ נשאר רק אם ה-route שלך עדיין דורש את זה
        }),
      });

      const clientData = await clientRes.json();
      if (!clientRes.ok || !clientData.success) {
        throw new Error(clientData.error || "Create client failed");
      }

      const userId = clientData.user._id;

      /* =========================
         Step 2: יצירת אירוע ללקוח
         ❌ לא שולחים producerId בכלל
      ========================= */
      const eventRes = await fetch("/api/producer/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ חשוב (cookie authToken)
        body: JSON.stringify({
          userId,
          eventType,
          title: `אירוע של ${clientName || clientEmail}`,
          date: "", // אם תרצי שדה input לתאריך, נכניס
          location: "", // אם תרצי שדה input למיקום, נכניס
          maxGuests,
        }),
      });

      const eventData = await eventRes.json();
      if (!eventRes.ok || !eventData.success) {
        throw new Error(eventData.error || "Create event failed");
      }

      alert("✅ הלקוח והאירוע נוצרו בהצלחה!");

      // reset
      setClientEmail("");
      setClientName("");
      setEventType("wedding");
      setMaxGuests(200);
    } catch (err) {
      console.error(err);
      alert("❌ שגיאה ביצירת משתמש או אירוע");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-md w-full max-w-md mx-auto">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">
        יצירת לקוח חדש + אירוע
      </h2>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="שם הלקוח"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
        />

        <input
          type="email"
          placeholder="אימייל של הלקוח"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
        />

        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
        >
          <option value="wedding">חתונה</option>
          <option value="bar-mitzvah">בר מצווה</option>
          <option value="bat-mitzvah">בת מצווה</option>
          <option value="brit">ברית</option>
          <option value="henna">חינה</option>
        </select>

        <input
          type="number"
          value={maxGuests}
          onChange={(e) => setMaxGuests(Number(e.target.value))}
          className="w-full border rounded-lg px-4 py-2"
          placeholder="מספר מקסימלי של מוזמנים"
          min={1}
        />

        <button
          onClick={handleCreate}
          disabled={loading || !clientEmail}
          className="w-full bg-[var(--brand-purple)] text-white py-2 rounded-lg font-medium hover:bg-[var(--brand-purple-hover)] transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "יוצר..." : "צור לקוח ואירוע"}
        </button>
      </div>
    </div>
  );
}
