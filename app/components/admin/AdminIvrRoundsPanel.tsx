"use client";

import { useCallback, useEffect, useState } from "react";
import IvrCallsReportModal from "@/app/components/IvrCallsReportModal";
import { formatCallRoundDateTimeInput } from "@/lib/calls/callRoundScheduleTime";

type IvrRoundRow = {
  round: number;
  title: string;
  status: string;
  statusLabel: string;
  blocked?: boolean;
  failureReason?: string;
  scheduledAt: string | null;
  scheduledAtInput: string;
  scheduledAtDisplay: string;
  eligibleCount: number;
  dialedCount: number;
  remainingCount: number;
  finalAnsweredCount?: number;
  liveCount?: number;
  canReset?: boolean;
  canBlock?: boolean;
  canUnblock?: boolean;
  dialGateNotes?: string[];
};

type Props = {
  userId: string;
  clientName: string;
  invitationId?: string;
  onScheduleChanged?: () => void;
};

function statusBadgeClass(round: IvrRoundRow) {
  if (round.blocked) return "bg-red-50 text-red-600";
  if (round.status === "done") return "bg-[#EAF8EF] text-[#1F9A55]";
  if (round.status === "failed") return "bg-red-50 text-red-600";
  if (round.status === "in_progress") return "bg-[#EEF4FF] text-[#2F5EA8]";
  if (round.status === "cancelled") return "bg-[#F6F1EA] text-[#7B6754]";
  if (round.status === "scheduled") return "bg-blue-50 text-blue-600";
  return "bg-[#F6F1EA] text-[#7B6754]";
}

