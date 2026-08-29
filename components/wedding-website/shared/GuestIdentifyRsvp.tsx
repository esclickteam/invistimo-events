"use client";

import { useState } from "react";
import { useWeddingSite } from "./WeddingSiteContext";

type Match = {
  token: string;
  name: string;
  guestsCount: number;
  rsvp: string;
  phoneHint: string;
};

type Props = {
  accent?: string;
  className?: string;
  identified: boolean;
  onBind: (
    token: string,
    meta?: { name?: string; guestsCount?: number; rsvp?: string }
  ) => void;
};

/**
 * "מצאו את ההזמנה שלכם" — phone/name lookup (event-scoped).
 * Parent owns RSVP state via useWeddingRsvp().bindToken.
 */
export default function GuestIdentifyRsvp({
  accent = "#B8844F",
  className = "",
  identified,
  onBind,
}: Props) {
  const { shareId, mode } = useWeddingSite();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState("");

  if (mode === "demo" || identified) return null;

  async function lookup() {
    if (!shareId) {
      setLookupError("זמין באתר חי בלבד");
      return;
    }
    if (!phone.trim() && !name.trim()) {
      setLookupError("הזינו מספר טלפון או שם");
      return;
    }
    try {
      setLooking(true);
      setLookupError("");
      setMatches([]);
      const res = await fetch(`/api/w/${encodeURIComponent(shareId)}/guest-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim() || undefined,
          name: name.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setLookupError(data?.error || "לא נמצאה התאמה");
        return;
      }
      const list: Match[] = Array.isArray(data.matches) ? data.matches : [];
      if (!list.length) {
        setLookupError("לא נמצאה הזמנה תואמת ברשימת המוזמנים");
        return;
      }
      if (data.autoToken) {
        onBind(String(data.autoToken), list[0]);
        return;
      }
      setMatches(list);
    } catch {
      setLookupError("שגיאה בחיפוש");
    } finally {
      setLooking(false);
    }
  }

  return (
    <div className={`space-y-4 ${className}`} dir="rtl">
      <div className="text-center">
        <h3 className="text-lg font-bold">מצאו את ההזמנה שלכם</h3>
        <p className="mt-2 text-sm opacity-70">
          הזינו מספר טלפון או שם כפי שמופיעים ברשימת המוזמנים
        </p>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-bold opacity-60">טלפון (מומלץ)</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border px-3 py-2.5 text-sm bg-transparent"
          placeholder="050-0000000"
          dir="ltr"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold opacity-60">או שם</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border px-3 py-2.5 text-sm bg-transparent"
          placeholder="שם מלא"
        />
      </label>
      {lookupError ? (
        <p className="text-center text-sm font-bold text-red-600">{lookupError}</p>
      ) : null}
      <button
        type="button"
        disabled={looking}
        onClick={() => void lookup()}
        className="w-full rounded-full py-3 text-sm font-bold text-white disabled:opacity-40"
        style={{ background: accent }}
      >
        {looking ? "מחפש..." : "חיפוש הזמנה"}
      </button>
      {matches.length > 1 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold opacity-60">בחרו את ההזמנה שלכם:</p>
          {matches.map((m) => (
            <button
              key={m.token}
              type="button"
              onClick={() => {
                onBind(m.token, m);
                setMatches([]);
              }}
              className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-right text-sm"
            >
              <span className="font-bold">{m.name}</span>
              <span className="text-xs opacity-60">
                {m.phoneHint || `${m.guestsCount} אורחים`}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
