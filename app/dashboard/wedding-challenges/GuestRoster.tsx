"use client";

import { useEffect, useState } from "react";
import type { WeddingChallengesSourceType } from "@/lib/weddingChallenges/types";

type GuestRow = {
  id: string;
  name: string;
  phone: string;
  tableNumber: number | null;
  isAdult: boolean;
  token: string;
  livePath: string;
};

export default function GuestRoster({
  eventId,
  sourceType,
}: {
  eventId: string;
  sourceType: WeddingChallengesSourceType;
}) {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [missingTableCount, setMissingTableCount] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [isAdult, setIsAdult] = useState(true);
  const [paste, setPaste] = useState("");

  const load = async () => {
    const res = await fetch(`/api/wedding-challenges/guests?eventId=${eventId}`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (json?.guests) setGuests(json.guests);
    setMissingTableCount(Number(json?.missingTableCount || 0));
  };

  useEffect(() => {
    load().catch(() => setMessage("לא הצלחנו לטעון את רשימת האורחים"));
  }, [eventId]);

  const addManual = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/wedding-challenges/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          guests: [{ name, phone, tableNumber, isAdult }],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ADD_FAILED");
      setName("");
      setPhone("");
      setTableNumber("");
      setIsAdult(true);
      setMessage(json.skipped ? "האורח כבר קיים" : "אורח נוסף");
      await load();
    } catch {
      setMessage("הוספת אורח נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const importPaste = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/wedding-challenges/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, text: paste }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "IMPORT_FAILED");
      setPaste("");
      setMessage(`יובאו ${json.added} אורחים${json.skipped ? `, דולגו ${json.skipped}` : ""}`);
      await load();
    } catch {
      setMessage("ייבוא הרשימה נכשל");
    } finally {
      setSaving(false);
    }
  };

  const importFile = async (file: File | null) => {
    if (!file) return;
    setSaving(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("eventId", eventId);
      form.set("file", file);
      const res = await fetch("/api/wedding-challenges/guests", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "IMPORT_FAILED");
      setMessage(`יובאו ${json.added} אורחים${json.skipped ? `, דולגו ${json.skipped}` : ""}`);
      await load();
    } catch {
      setMessage("ייבוא הקובץ נכשל");
    } finally {
      setSaving(false);
    }
  };

  const updateGuest = async (guest: GuestRow, patch: Partial<GuestRow>) => {
    await fetch("/api/wedding-challenges/guests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, guestId: guest.id, ...patch }),
    });
    await load();
  };

  const removeGuest = async (guestId: string) => {
    await fetch(`/api/wedding-challenges/guests?eventId=${eventId}&guestId=${guestId}`, {
      method: "DELETE",
    });
    await load();
  };

  return (
    <section className="mb-6 space-y-4 rounded-[26px] border border-[#E7D8C6] bg-[#FFFDF8] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">רשימת אורחים למשחק</h2>
          <p className="mt-1 text-sm text-[#7B6754]">
            {sourceType === "EXISTING_EVENT"
              ? "נכללים רק אורחים שאישרו הגעה. אורחים שסימנו שלא מגיעים לא נכנסים למשחק."
              : "אורחים שהועלו נחשבים מגיעים כברירת מחדל. לא נדרשת הזמנה דיגיטלית או RSVP."}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[#7B6754]">
          {guests.length} אורחים
        </span>
      </div>

      <p className="rounded-2xl bg-[#FFF3DF] px-4 py-3 text-sm font-bold text-[#A86F2B]">
        מספר שולחן אופציונלי אבל מומלץ מאוד — כך השולחן לא מקבל את אותה משימה באותו זמן.
        {missingTableCount > 0 ? ` ${missingTableCount} אורחים בלי שולחן.` : ""}
      </p>

      <div className="grid gap-3 md:grid-cols-4">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="שם פרטי"
          className="rounded-xl border border-[#E7D8C6] px-3 py-2"
        />
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="טלפון"
          className="rounded-xl border border-[#E7D8C6] px-3 py-2"
        />
        <input
          value={tableNumber}
          onChange={(event) => setTableNumber(event.target.value)}
          placeholder="מספר שולחן"
          className="rounded-xl border border-[#E7D8C6] px-3 py-2"
        />
        <label className="flex items-center gap-2 rounded-xl border border-[#E7D8C6] bg-white px-3 py-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={isAdult}
            onChange={(event) => setIsAdult(event.target.checked)}
          />
          מבוגר
        </label>
      </div>
      <button
        type="button"
        disabled={saving || !name || !phone}
        onClick={addManual}
        className="rounded-full bg-[#3A2A1C] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
      >
        הוספה ידנית
      </button>

      <label className="block text-sm font-bold text-[#7B6754]">
        הדבקת רשימה (שם, טלפון, שולחן)
        <textarea
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2 font-normal"
          placeholder={"דני, 0501234567, 4\nנועה, 0527654321"}
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving || !paste.trim()}
          onClick={importPaste}
          className="rounded-full border border-[#E7D8C6] px-4 py-2 text-sm font-bold"
        >
          ייבוא מהדבקה
        </button>
        <label className="cursor-pointer rounded-full border border-[#E7D8C6] px-4 py-2 text-sm font-bold">
          ייבוא CSV / Excel
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(event) => {
              importFile(event.target.files?.[0] || null);
              event.target.value = "";
            }}
          />
        </label>
        <a
          href="/api/wedding-challenges/guests/template"
          className="rounded-full px-4 py-2 text-sm font-bold text-[#A86F2B]"
        >
          הורדת תבנית
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead>
            <tr className="text-[#7B6754]">
              <th className="p-2">שם</th>
              <th className="p-2">טלפון</th>
              <th className="p-2">שולחן</th>
              <th className="p-2">מבוגר</th>
              <th className="p-2">לינק</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => (
              <tr key={guest.id} className="border-t border-[#F0E4D6]">
                <td className="p-2 font-bold">{guest.name}</td>
                <td className="p-2">{guest.phone}</td>
                <td className="p-2">
                  <input
                    defaultValue={guest.tableNumber ?? ""}
                    className="w-20 rounded-lg border border-[#E7D8C6] px-2 py-1"
                    onBlur={(event) =>
                      updateGuest(guest, { tableNumber: event.target.value ? Number(event.target.value) : null })
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={guest.isAdult}
                    onChange={(event) => updateGuest(guest, { isAdult: event.target.checked })}
                  />
                </td>
                <td className="p-2">
                  <a href={guest.livePath} target="_blank" className="font-bold text-[#A86F2B]">
                    /live/{guest.token}
                  </a>
                </td>
                <td className="p-2">
                  {sourceType === "STANDALONE_GAME" ? (
                    <button
                      type="button"
                      onClick={() => removeGuest(guest.id)}
                      className="text-xs font-bold text-[#B42318]"
                    >
                      מחיקה
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {message ? <p className="text-sm font-bold text-[#A86F2B]">{message}</p> : null}
    </section>
  );
}
