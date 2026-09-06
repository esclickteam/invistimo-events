"use client";

import { useState } from "react";
import {
  BUYME_PRIZE_MAX_ILS,
  BUYME_PRIZE_MIN_ILS,
  BUYME_PRIZE_VALUES_ILS,
  WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
} from "@/lib/weddingChallenges/constants";
import { giveawayAdminStatus, giveawayEntriesOpen } from "@/lib/weddingChallenges/settings";
import type { WeddingChallengeSettings } from "@/lib/weddingChallenges/types";
import { utcToWallTimeInput, wallTimeInZoneToUtc } from "@/lib/weddingChallenges/timezone";

export default function GiveawayCard({
  eventId,
  sourceType,
  settings,
  timezone,
  giveawayPurchased,
  canBuy,
  stats,
  disabled,
  now,
  onChange,
  onDraw,
  onMessage,
}: {
  eventId: string;
  sourceType: string;
  settings: WeddingChallengeSettings;
  timezone: string;
  giveawayPurchased: boolean;
  canBuy: boolean;
  stats: { players?: number; entries?: number } | null;
  disabled?: boolean;
  now: Date;
  onChange: (next: WeddingChallengeSettings) => void;
  onDraw: (reset?: boolean) => void;
  onMessage: (message: string) => void;
}) {
  const [prizeValue, setPrizeValue] = useState(settings.giveaway.prizeValue || 300);
  const [custom, setCustom] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [buying, setBuying] = useState(false);
  const selected = custom ? Number(custom) : prizeValue;
  const validPrize =
    Number.isFinite(selected) && selected >= BUYME_PRIZE_MIN_ILS && selected <= BUYME_PRIZE_MAX_ILS;
  const total = WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS + (validPrize ? selected : 0);
  const status = giveawayAdminStatus(settings, now);
  const entriesOpen = giveawayEntriesOpen(settings, now);
  const drawn = Boolean(settings.giveaway.locked || settings.giveaway.drawnAt);
  const fromWall = (value: string) =>
    value ? wallTimeInZoneToUtc(value, timezone)?.toISOString() ?? null : null;

  const buy = async () => {
    if (!validPrize) return;
    setBuying(true);
    try {
      const res = await fetch("/api/wedding-challenges/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includeGiveaway: true,
          prizeValue: selected,
          sourceType,
          eventId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) window.location.href = data.url;
      else onMessage(data.error || "לא הצלחנו לפתוח תשלום להגרלה");
    } finally {
      setBuying(false);
    }
  };

  if (!giveawayPurchased) {
    return (
      <section className="space-y-4 rounded-[26px] border border-[#E7D8C6] bg-[#FFFDF8] p-5">
        <p className="text-sm font-black tracking-[0.16em] text-[#B8893A]">הגרלה</p>
        <h2 className="text-xl font-black">רוצים להוסיף הגרלה?</h2>
        <p className="text-sm text-[#7B6754]">
          הוסיפו הפתעה נוספת למשחק: מי שמשלים משימות יכול להיכנס להגרלה על שובר BUYME.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BUYME_PRIZE_VALUES_ILS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setPrizeValue(value);
                setCustom("");
              }}
              className={`rounded-2xl border px-3 py-3 text-sm font-black ${
                !custom && prizeValue === value
                  ? "border-[#C89545] bg-white text-[#3A2A1C]"
                  : "border-[#E7D8C6] bg-white/60 text-[#7B6754]"
              }`}
            >
              {value} ₪
            </button>
          ))}
        </div>
        <label className="block text-sm font-bold text-[#7B6754]">
          סכום אחר
          <input
            type="number"
            min={BUYME_PRIZE_MIN_ILS}
            max={BUYME_PRIZE_MAX_ILS}
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder={`${BUYME_PRIZE_MIN_ILS}–${BUYME_PRIZE_MAX_ILS}`}
            className="mt-1 max-w-xs rounded-xl border border-[#E7D8C6] px-3 py-2"
          />
        </label>
        <div className="max-w-sm rounded-2xl bg-white px-4 py-3 text-sm">
          <p>הגרלה {WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS} ₪</p>
          <p>שובר BUYME {validPrize ? selected : 0} ₪</p>
          <p className="mt-1 font-black">סה״כ תוספת {validPrize ? total : "—"} ₪</p>
          <p className="mt-2 text-xs text-[#7B6754]">
            השובר לא נשלח אוטומטית. סטטוס המימוש יישאר ממתין עד שליחה ידנית.
          </p>
        </div>
        {canBuy ? (
          <button
            type="button"
            disabled={buying || disabled || !validPrize}
            onClick={buy}
            className="rounded-full bg-[#3A2A1C] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {buying ? "פותח תשלום..." : `הוספה ותשלום – ${total} ₪`}
          </button>
        ) : (
          <p className="text-sm font-bold text-[#A86F2B]">הוספת הגרלה זמינה אחרי רכישת Wedding Challenges.</p>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-[26px] border border-[#E7D8C6] bg-[#FFFDF8] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black tracking-[0.16em] text-[#B8893A]">הגרלה</p>
          <h2 className="text-xl font-black">
            שובר BUYME בשווי {settings.giveaway.prizeValue || settings.giveaway.prizeCost || 0} ₪
          </h2>
          <p className="mt-1 text-sm font-bold text-[#A86F2B]">
            {drawn ? "יש זוכה" : "✓ פעיל"}
            {settings.giveaway.prizeFulfillmentStatus === "SENT"
              ? " · השובר נשלח"
              : " · מימוש השובר ממתין"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white px-4 py-3">
          <p className="text-xs font-bold text-[#7B6754]">משתתפים</p>
          <p className="text-xl font-black">{stats?.players || 0}</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3">
          <p className="text-xs font-bold text-[#7B6754]">כרטיסים שנצברו</p>
          <p className="text-xl font-black">{stats?.entries || 0}</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3">
          <p className="text-xs font-bold text-[#7B6754]">הגרלה</p>
          <p className="text-sm font-black">
            {drawn
              ? settings.giveaway.winnerName || "נעול"
              : status.drawAtLabel || "ידנית"}
          </p>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-[#7B6754]">מתי לחשוף לאורחים שיש הגרלה?</legend>
        {(
          [
            ["after_first", "אחרי המשימה הראשונה"],
            ["after_second", "אחרי 2 משימות"],
            ["manual", "חשיפה ידנית"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm font-bold">
            <input
              type="radio"
              checked={settings.giveaway.revealMode === value}
              onChange={() =>
                onChange({
                  ...settings,
                  giveaway: { ...settings.giveaway, revealMode: value, enabled: true },
                })
              }
            />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-[#7B6754]">מתי לבצע את ההגרלה?</legend>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="radio"
            checked={settings.giveaway.drawMode !== "AUTO_DRAW_AT_TIME"}
            disabled={drawn}
            onChange={() =>
              onChange({
                ...settings,
                giveaway: { ...settings.giveaway, drawMode: "MANUAL_DRAW", autoDrawAtEnd: false, enabled: true },
              })
            }
          />
          ידנית
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="radio"
            checked={settings.giveaway.drawMode === "AUTO_DRAW_AT_TIME"}
            disabled={drawn}
            onChange={() =>
              onChange({
                ...settings,
                giveaway: { ...settings.giveaway, drawMode: "AUTO_DRAW_AT_TIME", autoDrawAtEnd: true, enabled: true },
              })
            }
          />
          אוטומטית בשעה שנבחר
        </label>
        {settings.giveaway.drawMode === "AUTO_DRAW_AT_TIME" ? (
          <input
            type="datetime-local"
            value={utcToWallTimeInput(settings.giveaway.drawAt, timezone)}
            disabled={drawn}
            onChange={(event) =>
              onChange({
                ...settings,
                giveaway: { ...settings.giveaway, drawAt: fromWall(event.target.value), enabled: true },
              })
            }
            className="max-w-sm rounded-xl border border-[#E7D8C6] px-3 py-2"
          />
        ) : null}
      </fieldset>

      <p className="text-sm text-[#7B6754]">
        {entriesOpen ? "כניסות פתוחות" : "כניסות נסגרו"} · שעון ישראל
      </p>

      {drawn ? (
        <div className="rounded-2xl bg-white px-4 py-3">
          <p className="font-black">יש זוכה 🎉</p>
          <p className="mt-1 text-sm">{settings.giveaway.winnerName || "נבחר"}</p>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDraw(false)}
          className="rounded-full bg-[#3A2A1C] px-5 py-3 text-sm font-black text-white"
        >
          הגרלת זוכה
        </button>
      )}

      <button
        type="button"
        onClick={() => setAdvanced((value) => !value)}
        className="text-sm font-bold text-[#A86F2B]"
      >
        {advanced ? "הסתרת הגדרות מתקדמות" : "הגדרות מתקדמות"}
      </button>
      {advanced ? (
        <div className="space-y-3 rounded-2xl border border-[#E7D8C6] bg-white p-4">
          <label className="block text-sm font-bold text-[#7B6754]">
            כניסות למשימת בוס
            <select
              value={settings.giveaway.bossEntries}
              onChange={(event) =>
                onChange({
                  ...settings,
                  giveaway: {
                    ...settings.giveaway,
                    bossEntries: Number(event.target.value) === 3 ? 3 : 2,
                  },
                })
              }
              className="mt-1 max-w-xs rounded-xl border border-[#E7D8C6] px-3 py-2"
            >
              <option value={2}>2 כניסות</option>
              <option value={3}>3 כניסות</option>
            </select>
          </label>
          <label className="block text-sm font-bold text-[#7B6754]">
            סגירת כניסות
            <input
              type="datetime-local"
              value={utcToWallTimeInput(settings.giveaway.entriesCutoffAt, timezone)}
              disabled={drawn}
              onChange={(event) =>
                onChange({
                  ...settings,
                  giveaway: { ...settings.giveaway, entriesCutoffAt: fromWall(event.target.value) },
                })
              }
              className="mt-1 max-w-sm rounded-xl border border-[#E7D8C6] px-3 py-2"
            />
          </label>
          {drawn ? (
            <button
              type="button"
              onClick={() => onDraw(true)}
              className="rounded-full border border-[#8A3B3B] px-4 py-2 text-sm font-black text-[#8A3B3B]"
            >
              איפוס הגרלה
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