export default function AdminIvrRoundsPanel({
  userId,
  clientName,
  invitationId,
  onScheduleChanged,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [rounds, setRounds] = useState<IvrRoundRow[]>([]);
  const [audioReady, setAudioReady] = useState(true);
  const [audioBlockReason, setAudioBlockReason] = useState("");
  const [reportRound, setReportRound] = useState<string | null>(null);
  const [draftTimes, setDraftTimes] = useState<Record<number, string>>({});

  const qs = invitationId
    ? `?invitationId=${encodeURIComponent(invitationId)}`
    : "";

  const applyPayload = useCallback((data: any) => {
    const nextRounds: IvrRoundRow[] = Array.isArray(data.rounds)
      ? data.rounds
      : [];
    setRounds(nextRounds);
    setAudioReady(Boolean(data.audioReady));
    setAudioBlockReason(String(data.audioBlockReason || ""));
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
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/ivr-rounds${qs}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.message || data?.error || "טעינת סבבי IVR נכשלה");
        setRounds([]);
        return;
      }
      applyPayload(data);
    } catch (err) {
      console.error(err);
      setError("טעינת סבבי IVR נכשלה");
    } finally {
      setLoading(false);
    }
  }, [userId, qs, applyPayload]);

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
        body: JSON.stringify({
          ...body,
          invitationId: invitationId || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.message || data?.error || "הפעולה נכשלה");
        return false;
      }
      if (Array.isArray(data.rounds)) {
        applyPayload(data);
      } else {
        await load();
      }
      onScheduleChanged?.();
      return true;
    } catch (err) {
      console.error(err);
      setError("הפעולה נכשלה");
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  async function updateRound(
    action: "reset" | "block" | "unblock",
    round: IvrRoundRow
  ) {
    const confirmText =
      action === "reset"
        ? `לפתוח מחדש את סבב ${round.round}?\n\nניתן יהיה לתזמן מחדש.\nלא יבוצע חיוג מיידי.\nלא יימחקו שיחות קודמות או אישורי הגעה.`
        : action === "block"
          ? `לחסום את סבב ${round.round}?`
          : `לבטל חסימה לסבב ${round.round}?`;

    if (!confirm(confirmText)) return;

    await postAction({ action, round: round.round }, `${action}-${round.round}`);
  }

  async function saveSchedule(roundNumber: number) {
    const value = draftTimes[roundNumber] || "";
    const roundsPayload = [1, 2, 3].map((n) => ({
      roundNumber: n,
      scheduledAt: n === roundNumber ? value : draftTimes[n] || "",
    }));
    await postAction(
      { action: "schedule", rounds: roundsPayload },
      `schedule-${roundNumber}`
    );
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
            פתיחה מחדש וחסימה כמו בסבבי WhatsApp/SMS. פתיחה מחדש מאפשרת תזמון
            מחדש בלי חיוג מיידי. בדיקת קריינות וזכאים מתבצעת רק לפני חיוג בפועל.
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

      {!audioReady && (
        <div className="mb-3 rounded-xl border border-[#F0D7B0] bg-[#FFF8E6] px-3 py-2 text-xs font-bold text-[#9A651B]">
          {audioBlockReason || "הקריינות עדיין לא מאושרת."} פתיחה מחדש ותזמון
          אפשריים גם כך — החיוג עצמו ייחסם עד לאישור קריינות תקינה.
        </div>
      )}

      {error && (
        <div className="mb-3 whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-6 text-center text-sm font-bold text-[#8A7867]">
          טוען סבבי IVR...
        </div>
      ) : (
        <div className="space-y-3">
          {rounds.map((round) => {
            const isLoading =
              busyKey === `reset-${round.round}` ||
              busyKey === `block-${round.round}` ||
              busyKey === `unblock-${round.round}` ||
              busyKey === `schedule-${round.round}`;

            return (
              <div
                key={round.round}
                className="
                  flex flex-col gap-3
                  rounded-2xl
                  border border-[#EFE2D1]
                  bg-white
                  px-4 py-3
                  md:flex-row
                  md:items-center
                  md:justify-between
                "
                data-testid={`admin-ivr-round-${round.round}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-black text-[#3A2A1C]">{round.title}</div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    <span
                      className={`rounded-full px-3 py-1 ${statusBadgeClass(round)}`}
                    >
                      {round.statusLabel}
                    </span>

                    {round.blocked && (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-red-600">
                        חסום
                      </span>
                    )}

                    {round.scheduledAtDisplay && round.status !== "done" ? (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-600">
                        מתוזמן · {round.scheduledAtDisplay}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-[#6B5A48]">
                    <span>זכאים: {round.eligibleCount}</span>
                    <span>בוצעו: {round.dialedCount}</span>
                    <span>נותרו: {round.remainingCount}</span>
                    <span>תשובה סופית: {round.finalAnsweredCount ?? 0}</span>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="block min-w-0 flex-1 text-[11px] font-black text-[#8A7867]">
                      תזמון מחדש (שעון ישראל)
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
                      disabled={isLoading}
                      onClick={() => void saveSchedule(round.round)}
                      className="h-9 shrink-0 rounded-full border border-[#E7D8C6] bg-white px-4 text-[11px] font-black text-[#3A2A1C] disabled:opacity-40"
                    >
                      שמור תזמון
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportRound(String(round.round))}
                      className="h-9 shrink-0 rounded-full border border-[#D9B46F]/60 bg-[#FFFDF8] px-4 text-[11px] font-black text-[#6B451E]"
                      data-testid={`admin-ivr-report-${round.round}`}
                    >
                      דוח IVR
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 md:w-[240px]">
                  <button
                    type="button"
                    disabled={isLoading || round.canReset === false}
                    onClick={() => void updateRound("reset", round)}
                    className="
                      h-9 rounded-full
                      bg-[#B97821]
                      px-4
                      text-xs font-black
                      text-white
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                    data-testid={`admin-ivr-reopen-${round.round}`}
                  >
                    פתיחה מחדש
                  </button>

                  {round.blocked || round.canUnblock ? (
                    <button
                      type="button"
                      disabled={isLoading || round.canUnblock === false}
                      onClick={() => void updateRound("unblock", round)}
                      className="
                        h-9 rounded-full
                        bg-[#2F3742]
                        px-4
                        text-xs font-black
                        text-white
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                      data-testid={`admin-ivr-unblock-${round.round}`}
                    >
                      בטל חסימה
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isLoading || round.canBlock === false}
                      onClick={() => void updateRound("block", round)}
                      className="
                        h-9 rounded-full
                        bg-red-600
                        px-4
                        text-xs font-black
                        text-white
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                      data-testid={`admin-ivr-block-${round.round}`}
                    >
                      חסימה
                    </button>
                  )}
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
