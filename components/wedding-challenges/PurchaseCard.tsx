"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
  WEDDING_CHALLENGES_MAX_GUESTS,
  WEDDING_CHALLENGES_PRICE_ILS,
} from "@/lib/weddingChallenges/constants";

const INCLUDED = [
  "עד 5 משימות לכל אורח",
  "SMS פתיחה אישי",
  "חלוקה חכמה לפי אורחים ושולחנות",
  "אפשרות להוסיף משימות משלכם",
  "תזמון שליחת ההודעה",
  "חוויית גירוד אינטראקטיבית",
];

export default function WeddingChallengesPurchaseCard({
  entitled = false,
  giveawayPurchased = false,
  sourceType = "STANDALONE_GAME",
  eventId = "",
  manageHref = "/dashboard/wedding-challenges",
}: {
  entitled?: boolean;
  giveawayPurchased?: boolean;
  sourceType?: "EXISTING_EVENT" | "STANDALONE_GAME";
  eventId?: string;
  manageHref?: string;
}) {
  const [includeGiveaway, setIncludeGiveaway] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const total = useMemo(() => {
    if (entitled && !giveawayPurchased && includeGiveaway) {
      return WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS;
    }
    return (
      WEDDING_CHALLENGES_PRICE_ILS +
      (includeGiveaway && !giveawayPurchased ? WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS : 0)
    );
  }, [entitled, giveawayPurchased, includeGiveaway]);

  async function startCheckout() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/wedding-challenges/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includeGiveaway: includeGiveaway && !giveawayPurchased,
          sourceType,
          eventId: eventId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        const next = encodeURIComponent("/pricing?buy=wedding-challenges");
        window.location.href = `/login?next=${next}`;
        return;
      }
      if (!res.ok || !data.url) {
        throw new Error(data.error || data.message || "לא הצלחנו לפתוח תשלום");
      }
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "לא הצלחנו לפתוח תשלום");
      setBusy(false);
    }
  }

  return (
    <section
      className="overflow-hidden rounded-[32px] border border-[#D9C0A0] bg-[#FFFDF9] p-6 shadow-[0_22px_55px_rgba(91,64,35,0.11)] sm:p-8"
      dir="rtl"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.18em] text-[#B88945]">
            INVISTIMO LIVE
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-playfair)] text-3xl font-black text-[#3E2D20] sm:text-4xl">
            Wedding Challenges
          </h2>
          <p className="mt-2 text-sm font-bold text-[#7B6754]">
            עד {WEDDING_CHALLENGES_MAX_GUESTS} רשומות אורחים
          </p>
        </div>
        <div className="rounded-full bg-[#FFF3DF] px-4 py-2 text-sm font-black text-[#A86F2B]">
          {WEDDING_CHALLENGES_PRICE_ILS} ₪ לאירוע
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {INCLUDED.map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-[#E8D9C7] bg-white px-4 py-3 text-sm font-bold text-[#5A3E25]"
          >
            {item}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-[#E8D9C7] bg-white px-4 py-4">
        <p className="text-sm font-black text-[#3E2D20]">
          הגרלה אופציונלית – {WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS} ₪ + עלות הפרס
        </p>
        <p className="mt-1 text-xs font-bold text-[#7B6754]">
          עלות הפרס נגבית בנפרד
        </p>
        {!giveawayPurchased ? (
          <label className="mt-3 flex items-center gap-2 text-sm font-bold text-[#5A3E25]">
            <input
              type="checkbox"
              checked={includeGiveaway}
              onChange={(event) => setIncludeGiveaway(event.target.checked)}
              className="h-4 w-4 accent-[#A86F2B]"
            />
            הוספת הגרלה – {WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS} ₪
          </label>
        ) : (
          <p className="mt-2 text-sm font-bold text-emerald-700">תוספת ההגרלה כבר פעילה</p>
        )}
      </div>

      {error ? <p className="mt-4 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {entitled ? (
          <Link
            href={manageHref}
            className="inline-flex items-center justify-center rounded-full bg-[#3E2D20] px-6 py-3 text-sm font-black text-white"
          >
            ניהול Wedding Challenges
          </Link>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={startCheckout}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-l from-[#A86F2B] via-[#C68F46] to-[#D8A85F] px-6 py-3 text-sm font-black text-white shadow-[0_16px_32px_rgba(168,111,43,0.24)] disabled:opacity-50"
          >
            {busy ? "פותח תשלום..." : `רכישה ב־${total} ₪`}
          </button>
        )}
        {!entitled ? (
          <button
            type="button"
            disabled={busy}
            onClick={startCheckout}
            className="inline-flex items-center justify-center rounded-full border border-[#3E2D20] px-6 py-3 text-sm font-black text-[#3E2D20] disabled:opacity-50"
          >
            רכישת Wedding Challenges
          </button>
        ) : null}
        {entitled && !giveawayPurchased && includeGiveaway ? (
          <button
            type="button"
            disabled={busy}
            onClick={startCheckout}
            className="inline-flex items-center justify-center rounded-full bg-[#3E2D20] px-6 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            הוספת הגרלה – {WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS} ₪
          </button>
        ) : null}
        <Link
          href="/live/demo"
          className="inline-flex items-center justify-center rounded-full border border-[#E8D9C7] bg-white px-6 py-3 text-sm font-black text-[#5A3E25]"
        >
          תצוגה מקדימה
        </Link>
      </div>
    </section>
  );
}
