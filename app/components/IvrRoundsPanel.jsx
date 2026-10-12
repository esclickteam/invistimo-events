"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatCallRoundDateTimeDmy,
  formatCallRoundDateTimeInput,
} from "@/lib/calls/callRoundScheduleTime";

function roundStatusLabel(status) {
  const raw = String(status || "").toLowerCase();
  if (raw === "done" || raw === "completed") return "הושלם";
  if (raw === "failed") return "נכשל";
  if (raw === "in_progress" || raw === "opened") return "מתבצע";
  if (raw === "cancelled" || raw === "canceled") return "בוטל";
  if (raw === "scheduled") return "מתוזמן";
  return "אין תזמון";
}

function customerIvrError(raw, fallback) {
  const text = String(raw || "");
  if (
    /Cast to Object failed|User validation failed|ValidationError/i.test(text)
  ) {
    return "שמירת ההגדרות נכשלה בגלל מבנה נתונים לא תקין. הנתונים הקיימים לא נמחקו. נסו שוב.";
  }
  if (text.includes("טעינת רשימת הקולות")) {
    return fallback || "טעינת השיחות המוקלטות נכשלה. נסו שוב.";
  }
  return text || fallback || "שגיאה";
}

function splitIsraelInput(value) {
  const wall = formatCallRoundDateTimeInput(value);
  if (!wall || !wall.includes("T")) return { date: "", time: "" };
  const [y, m, d] = wall.slice(0, 10).split("-");
  return { date: `${d}/${m}/${y}`, time: wall.slice(11, 16) };
}

function joinIsraelInput(dateText, timeText) {
  const date = String(dateText || "")
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const time = String(timeText || "")
    .trim()
    .match(/^(\d{2}):(\d{2})$/);
  if (!date || !time) return "";
  const day = Number(date[1]);
  const month = Number(date[2]);
  const hour = Number(time[1]);
  const minute = Number(time[2]);
  if (
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    hour > 23 ||
    minute > 59
  ) {
    return "";
  }
  return `${date[3]}-${date[2]}-${date[1]}T${time[1]}:${time[2]}`;
}

