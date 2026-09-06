"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { userHasWeddingChallengesEntitlement } from "@/lib/weddingChallenges/entitlement";
import {
  CATEGORY_SHORT_LABELS,
  WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
  WEDDING_CHALLENGES_PRICE_ILS,
} from "@/lib/weddingChallenges/constants";
import type { WeddingChallengeSettings } from "@/lib/weddingChallenges/types";
import { defaultWeddingChallengeSettings } from "@/lib/weddingChallenges/settings";

type Stats = {
  guests: number;
  players: number;
  completed: number;
  active: number;
  entries: number;
  byCategory: { key: string; label: string; count: number }[];
};

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-[#E7D8C6] bg-white px-4 py-3">
      <span className="text-sm font-bold text-[#3A2A1C]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#9b7a3c]"
      />
    </label>
  );
}

function datetimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function WeddingChallengesAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const eventId = searchParams.get("eventId") || "";

  const entitled = userHasWeddingChallengesEntitlement(user as any);
  const [settings, setSettings] = useState<WeddingChallengeSettings>(
    defaultWeddingChallengeSettings()
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [preview, setPreview] = useState("");
  const [coupleNames, setCoupleNames] = useState("");
  const [giveawayPurchased, setGiveawayPurchased] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!eventId) return;
    const [settingsRes, statsRes, smsRes] = await Promise.all([
      fetch(`/api/wedding-challenges/settings?eventId=${eventId}`, { cache: "no-store" }),
      fetch(`/api/wedding-challenges/admin/stats?eventId=${eventId}`, { cache: "no-store" }),
      fetch(`/api/wedding-challenges/sms?eventId=${eventId}`, { cache: "no-store" }),
    ]);
    const settingsJson = await settingsRes.json();
    const statsJson = await statsRes.json();
    const smsJson = await smsRes.json();
    if (settingsJson?.settings) setSettings(settingsJson.settings);
    if (settingsJson?.coupleNames) setCoupleNames(settingsJson.coupleNames);
    setGiveawayPurchased(Boolean(settingsJson?.giveawayPurchased));
    if (statsJson?.stats) setStats(statsJson.stats);
    if (smsJson?.preview) setPreview(smsJson.preview);
  };

  useEffect(() => {
    load().catch(() => setMessage("לא הצלחנו לטעון את ההגדרות"));
  }, [eventId]);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/wedding-challenges/settings?eventId=${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "SAVE_FAILED");
      setSettings(json.settings);
      setMessage("נשמר");
    } catch {
      setMessage("שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const sendSms = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/wedding-challenges/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const json = await res.json();
      setMessage(res.ok ? `נשלחו ${json.sent} הודעות` : "שליחת SMS נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const draw = async () => {
    const res = await fetch("/api/wedding-challenges/admin/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    const json = await res.json();
    if (res.ok) {
      setMessage(`הזוכה: ${json.winner?.name}`);
      load();
    } else {
      setMessage("לא ניתן להגריל עדיין");
    }
  };

  const locked = !entitled && user?.role !== "admin";

  const categories = useMemo(
    () => Object.entries(CATEGORY_SHORT_LABELS) as [keyof typeof CATEGORY_SHORT_LABELS, string][],
    []
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6" dir="rtl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black tracking-[0.18em] text-[#B8893A]">INVISTIMO LIVE</p>
          <h1 className="text-3xl font-black text-[#3A2A1C]">Wedding Challenges</h1>
          <p className="mt-1 text-sm text-[#7B6754]">
            כרטיס גירוד דיגיטלי שמרימים את הרחבה. עד 5 משימות לכל אורח.
          </p>
        </div>
        <span className="rounded-full bg-[#FFF3DF] px-4 py-2 text-sm font-black text-[#A86F2B]">
          Premium · {WEDDING_CHALLENGES_PRICE_ILS} ₪
        </span>
      </div>

      {locked && (
        <div className="mb-6 rounded-[24px] border border-[#E7D8C6] bg-white p-5">
          <p className="font-black text-[#3A2A1C]">התוספת עדיין לא פעילה לאירוע הזה</p>
          <p className="mt-2 text-sm text-[#7B6754]">
            Wedding Challenges Premium במחיר {WEDDING_CHALLENGES_PRICE_ILS} ₪ לאירוע.
            אפשר להפעיל דרך צוות המכירות / אדמין.
          </p>
        </div>
      )}

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["אורחים", stats.guests],
            ["משחקים", stats.players],
            ["הושלמו", stats.completed],
            ["פעילים", stats.active],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-[#E7D8C6] bg-white p-4">
              <p className="text-xs font-bold text-[#7B6754]">{label}</p>
              <p className="text-2xl font-black">{value}</p>
            </div>
          ))}
        </div>
      )}

      <section className="mb-6 space-y-3 rounded-[26px] border border-[#E7D8C6] bg-[#FFFDF8] p-5">
        <h2 className="text-lg font-black">הגדרות משחק</h2>
        <Toggle
          label="Enable Wedding Challenges"
          checked={settings.enabled}
          onChange={(enabled) => setSettings({ ...settings, enabled })}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-bold text-[#7B6754]">
            שעת התחלה
            <input
              type="datetime-local"
              value={datetimeLocal(settings.startAt)}
              onChange={(event) =>
                setSettings({ ...settings, startAt: event.target.value ? new Date(event.target.value).toISOString() : null })
              }
              className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
            />
          </label>
          <label className="text-sm font-bold text-[#7B6754]">
            שעת סיום
            <input
              type="datetime-local"
              value={datetimeLocal(settings.endAt)}
              onChange={(event) =>
                setSettings({ ...settings, endAt: event.target.value ? new Date(event.target.value).toISOString() : null })
              }
              className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
            />
          </label>
        </div>
        <label className="text-sm font-bold text-[#7B6754]">
          מקסימום משימות לאורח (עד 5)
          <input
            type="number"
            min={1}
            max={5}
            value={settings.maxMissionsPerGuest}
            onChange={(event) =>
              setSettings({
                ...settings,
                maxMissionsPerGuest: Math.min(5, Math.max(1, Number(event.target.value || 5))),
              })
            }
            className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
          />
        </label>
        <Toggle
          label="לאפשר משימות צ’ייסרים / אלכוהול"
          checked={settings.allowAlcoholMissions}
          onChange={(allowAlcoholMissions) => setSettings({ ...settings, allowAlcoholMissions })}
        />
        <label className="text-sm font-bold text-[#7B6754]">
          קצב משימות
          <select
            value={settings.pacingMode}
            onChange={(event) =>
              setSettings({ ...settings, pacingMode: event.target.value as WeddingChallengeSettings["pacingMode"] })
            }
            className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
          >
            <option value="immediate">מיידי אחרי השלמה</option>
            <option value="timed">שחרור לפי זמן / קולדאון</option>
            <option value="admin">שחרור ידני מהאדמין</option>
          </select>
        </label>
        <label className="text-sm font-bold text-[#7B6754]">
          קולדאון בין משימות לאורח (דקות)
          <input
            type="number"
            min={0}
            value={settings.cooldownMinutes}
            onChange={(event) =>
              setSettings({ ...settings, cooldownMinutes: Number(event.target.value || 0) })
            }
            className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
          />
        </label>
      </section>

      <section className="mb-6 space-y-3 rounded-[26px] border border-[#E7D8C6] bg-[#FFFDF8] p-5">
        <h2 className="text-lg font-black">קטגוריות</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {categories.map(([key, label]) => (
            <Toggle
              key={key}
              label={label}
              checked={settings.enabledCategories[key]}
              onChange={(value) =>
                setSettings({
                  ...settings,
                  enabledCategories: { ...settings.enabledCategories, [key]: value },
                })
              }
            />
          ))}
        </div>
      </section>

      <section className="mb-6 space-y-3 rounded-[26px] border border-[#E7D8C6] bg-[#FFFDF8] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">Giveaway / הגרלה</h2>
          <span className="text-xs font-bold text-[#A86F2B]">
            +{WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS} ₪ + עלות הפרס
          </span>
        </div>
        {!giveawayPurchased && (
          <p className="text-sm text-[#7B6754]">
            התוספת אופציונלית. לא מוזכרת ב-SMS הראשוני, ונחשפת רק אחרי השלמת משימה.
          </p>
        )}
        <Toggle
          label="Enable Giveaway"
          checked={settings.giveaway.enabled}
          onChange={(enabled) =>
            setSettings({ ...settings, giveaway: { ...settings.giveaway, enabled } })
          }
        />
        <label className="text-sm font-bold text-[#7B6754]">
          פרס
          <input
            value={settings.giveaway.prizeText}
            onChange={(event) =>
              setSettings({
                ...settings,
                giveaway: { ...settings.giveaway, prizeText: event.target.value },
              })
            }
            className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
          />
        </label>
        <label className="text-sm font-bold text-[#7B6754]">
          עלות הפרס (₪)
          <input
            type="number"
            min={0}
            value={settings.giveaway.prizeCost}
            onChange={(event) =>
              setSettings({
                ...settings,
                giveaway: { ...settings.giveaway, prizeCost: Number(event.target.value || 0) },
              })
            }
            className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
          />
        </label>
        <label className="text-sm font-bold text-[#7B6754]">
          מתי לחשוף את ההגרלה
          <select
            value={settings.giveaway.revealMode}
            onChange={(event) =>
              setSettings({
                ...settings,
                giveaway: {
                  ...settings.giveaway,
                  revealMode: event.target.value as WeddingChallengeSettings["giveaway"]["revealMode"],
                },
              })
            }
            className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
          >
            <option value="after_first">אחרי משימה ראשונה</option>
            <option value="after_second">אחרי משימה שנייה</option>
            <option value="manual">חשיפה ידנית מהאדמין</option>
          </select>
        </label>
        <label className="text-sm font-bold text-[#7B6754]">
          כניסות ל-Boss Mission
          <select
            value={settings.giveaway.bossEntries}
            onChange={(event) =>
              setSettings({
                ...settings,
                giveaway: {
                  ...settings.giveaway,
                  bossEntries: Number(event.target.value) === 3 ? 3 : 2,
                },
              })
            }
            className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
          >
            <option value={2}>2 כניסות</option>
            <option value={3}>3 כניסות</option>
          </select>
        </label>
        <Toggle
          label="הגרלה אוטומטית בסוף"
          checked={settings.giveaway.autoDrawAtEnd}
          onChange={(autoDrawAtEnd) =>
            setSettings({ ...settings, giveaway: { ...settings.giveaway, autoDrawAtEnd } })
          }
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={draw}
            className="rounded-full bg-[#3A2A1C] px-4 py-2 text-sm font-black text-white"
          >
            הכרזת זוכה
          </button>
          <a
            href={`/api/wedding-challenges/admin/export?eventId=${eventId}`}
            className="rounded-full border border-[#E7D8C6] px-4 py-2 text-sm font-bold"
          >
            ייצוא זוכים
          </a>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/wedding-challenges/admin/reveal-giveaway", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventId }),
              });
              setMessage("ההגרלה נחשפה לאורחים");
            }}
            className="rounded-full border border-[#E7D8C6] px-4 py-2 text-sm font-bold"
          >
            חשיפה ידנית
          </button>
        </div>
        {settings.giveaway.winnerName ? (
          <p className="text-sm font-black text-[#A86F2B]">זוכה נוכחי: {settings.giveaway.winnerName}</p>
        ) : null}
      </section>

      <section className="mb-6 space-y-3 rounded-[26px] border border-[#E7D8C6] bg-[#FFFDF8] p-5">
        <h2 className="text-lg font-black">SMS פתיחה אחד</h2>
        <p className="text-sm text-[#7B6754]">
          אין SMS לכל משימה. האורחים מקבלים לינק אישי אחד לכרטיס הגירוד.
          {coupleNames ? ` חתונה של ${coupleNames}.` : ""}
        </p>
        <label className="text-sm font-bold text-[#7B6754]">
          תבנית
          <select
            value={settings.sms.template}
            onChange={(event) =>
              setSettings({
                ...settings,
                sms: { ...settings.sms, template: event.target.value === "short" ? "short" : "full" },
              })
            }
            className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
          >
            <option value="full">תבנית מלאה</option>
            <option value="short">תבנית קצרה</option>
          </select>
        </label>
        <pre className="whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm text-[#3A2A1C]">
          {preview}
        </pre>
        <button
          type="button"
          onClick={sendSms}
          className="rounded-full bg-[#C89545] px-5 py-3 text-sm font-black text-white"
        >
          שליחת SMS לאורחים
        </button>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-full bg-[linear-gradient(90deg,#e7c57a,#c8963a)] px-6 py-3 font-black text-white"
        >
          {saving ? "שומר..." : "שמירת הגדרות"}
        </button>
        <button
          type="button"
          onClick={() => window.open("/live/demo", "_blank")}
          className="rounded-full border border-[#E7D8C6] px-5 py-3 font-bold"
        >
          תצוגת אורח
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="rounded-full px-4 py-3 text-sm font-bold text-[#7B6754]"
        >
          חזרה לדשבורד
        </button>
        {message ? <span className="text-sm font-bold text-[#A86F2B]">{message}</span> : null}
      </div>
    </div>
  );
}

export default function WeddingChallengesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[#7B6754]">טוען...</div>}>
      <WeddingChallengesAdmin />
    </Suspense>
  );
}
