"use client";

import { useCallback, useEffect, useState } from "react";
import IvrCallsReportModal from "@/app/components/IvrCallsReportModal";
import { formatCallRoundDateTimeInput } from "@/lib/calls/callRoundScheduleTime";

type IvrRoundRow = {
  round: number;
  title: string;
  status: string;
  statusLabel: string;
  failureReason?: string;
  scheduledAt: string | null;
  scheduledAtInput: string;
  scheduledAtDisplay: string;
  eligibleCount: number;
  dialedCount: number;
  remainingCount: number;
  canOpen: boolean;
  canStop: boolean;
  canResume: boolean;
  blockReasons: string[];
};

type Props = {
  userId: string;
  clientName: string;
  onScheduleChanged?: () => void;
};

function statusBadgeClass(status: string) {
  if (status === "done") return "bg-[#EAF8EF] text-[#1F9A55]";
  if (status === "failed") return "bg-red-50 text-red-600";
  if (status === "in_progress") return "bg-[#EEF4FF] text-[#2F5EA8]";
  if (status === "cancelled") return "bg-[#F6F1EA] text-[#7B6754]";
  if (status === "scheduled") return "bg-blue-50 text-blue-600";
  return "bg-[#F6F1EA] text-[#7B6754]";
}

export default function AdminIvrRoundsPanel({
  userId,
  clientName,
  onScheduleChanged,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [rounds, setRounds] = useState<IvrRoundRow[]>([]);
  const [audioReady, setAudioReady] = useState(true);
  const [audioBlockReason, setAudioBlockReason] = useState("");
  const [liveDialDisabled, setLiveDialDisabled] = useState(false);
  const [eventActive, setEventActive] = useState(true);
  const [reportRound, setReportRound] = useState<string | null>(null);
  const [draftTimes, setDraftTimes] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/ivr-rounds`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.message || data?.error || "טעינת סבבי IVR נכשלה");
        setRounds([]);
        return;
      }
      const nextRounds: IvrRoundRow[] = Array.isArray(data.rounds)
        ? data.rounds
        : [];
      setRounds(nextRounds);
      setAudioReady(Boolean(data.audioReady));
      setAudioBlockReason(String(data.audioBlockReason || ""));
      setLiveDialDisabled(Boolean(data.liveDialDisabled));
      setEventActive(data.eventActive !== false);
      setDraftTimes(
        Object.fromEntries(
          nextRounds.map((r) => [
            r.round,
            r.scheduledAtInput ||
              formatCallRoundDateTimeInput(r.scheduledAt) ||
              "",
          ])
        )
      );
    } catch (err) {
      console.error(err);
      setError("טעינת סבבי IVR נכשלה");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function postAction(body: Record<string, unknown>, key: string) {
    setBusyKey(key);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/ivr-rounds`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.message || data?.error || "הפעולה נכשלה");
        return false;
      }
      if (Array.isArray(data.rounds)) {
        setRounds(data.rounds);
        setDraftTimes(
          Object.fromEntries(
            data.rounds.map((r: IvrRoundRow) => [
              r.round,
              r.scheduledAtInput || "",
            ])
          )
        );
      } else {
        await load();
      }
      setAudioReady(data.audioReady !== false);
      setAudioBlockReason(String(data.audioBlockReason || ""));
      setLiveDialDisabled(Boolean(data.liveDialDisabled));
      setEventActive(data.eventActive !== false);
      return true;
    } catch (err) {
      console.error(err);
      setError("הפעולה נכשלה");
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  async function openRound(round: IvrRoundRow) {
    setBusyKey(`preview-${round.round}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}/ivr-rounds`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", round: round.round }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.message || data?.error || "בדיקת הסבב נכשלה");
        return;
      }
      if (!data.canOpen) {
        const reasons = Array.isArray(data.blockReasons)
          ? data.blockReasons.join(" · ")
          : "לא ניתן לפתוח את הסבב";
        setError(reasons);
        alert(reasons);
        return;
      }
      const count = Number(data.eligibleCount || 0);
      const confirmed = confirm(
        `לפתוח עכשיו את סבב ${round.round}?\n\nיחייגו עד ${count} אורחים זכאים (ללא מי שכבר נתן תשובה סופית).\n\nהפתיחה משתמשת באותו מנגנון חיוג של המערכת — ללא עקיפת בטיחות.`
      );
      if (!confirmed) return;
    } finally {
      setBusyKey(null);
    }

    const ok = await postAction(
      { action: "open", round: round.round },
      `open-${round.round}`
    );
    if (ok) {
      alert(`סבב ${round.round} נפתח`);
      onScheduleChanged?.();
    }
  }

  async function saveSchedule(roundNumber: number) {
    const value = draftTimes[roundNumber] || "";
    const roundsPayload = [1, 2, 3].map((n) => ({
      roundNumber: n,
      scheduledAt:
        n === roundNumber ? value : draftTimes[n] || "",
    }));
    const ok = await postAction(
      { action: "schedule", rounds: roundsPayload },
      `schedule-${roundNumber}`
    );
    if (ok) {
      onScheduleChanged?.();
    }
  }

  return (
    <div
      className="rounded-2xl border border-[#EFE2D1] bg-[#FFFDF8] p-4"
      data-testid="admin-ivr-rounds-panel"
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-black text-[#3A2A1C]">סבבי שיחות IVR</div>
          <p className="mt-1 text-xs font-bold text-[#8A7867]">
            פתיחה ידנית, תזמון וסטטוס — מסונכרן עם חשבון הלקוח. ללא עקיפת חסימות
            בטיחות.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || Boolean(busyKey)}
          className="h-9 rounded-full border border-[#E7D8C6] bg-white px-4 text-xs font-black text-[#6B451E] disabled:opacity-50"
        >
          רענון
        </button>
      </div>

      {(!eventActive || !audioReady || liveDialDisabled) && (
        <div className="mb-3 rounded-xl border border-[#F0D7B0] bg-[#FFF8E6] px-3 py-2 text-xs font-bold text-[#9A651B]">
          {!eventActive && <div>האירוע אינו פעיל — לא ניתן לפתוח סבב.</div>}
          {!audioReady && (
            <div>
              {audioBlockReason || "אין קריינות מאושרת ונגישה — החיוג חסום."}
            </div>
          )}
          {liveDialDisabled && (
            <div>חיוגי IVR מושבתים זמנית במערכת.</div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-6 text-center text-sm font-bold text-[#8A7867]">
          טוען סבבי IVR...
        </div>
      ) : (
        <div className="space-y-2">
          {rounds.map((round) => {
            const busy =
              busyKey === `open-${round.round}` ||
              busyKey === `preview-${round.round}` ||
              busyKey === `stop-${round.round}` ||
              busyKey === `resume-${round.round}` ||
              busyKey === `schedule-${round.round}`;

            return (
              <div
                key={round.round}
                className="rounded-xl border border-[#EFE2D1] bg-white px-3 py-3"
                data-testid={`admin-ivr-round-${round.round}`}
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-[#3A2A1C]">
                        {round.title}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${statusBadgeClass(round.status)}`}
                      >
                        {round.statusLabel}
                      </span>
                      {round.scheduledAtDisplay ? (
                        <span className="text-[11px] font-bold text-[#8A7867]">
                          {round.scheduledAtDisplay}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-[#6B5A48]">
                      <span>מיועדים: {round.eligibleCount}</span>
                      <span>בוצעו: {round.dialedCount}</span>
                      <span>נותרו: {round.remainingCount}</span>
                    </div>
                    {round.failureReason ? (
                      <div className="mt-1 text-[11px] font-bold text-red-600">
                        {round.failureReason}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busy || !round.canOpen}
                      title={
                        round.canOpen
                          ? "פתח סבב עכשיו"
                          : (round.blockReasons || []).join(" · ") ||
                            "לא ניתן לפתוח"
                      }
                      onClick={() => void openRound(round)}
                      className="h-8 rounded-full bg-[#2F3742] px-3 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                      data-testid={`admin-ivr-open-${round.round}`}
                    >
                      פתח סבב עכשיו
                    </button>

                    {round.canStop ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (!confirm(`לעצור את סבב ${round.round}?`)) return;
                          void postAction(
                            { action: "stop", round: round.round },
                            `stop-${round.round}`
                          ).then((ok) => ok && onScheduleChanged?.());
                        }}
                        className="h-8 rounded-full bg-red-600 px-3 text-[11px] font-black text-white disabled:opacity-40"
                      >
                        עצור
                      </button>
                    ) : null}

                    {round.canResume ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void postAction(
                            { action: "resume", round: round.round },
                            `resume-${round.round}`
                          ).then((ok) => ok && onScheduleChanged?.())
                        }
                        className="h-8 rounded-full bg-[#B97821] px-3 text-[11px] font-black text-white disabled:opacity-40"
                      >
                        חידוש
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setReportRound(String(round.round))}
                      className="h-8 rounded-full border border-[#D9B46F]/60 bg-[#FFFDF8] px-3 text-[11px] font-black text-[#6B451E]"
                      data-testid={`admin-ivr-report-${round.round}`}
                    >
                      דוח IVR
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="block min-w-0 flex-1 text-[11px] font-black text-[#8A7867]">
                    תזמון (שעון ישראל)
                    <input
                      type="datetime-local"
                      value={draftTimes[round.round] || ""}
                      onChange={(e) =>
                        setDraftTimes((prev) => ({
                          ...prev,
                          [round.round]: e.target.value,
                        }))
                      }
                      className="mt-1 h-9 w-full rounded-xl border border-[#E7D8C6] bg-white px-3 text-sm font-bold text-[#3A2A1C]"
                      data-testid={`admin-ivr-schedule-${round.round}`}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveSchedule(round.round)}
                    className="h-9 shrink-0 rounded-full border border-[#E7D8C6] bg-white px-4 text-[11px] font-black text-[#3A2A1C] disabled:opacity-40"
                  >
                    שמור תזמון
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reportRound && (
        <IvrCallsReportModal
          userId={userId}
          clientName={clientName}
          initialRound={reportRound}
          onClose={() => setReportRound(null)}
        />
      )}
    </div>
  );
}
