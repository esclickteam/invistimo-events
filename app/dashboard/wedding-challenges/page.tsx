"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  userHasWeddingChallengesEntitlement,
  userHasWeddingChallengesGiveawayEntitlement,
  userIsWeddingChallengesOnly,
} from "@/lib/weddingChallenges/entitlement";
import {
  CATEGORY_SHORT_LABELS,
} from "@/lib/weddingChallenges/constants";
import type { WeddingChallengeSettings, WeddingChallengesSourceType } from "@/lib/weddingChallenges/types";
import { defaultWeddingChallengeSettings } from "@/lib/weddingChallenges/settings";
import {
  DEFAULT_EVENT_TIMEZONE,
  formatInZone,
  utcToWallTimeInput,
  wallTimeInZoneToUtc,
} from "@/lib/weddingChallenges/timezone";
import { adminGameStatus, gameWindowState, israelNowLabel } from "@/lib/weddingChallenges/gameWindow";
import GuestRoster from "./GuestRoster";
import SmsSchedulePanel from "./SmsSchedulePanel";
import CustomMissionsPanel from "./CustomMissionsPanel";
import GiveawayCard from "./GiveawayCard";
import WeddingChallengesPurchaseCard from "@/components/wedding-challenges/PurchaseCard";

type Stats = {
  guests: number;
  players: number;
  completed: number;
  active: number;
  entries: number;
  byCategory: { key: string; label: string; count: number }[];
};

type GameSummary = {
  eventId: string;
  coupleNames: string;
  eventDate: string;
  sourceType: WeddingChallengesSourceType;
  enabled: boolean;
  hasGame?: boolean;
  eventDatePast?: boolean;
};

const STATUS_COPY = {
  needs_setup: "נדרשת הגדרה",
  scheduled: "הודעה מתוזמנת",
  ready: "מוכן להפעלה ✓",
  live: "פעיל",
  ended: "הסתיים",
} as const;

function fromWall(value: string, timeZone = DEFAULT_EVENT_TIMEZONE) {
  return value ? wallTimeInZoneToUtc(value, timeZone)?.toISOString() ?? null : null;
}

function formatEventDate(value: string) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value || "";
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-4 rounded-[26px] border border-[#E7D8C6] bg-[#FFFDF8] p-5 ${className}`}>
      {children}
    </section>
  );
}

function WeddingChallengesAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const eventId = searchParams.get("eventId") || "";

  const entitled = userHasWeddingChallengesEntitlement(user as any);
  const gameOnly = userIsWeddingChallengesOnly(user as any);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [serverEntitled, setServerEntitled] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<WeddingChallengeSettings>(
    defaultWeddingChallengeSettings()
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [preview, setPreview] = useState("");
  const [coupleNames, setCoupleNames] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [sourceType, setSourceType] = useState<WeddingChallengesSourceType>("EXISTING_EVENT");
  const [games, setGames] = useState<GameSummary[]>([]);
  const [attachable, setAttachable] = useState<GameSummary[]>([]);
  const [newCoupleNames, setNewCoupleNames] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newStartAt, setNewStartAt] = useState("");
  const [newEndAt, setNewEndAt] = useState("");
  const [giveawayPurchased, setGiveawayPurchased] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [editEvent, setEditEvent] = useState(false);
  const [editGame, setEditGame] = useState(false);
  const timezone = settings.sms.timezone || DEFAULT_EVENT_TIMEZONE;

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
    if (settingsJson?.eventDate) setEventDate(String(settingsJson.eventDate).slice(0, 10));
    if (settingsJson?.sourceType === "STANDALONE_GAME" || settingsJson?.sourceType === "EXISTING_EVENT") {
      setSourceType(settingsJson.sourceType);
    }
    setGiveawayPurchased(Boolean(settingsJson?.giveawayPurchased));
    if (statsJson?.stats) setStats(statsJson.stats);
    if (smsJson?.preview) setPreview(smsJson.preview);
  };

  useEffect(() => {
    fetch("/api/wedding-challenges/entitlement", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        setServerEntitled(Boolean(json.entitled));
        setGiveawayPurchased(Boolean(json.giveawayPurchased));
        setNeedsSetup(Boolean(json.needsSetup));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (eventId) {
      load().catch(() => setMessage("לא הצלחנו לטעון את ההגדרות"));
      return;
    }
    if (serverEntitled === false && user?.role !== "admin") return;
    fetch("/api/wedding-challenges/events", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.linkedEventId) {
          router.replace(`/dashboard/wedding-challenges?eventId=${json.linkedEventId}`);
          return;
        }
        setGames(json.games || []);
        setAttachable(json.attachableEvents || []);
        setNeedsSetup(Boolean(json.needsSetup));
      })
      .catch(() => setMessage("לא הצלחנו לטעון אירועים"));
  }, [eventId, serverEntitled]);

  useEffect(() => {
    if (eventId) return;
    const allowed =
      (serverEntitled ?? entitled) || user?.role === "admin" || Boolean((user as any)?.impersonatedBy);
    if (!allowed) return;
    if (games.length === 1) {
      router.replace(`/dashboard/wedding-challenges?eventId=${games[0].eventId}`);
    }
  }, [eventId, games, serverEntitled, entitled, user, router]);

  useEffect(() => {
    if (!eventId) return;
    const timer = window.setInterval(() => setNowTick(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [eventId]);

  const save = async (next = settings) => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/wedding-challenges/settings?eventId=${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { ...next, enabled: true }, coupleNames, eventDate }),
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

  const draw = async (reset = false) => {
    if (reset) {
      if (!window.confirm("לאפס את ההגרלה ולאפשר בחירת זוכה מחדש? הפעולה מפורשת ומבטלת את הנעילה.")) {
        return;
      }
    }
    const res = await fetch("/api/wedding-challenges/admin/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reset ? { eventId, reset: true, confirm: true } : { eventId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error || "ההגרלה נכשלה");
      return;
    }
    setMessage(reset ? "ההגרלה אופסה" : `הזוכה: ${json.winner?.name || "נבחר"}`);
    await load();
  };

  const createStandalone = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/wedding-challenges/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coupleNames: newCoupleNames,
          eventDate: newEventDate,
          startAt: fromWall(newStartAt, timezone),
          endAt: fromWall(newEndAt, timezone),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.eventId) throw new Error(json.error || "CREATE_FAILED");
      router.push(`/dashboard/wedding-challenges?eventId=${json.eventId}`);
    } catch {
      setMessage("יצירת האירוע נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const attachExisting = async (existingEventId: string, eventDatePast?: boolean) => {
    if (eventDatePast) {
      if (!window.confirm("תאריך האירוע כבר עבר. להפעיל את המשחק בכל זאת? שעות המשחק לא יועתקו אוטומטית.")) {
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch("/api/wedding-challenges/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ existingEventId, confirmPastEvent: Boolean(eventDatePast) }),
      });
      const json = await res.json();
      if (!res.ok || !json.eventId) throw new Error(json.error || "ATTACH_FAILED");
      router.push(`/dashboard/wedding-challenges?eventId=${json.eventId}`);
    } catch {
      setMessage("חיבור האירוע נכשל");
    } finally {
      setSaving(false);
    }
  };

  const hasAccess =
    (serverEntitled ?? entitled) || user?.role === "admin" || Boolean((user as any)?.impersonatedBy);
  const locked = !hasAccess;
  const canBuyGiveaway =
    hasAccess && !giveawayPurchased && !userHasWeddingChallengesGiveawayEntitlement(user as any);
  const now = new Date(nowTick);
  const windowState = gameWindowState(settings, now);
  const status = adminGameStatus({
    entitled: hasAccess,
    settings,
    smsStatus: settings.sms.status,
    now,
  });
  const categories = useMemo(
    () => Object.entries(CATEGORY_SHORT_LABELS) as [keyof typeof CATEGORY_SHORT_LABELS, string][],
    []
  );
  const activeCategories = categories.filter(([key]) => settings.enabledCategories[key]).length;
  const steps = [
    Boolean(coupleNames && eventDate),
    Number(stats?.guests || 0) > 0,
    Boolean(settings.startAt && settings.endAt),
    settings.sms.status === "scheduled" || settings.sms.status === "sent" || settings.sms.sentCount > 0,
    true,
  ];
  const doneSteps = steps.filter(Boolean).length;

  if (!eventId) {
    if (locked) {
      return (
        <div className="mx-auto max-w-xl px-4 py-6" dir="rtl">
          <WeddingChallengesPurchaseCard
            entitled={false}
            giveawayPurchased={giveawayPurchased}
            sourceType={attachable.length ? "EXISTING_EVENT" : "STANDALONE_GAME"}
          />
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-xl px-4 py-8" dir="rtl">
        <p className="text-sm font-black tracking-[0.18em] text-[#B8893A]">INVISTIMO LIVE</p>
        <h1 className="mt-2 text-3xl font-black text-[#3A2A1C]">Wedding Challenges</h1>
        <p className="mt-2 text-sm text-[#7B6754]">
          {gameOnly
            ? "ברוכים הבאים ל-Wedding Challenges. מגדירים את האירוע ואז מעלים משתתפים."
            : "הוסיפו את המשחק לאירוע קיים, או צרו משחק עצמאי."}
        </p>
        {(needsSetup || games.length === 0) && (
          <p className="mt-4 rounded-2xl bg-[#FFF3DF] px-4 py-3 text-sm font-black text-[#A86F2B]">
            השלמת הגדרת האירוע
          </p>
        )}

        <Card className="mt-6">
          <h2 className="text-lg font-black">{gameOnly ? "הגדרת האירוע" : "יצירת אירוע למשחק"}</h2>
          <p className="text-sm text-[#7B6754]">משחק עצמאי — בלי הזמנה, RSVP או אתר חתונה.</p>
          <input
            value={newCoupleNames}
            onChange={(event) => setNewCoupleNames(event.target.value)}
            placeholder="שמות בני הזוג / שם האירוע"
            className="w-full max-w-md rounded-xl border border-[#E7D8C6] px-3 py-2"
          />
          <label className="block max-w-md text-sm font-bold text-[#7B6754]">
            תאריך האירוע
            <input
              type="date"
              value={newEventDate}
              onChange={(event) => setNewEventDate(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
            />
          </label>
          <p className="text-xs font-bold text-[#A86F2B]">שעון ישראל</p>
          <div className="grid max-w-xl gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold text-[#7B6754]">
              התחלת משחק
              <input
                type="datetime-local"
                value={newStartAt}
                onChange={(event) => setNewStartAt(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
              />
            </label>
            <label className="text-sm font-bold text-[#7B6754]">
              סיום משחק
              <input
                type="datetime-local"
                value={newEndAt}
                onChange={(event) => setNewEndAt(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={saving || !newCoupleNames || !newEventDate}
            onClick={createStandalone}
            className="rounded-full bg-[linear-gradient(90deg,#e7c57a,#c8963a)] px-6 py-3 font-black text-white disabled:opacity-50"
          >
            {saving ? "יוצר..." : "הגדרת האירוע"}
          </button>
        </Card>

        {games.length > 1 && (
          <Card className="mt-6 bg-white">
            <h2 className="text-lg font-black">משחקים קיימים</h2>
            {games.map((game) => (
              <button
                key={game.eventId}
                type="button"
                onClick={() => router.push(`/dashboard/wedding-challenges?eventId=${game.eventId}`)}
                className="flex w-full items-center justify-between rounded-2xl border border-[#E7D8C6] px-4 py-3 text-right"
              >
                <span>
                  <span className="block font-black">{game.coupleNames || "אירוע"}</span>
                  <span className="text-xs text-[#7B6754]">{formatEventDate(game.eventDate)}</span>
                </span>
                <span className="text-sm font-bold text-[#A86F2B]">פתיחה</span>
              </button>
            ))}
          </Card>
        )}

        {attachable.length > 0 && !gameOnly && (
          <Card className="mt-6 bg-white">
            <h2 className="text-lg font-black">חיבור לאירוע Invistimo</h2>
            <p className="text-sm text-[#7B6754]">רק אורחים שאישרו הגעה ייכנסו למשחק.</p>
            {attachable.map((game) => (
              <button
                key={game.eventId}
                type="button"
                disabled={saving}
                onClick={() => attachExisting(game.eventId, game.eventDatePast)}
                className="flex w-full items-center justify-between rounded-2xl border border-[#E7D8C6] px-4 py-3 text-right"
              >
                <span>
                  <span className="block font-black">{game.coupleNames || "אירוע"}</span>
                  <span className="text-xs text-[#7B6754]">
                    {formatEventDate(game.eventDate)}
                    {game.eventDatePast ? " · התאריך כבר עבר" : ""}
                  </span>
                </span>
                <span className="text-sm font-bold text-[#A86F2B]">הפעלה על האירוע הזה</span>
              </button>
            ))}
          </Card>
        )}
        {message ? <p className="mt-4 text-sm font-bold text-[#A86F2B]">{message}</p> : null}
      </div>
    );
  }

  if (locked) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6" dir="rtl">
        <WeddingChallengesPurchaseCard
          entitled={false}
          giveawayPurchased={giveawayPurchased}
          sourceType={sourceType}
          eventId={eventId}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8" dir="rtl">
      <div className="mb-6">
        <p className="text-sm font-black tracking-[0.18em] text-[#B8893A]">INVISTIMO LIVE</p>
        <h1 className="mt-1 text-3xl font-black text-[#3A2A1C]">{coupleNames || "Wedding Challenges"}</h1>
        <p className="mt-1 text-sm text-[#7B6754]">{formatEventDate(eventDate)}</p>
        <p className="mt-1 text-xs font-bold text-[#A86F2B]">
          {sourceType === "STANDALONE_GAME" ? "משחק עצמאי" : "מחובר לאירוע Invistimo"}
        </p>
        <span className="mt-3 inline-flex rounded-full bg-[#FFF3DF] px-4 py-2 text-sm font-black text-[#A86F2B]">
          {STATUS_COPY[status]}
        </span>
        <p className="mt-3 text-sm font-bold text-[#7B6754]">הגדרת {doneSteps} מתוך 5 שלבים</p>
      </div>

      <div className="space-y-4">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">פרטי האירוע</h2>
              <p className="mt-1 font-black">{coupleNames || "—"}</p>
              <p className="text-sm text-[#7B6754]">{formatEventDate(eventDate)}</p>
              <p className="mt-2 text-sm text-[#7B6754]">
                חלון משחק:{" "}
                {windowState === "unconfigured"
                  ? "עדיין לא הוגדר"
                  : `${formatInZone(settings.startAt, timezone) || "—"} → ${formatInZone(settings.endAt, timezone) || "פתוח"}`}
              </p>
              <p className="mt-1 text-xs text-[#A86F2B]">עכשיו: {israelNowLabel(now, timezone)}</p>
            </div>
            {sourceType === "EXISTING_EVENT" && !gameOnly ? (
              <a
                href={`/events/production?eventId=${eventId}&tab=overview`}
                className="rounded-full border border-[#E7D8C6] px-4 py-2 text-sm font-bold"
              >
                עריכת פרטי האירוע
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setEditEvent((value) => !value)}
                className="rounded-full border border-[#E7D8C6] px-4 py-2 text-sm font-bold"
              >
                עריכה
              </button>
            )}
          </div>
          {(editEvent || sourceType === "STANDALONE_GAME") && (
            <div className="grid max-w-md gap-3">
              <input
                value={coupleNames}
                onChange={(event) => setCoupleNames(event.target.value)}
                className="rounded-xl border border-[#E7D8C6] px-3 py-2"
                placeholder="שם האירוע"
              />
              <input
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                className="rounded-xl border border-[#E7D8C6] px-3 py-2"
              />
              <button
                type="button"
                onClick={() => save()}
                className="w-fit rounded-full bg-[#3A2A1C] px-4 py-2 text-sm font-black text-white"
              >
                שמירת פרטים
              </button>
            </div>
          )}
        </Card>

        <GuestRoster eventId={eventId} sourceType={sourceType} />

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">המשחק</h2>
              <p className="mt-1 text-sm text-[#7B6754]">
                {settings.maxMissionsPerGuest} משימות לאורח · {activeCategories} קטגוריות פעילות
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditGame((value) => !value)}
              className="rounded-full bg-[#3A2A1C] px-4 py-2 text-sm font-black text-white"
            >
              עריכה
            </button>
          </div>
          <p className="text-sm font-bold text-[#3A2A1C]">משימות לכל אורח</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => {
                  const next = { ...settings, enabled: true, maxMissionsPerGuest: count };
                  setSettings(next);
                }}
                className={`h-10 w-10 rounded-full text-sm font-black ${
                  settings.maxMissionsPerGuest === count
                    ? "bg-[#3A2A1C] text-white"
                    : "border border-[#E7D8C6] bg-white"
                }`}
              >
                {count}
              </button>
            ))}
          </div>
          {editGame ? (
            <>
              <div className="grid max-w-xl gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold text-[#7B6754]">
                  שעת התחלה
                  <input
                    type="datetime-local"
                    value={utcToWallTimeInput(settings.startAt, timezone)}
                    onChange={(event) =>
                      setSettings({ ...settings, startAt: fromWall(event.target.value, timezone) })
                    }
                    className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
                  />
                </label>
                <label className="text-sm font-bold text-[#7B6754]">
                  שעת סיום
                  <input
                    type="datetime-local"
                    value={utcToWallTimeInput(settings.endAt, timezone)}
                    onChange={(event) =>
                      setSettings({ ...settings, endAt: fromWall(event.target.value, timezone) })
                    }
                    className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
                  />
                </label>
              </div>
              <p className="text-xs font-bold text-[#A86F2B]">שעון ישראל · נשמר ב-UTC</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={settings.enabledCategories[key]}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          enabledCategories: { ...settings.enabledCategories, [key]: event.target.checked },
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              {settings.enabledCategories.shots ? (
                <p className="text-xs text-[#7B6754]">משימות צ׳ייסרים יוצגו רק למשתתפים שמוגדרים כבגירים.</p>
              ) : null}
              <button
                type="button"
                onClick={() => save()}
                disabled={saving}
                className="rounded-full bg-[linear-gradient(90deg,#e7c57a,#c8963a)] px-5 py-3 text-sm font-black text-white"
              >
                שמירת המשחק
              </button>
              <CustomMissionsPanel eventId={eventId} disabled={locked} onMessage={setMessage} />
            </>
          ) : null}
        </Card>

        <SmsSchedulePanel
          eventId={eventId}
          template={settings.sms.template}
          timezone={timezone}
          preview={preview}
          disabled={locked}
          onTemplateChange={(template) =>
            setSettings({ ...settings, sms: { ...settings.sms, template } })
          }
          onTimezoneChange={(nextTimezone) =>
            setSettings({ ...settings, sms: { ...settings.sms, timezone: nextTimezone } })
          }
          onMessage={setMessage}
        />

        <GiveawayCard
          eventId={eventId}
          sourceType={sourceType}
          settings={settings}
          timezone={timezone}
          giveawayPurchased={giveawayPurchased}
          canBuy={canBuyGiveaway}
          stats={stats}
          disabled={locked}
          now={now}
          onChange={setSettings}
          onDraw={draw}
          onMessage={setMessage}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => save()}
            className="rounded-full bg-[linear-gradient(90deg,#e7c57a,#c8963a)] px-6 py-3 font-black text-white"
          >
            {saving ? "שומר..." : "שמירה"}
          </button>
          <button
            type="button"
            onClick={() => window.open("/live/demo", "_blank")}
            className="rounded-full border border-[#E7D8C6] px-5 py-3 font-bold"
          >
            תצוגת אורח
          </button>
          {!gameOnly ? (
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-full px-4 py-3 text-sm font-bold text-[#7B6754]"
            >
              חזרה לדשבורד
            </button>
          ) : null}
        </div>
        {message ? <p className="text-sm font-bold text-[#A86F2B]">{message}</p> : null}
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