function dmyToIsoDate(dateText) {
  const match = String(dateText || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function isoDateToDmy(iso) {
  const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function IsraelDateTimeFields({ value, onChange }) {
  const parsed = splitIsraelInput(value);
  const [dateText, setDateText] = useState(parsed.date);
  const [timeText, setTimeText] = useState(parsed.time);
  const [timeOpen, setTimeOpen] = useState(false);
  const timePickerRef = useRef(null);
  const hour = timeText.slice(0, 2);
  const minute = timeText.slice(3, 5);
  const hours = Array.from({ length: 24 }, (_, index) =>
    String(index).padStart(2, "0")
  );
  const minutes = Array.from({ length: 60 }, (_, index) =>
    String(index).padStart(2, "0")
  );

  useEffect(() => {
    const next = splitIsraelInput(value);
    setDateText(next.date);
    setTimeText(next.time);
  }, [value]);

  useEffect(() => {
    if (!timeOpen) return;
    function onPointerDown(event) {
      if (!timePickerRef.current?.contains(event.target)) {
        setTimeOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    const selectedHour = timePickerRef.current?.querySelector(
      `[data-hour="${hour || "00"}"]`
    );
    const selectedMinute = timePickerRef.current?.querySelector(
      `[data-minute="${minute || "00"}"]`
    );
    selectedHour?.scrollIntoView({ block: "center" });
    selectedMinute?.scrollIntoView({ block: "center" });
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [timeOpen, hour, minute]);

  function commit(nextDate, nextTime) {
    setDateText(nextDate);
    setTimeText(nextTime);
    const dateEmpty = !String(nextDate || "").trim();
    const timeEmpty = !String(nextTime || "").trim();
    if (dateEmpty && timeEmpty) {
      onChange("");
      return;
    }
    const joined = joinIsraelInput(nextDate, nextTime);
    if (joined) onChange(joined);
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <label className="block text-[11px] font-black text-[#8A7867]">
        תאריך (DD/MM/YYYY)
        <input
          type="date"
          lang="he-IL"
          dir="ltr"
          value={dmyToIsoDate(dateText)}
          onChange={(e) => commit(isoDateToDmy(e.target.value), timeText)}
          className="mt-1 w-full rounded-xl border border-[#E7D8C6] bg-white px-3 py-2 text-sm font-bold text-[#3A2A1C]"
          data-testid="ivr-round-date"
        />
        {dateText ? (
          <span className="mt-1 block text-[11px] font-bold text-[#3A2A1C]">
            {dateText}
          </span>
        ) : null}
      </label>
      <div
        className="relative block text-[11px] font-black text-[#8A7867]"
        ref={timePickerRef}
      >
        שעה (HH:mm)
        <button
          type="button"
          dir="ltr"
          onClick={() => setTimeOpen((open) => !open)}
          className="mt-1 w-full rounded-xl border border-[#E7D8C6] bg-white px-3 py-2 text-left text-sm font-bold text-[#3A2A1C]"
          data-testid="ivr-round-time"
          aria-label="שעה HH:mm"
          aria-expanded={timeOpen}
        >
          {timeText || "HH:mm"}
        </button>
        {timeOpen ? (
          <div
            dir="ltr"
            className="absolute top-full z-30 mt-1 w-56 max-w-full rounded-xl border border-[#E7D8C6] bg-white p-2 shadow-lg"
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="mb-1 text-[10px] font-black text-[#8A7867]">
                  HH
                </div>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-[#F0E4D4]">
                  {hours.map((item) => (
                    <button
                      key={item}
                      type="button"
                      data-hour={item}
                      onClick={() => {
                        const nextMinute = minute || "00";
                        commit(dateText, `${item}:${nextMinute}`);
                        if (minute) setTimeOpen(false);
                      }}
                      className={`block w-full px-2 py-1 text-left text-sm font-bold ${
                        item === hour
                          ? "bg-[#FFF4E4] text-[#3A2A1C]"
                          : "text-[#6B5A48]"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-black text-[#8A7867]">
                  mm
                </div>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-[#F0E4D4]">
                  {minutes.map((item) => (
                    <button
                      key={item}
                      type="button"
                      data-minute={item}
                      onClick={() => {
                        commit(dateText, `${hour || "00"}:${item}`);
                        setTimeOpen(false);
                      }}
                      className={`block w-full px-2 py-1 text-left text-sm font-bold ${
                        item === minute
                          ? "bg-[#FFF4E4] text-[#3A2A1C]"
                          : "text-[#6B5A48]"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function IvrRoundsPanel({
  schedule,
  onScheduleChange,
  userId = "",
}) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      // Never load /api/ivr/voices. Settings/rounds must load even when media is down.
      const [cfgRes, statsRes] = await Promise.all([
        fetch(`/api/ivr/config${qs}`, {
          credentials: "include",
          signal: ctrl.signal,
        }),
        fetch(`/api/ivr/rounds/stats${qs}`, {
          credentials: "include",
          signal: ctrl.signal,
        }),
      ]);

      const cfg = await cfgRes.json().catch(() => null);
      const statsData = await statsRes.json().catch(() => null);

      if (!cfgRes.ok || !cfg?.ok) {
        throw new Error(
          customerIvrError(
            cfg?.message || cfg?.error,
            "טעינת הגדרות השיחות המוקלטות נכשלה"
          )
        );
      }

      setStats(Array.isArray(statsData?.rounds) ? statsData.rounds : []);
    } catch (err) {
      const aborted =
        (err instanceof Error && err.name === "AbortError") ||
        (typeof DOMException !== "undefined" &&
          err instanceof DOMException &&
          err.name === "AbortError");
      setError(
        customerIvrError(
          aborted
            ? "TIMEOUT"
            : err instanceof Error
              ? err.message
              : "",
          aborted
            ? "טעינת המסך ארכה יותר מדי. לחצו על נסה שוב."
            : "שגיאה בטעינה"
        )
      );
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const rounds = Array.isArray(schedule?.rounds) ? schedule.rounds : [];

  if (loading) {
    return (
      <div
        data-testid="ivr-rounds-loading"
        className="rounded-2xl border border-[#E7D8C6] bg-white p-5 text-sm font-bold text-[#8A7867]"
      >
        טוען הגדרות שיחות מוקלטות...
      </div>
    );
  }

  if (error && !rounds.length && !schedule) {
    return (
      <div
        data-testid="ivr-rounds-load-error"
        className="rounded-2xl border border-red-300 bg-red-50 p-5 space-y-3"
        dir="rtl"
      >
        <p className="text-sm font-black text-red-900">
          {error || "טעינת הגדרות השיחות המוקלטות נכשלה."}
        </p>
        <button
          type="button"
          data-testid="ivr-rounds-retry"
          onClick={() => loadAll()}
          className="rounded-xl bg-[#B97821] px-4 py-2 text-sm font-black text-white"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {error ? (
        <div
          data-testid="ivr-rounds-inline-error"
          className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-950 flex flex-wrap items-center justify-between gap-2"
        >
          <span>{error}</span>
          <button
            type="button"
            data-testid="ivr-rounds-retry"
            onClick={() => loadAll()}
            className="underline"
          >
            נסה שוב
          </button>
        </div>
      ) : null}
      <section className="rounded-2xl border border-[#E7D8C6] bg-white p-5">
        <h3 className="text-lg font-black text-[#3A2A1C]">
          תזמון 3 סבבי שיחות מוקלטות
        </h3>
        <p className="mt-1 text-xs font-bold text-[#8A7867]">
          השיחות יוצאות במועד שנקבע (שעון ישראל). הקהל מחושב מחדש בזמן הביצוע —
          לא בשמירת התזמון. בדיקת התזמון רצה כל דקה — ייתכן עיכוב של עד כדקה
          מהשעה שנבחרה.
        </p>
        <p
          data-testid="ivr-auto-narration-note"
          className="mt-3 rounded-xl border border-[#E7D8C6] bg-[#FFF8EE] px-3 py-2 text-xs font-bold leading-6 text-[#6B5A48]"
        >
          הקריינות היא AI ומשתמשת אוטומטית בשם האירוע מפרטי האירוע. אין צורך
          בהקלטה, בהזנת שם נפרד או באישור. אם מעדכנים את שם האירוע, שיחות שטרם
          בוצעו ישתמשו בשם המעודכן.
        </p>

        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((roundNumber) => {
            const round =
              rounds.find((r) => Number(r.roundNumber) === roundNumber) || {
                roundNumber,
                scheduledAt: "",
              };
            const stat = stats.find((s) => Number(s.round) === roundNumber);

            return (
              <div
                key={roundNumber}
                className="rounded-xl border border-[#EFE2D1] bg-[#FFFDF8] p-3"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="font-black text-[#3A2A1C]">
                    סבב מוקלט {roundNumber}
                  </div>
                  <button
                    type="button"
                    className="text-[11px] font-black text-[#8A7867] underline"
                    onClick={() => {
                      const nextRounds = [1, 2, 3].map((n) => {
                        const existing =
                          rounds.find((r) => Number(r.roundNumber) === n) || {
                            roundNumber: n,
                            scheduledAt: "",
                            title: `סבב מוקלט ${n}`,
                          };
                        if (n !== roundNumber) return existing;
                        return {
                          ...existing,
                          roundNumber: n,
                          scheduledAt: "",
                          status: "cancelled",
                          title: `סבב מוקלט ${n}`,
                        };
                      });
                      onScheduleChange?.({
                        enabled: true,
                        rounds: nextRounds,
                      });
                    }}
                  >
                    ביטול תזמון
                  </button>
                  {stat ? (
                    <div className="text-[11px] font-bold text-[#8A7867]">
                      לחייג: {stat.toDial} · חויגו: {stat.attempted} · נענו:{" "}
                      {stat.answered} · אישרו: {stat.confirmed} · לא מגיעים:{" "}
                      {stat.declined} · מתלבטים: {stat.undecided} · לא ענו:{" "}
                      {stat.noAnswer} · נכשלו: {stat.failed} · ממתינים:{" "}
                      {stat.pending}
                    </div>
                  ) : null}
                </div>
                <div className="mb-2 text-[11px] font-black text-[#3A2A1C]">
                  {stat?.executionLabel ||
                    roundStatusLabel(round.status)}
                  {stat?.scheduledAtDisplay
                    ? ` · ${stat.scheduledAtDisplay}`
                    : round.scheduledAt
                      ? ` · ${formatCallRoundDateTimeDmy(
                          formatCallRoundDateTimeInput(round.scheduledAt) ||
                            round.scheduledAt
                        )}`
                      : ""}
                </div>
                {stat?.failureReason ? (
                  <div className="mb-2 text-[11px] font-bold text-rose-700">
                    {stat.failureReason}
                  </div>
                ) : null}
                <div data-tour={roundNumber === 1 ? "call-round-time" : undefined}>
                <IsraelDateTimeFields
                  value={round.scheduledAt}
                  onChange={(value) => {
                    const nextRounds = [1, 2, 3].map((n) => {
                      const existing =
                        rounds.find((r) => Number(r.roundNumber) === n) || {
                          roundNumber: n,
                          scheduledAt: "",
                          title: `סבב מוקלט ${n}`,
                        };
                      if (n !== roundNumber) return existing;
                      const changed =
                        String(existing.scheduledAt || "") !== String(value || "");
                      return {
                        ...existing,
                        roundNumber: n,
                        scheduledAt: value,
                        status: changed
                          ? value
                            ? "scheduled"
                            : "cancelled"
                          : existing.status,
                        title: `סבב מוקלט ${n}`,
                      };
                    });
                    onScheduleChange?.({
                      enabled: true,
                      rounds: nextRounds,
                    });
                  }}
                />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
