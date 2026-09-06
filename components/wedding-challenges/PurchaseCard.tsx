"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BUYME_PRIZE_MAX_ILS,
  BUYME_PRIZE_MIN_ILS,
  BUYME_PRIZE_VALUES_ILS,
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
  const [prizeValue, setPrizeValue] = useState(0);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selected = custom ? Number(custom) : prizeValue;
  const validPrize =
    Number.isFinite(selected) && selected >= BUYME_PRIZE_MIN_ILS && selected <= BUYME_PRIZE_MAX_ILS;
  const giveawayOn = includeGiveaway && !giveawayPurchased;

  const total = useMemo(() => {
    const giveawayTotal = giveawayOn ? WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS + (validPrize ? selected : 0) : 0;
    if (entitled) return giveawayTotal;
    return WEDDING_CHALLENGES_PRICE_ILS + giveawayTotal;
  }, [entitled, giveawayOn, validPrize, selected]);

  async function startCheckout() {
    if (giveawayOn && !validPrize) {
      setError("בחרו קודם את שווי שובר BUYME");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/wedding-challenges/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includeGiveaway: giveawayOn,
          prizeValue: giveawayOn && validPrize ? selected : 0,
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

  function selectPrize(value: number) {
    setPrizeValue(value);
    setCustom("");
    setIncludeGiveaway(true);
    setError("");
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
          עלות הפרס נגבית בנפרד. בחרו קודם את שווי שובר BUYME.
        </p>
        {!giveawayPurchased ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BUYME_PRIZE_VALUES_ILS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectPrize(value)}
                  className={`rounded-2xl border px-3 py-3 text-sm font-black ${
                    includeGiveaway && !custom && prizeValue === value
                      ? "border-[#C89545] bg-[#FFF8EE] text-[#3A2A1C]"
                      : "border-[#E7D8C6] bg-white text-[#7B6754]"
                  }`}
                >
                  {value} ₪
                </button>
              ))}
            </div>
            <label className="mt-3 block text-sm font-bold text-[#7B6754]">
              סכום אחר
              <input
                type="number"
                min={BUYME_PRIZE_MIN_ILS}
                max={BUYME_PRIZE_MAX_ILS}
                value={custom}
                onChange={(event) => {
                  setCustom(event.target.value);
                  setIncludeGiveaway(Boolean(event.target.value));
                }}
                placeholder={`${BUYME_PRIZE_MIN_ILS}–${BUYME_PRIZE_MAX_ILS}`}
                className="mt-1 max-w-xs rounded-xl border border-[#E7D8C6] px-3 py-2"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setIncludeGiveaway(false);
                setPrizeValue(0);
                setCustom("");
              }}
              className="mt-3 text-xs font-bold text-[#7B6754]"
            >
              ללא הגרלה
            </button>
            {giveawayOn ? (
              <p className="mt-3 text-sm font-black text-[#3E2D20]">
                הוספת הגרלה – {WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS} ₪
                {validPrize ? ` + שובר ${selected} ₪` : ""}
              </p>
            ) : null}
          </>
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
            disabled={busy || (giveawayOn && !validPrize)}
            onClick={startCheckout}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-l from-[#A86F2B] via-[#C68F46] to-[#D8A85F] px-6 py-3 text-sm font-black text-white shadow-[0_16px_32px_rgba(168,111,43,0.24)] disabled:opacity-50"
          >
            {busy ? "פותח תשלום..." : `רכישה ב־${total} ₪`}
          </button>
        )}
        {!entitled ? (
          <button
            type="button"
            disabled={busy || (giveawayOn && !validPrize)}
            onClick={startCheckout}
            className="inline-flex items-center justify-center rounded-full border border-[#3E2D20] px-6 py-3 text-sm font-black text-[#3E2D20] disabled:opacity-50"
          >
            רכישת Wedding Challenges
          </button>
        ) : null}
        {entitled && giveawayOn ? (
          <button
            type="button"
            disabled={busy || !validPrize}
            onClick={startCheckout}
            className="inline-flex items-center justify-center rounded-full bg-[#3E2D20] px-6 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            הוספת הגרלה – {validPrize ? total : WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS} ₪
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
