"use client";

import { useCallback, useEffect, useState } from "react";
import IvrCallsReportModal from "@/app/components/IvrCallsReportModal";
import { formatCallRoundDateTimeInput } from "@/lib/calls/callRoundScheduleTime";

type Eligibility = {
  totalGuests: number;
  withPhone: number;
  noPhone: number;
  finalYes: number;
  finalNo: number;
  finalAnswered: number;
  pending: number;
  maybe: number;
  eligible: number;
  filterReasons: string[];
};

type IvrRoundRow = {
  round: number;
  title: string;
  status: string;
  statusLabel: string;
  statusMismatch?: string;
  failureReason?: string;
  scheduledAt: string | null;
  scheduledAtInput: string;
  scheduledAtDisplay: string;
  eligibleCount: number;
  dialedCount: number;
  remainingCount: number;
  finalAnsweredCount?: number;
  eligibility?: Eligibility;
  liveCount?: number;
  canOpen: boolean;
  canReopen?: boolean;
  showReopen?: boolean;
  canRepairStatus?: boolean;
  canStop: boolean;
  canResume: boolean;
  blockReasons: string[];
  nextSteps?: string[];
};

type AudioDiagnostics = {
  audioReady?: boolean;
  audioBlockReason?: string;
  audioMode?: string;
  composeVersion?: string;
  requiredComposeVersion?: string;
  eventNameStatus?: string;
  eventNameApproved?: boolean;
  composedStatus?: string;
  composedApproved?: boolean;
  recordingApprovalApproved?: boolean;
  hasComposedToken?: boolean;
  hasEventNameToken?: boolean;
};

type Props = {
  userId: string;
  clientName: string;
  invitationId?: string;
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
  invitationId,
  onScheduleChanged,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [rounds, setRounds] = useState<IvrRoundRow[]>([]);
  const [audioReady, setAudioReady] = useState(true);
  const [audioBlockReason, setAudioBlockReason] = useState("");
  const [audioDiagnostics, setAudioDiagnostics] =
    useState<AudioDiagnostics | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState("");
  const [canApproveAudio, setCanApproveAudio] = useState(false);
  const [heardPreview, setHeardPreview] = useState(false);
  const [liveDialDisabled, setLiveDialDisabled] = useState(false);
  const [eventActive, setEventActive] = useState(true);
  const [eventBlockReason, setEventBlockReason] = useState("");
  const [narrationPath, setNarrationPath] = useState("/admin/recorded-calls");
  const [clientHint, setClientHint] = useState("");
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
    setAudioDiagnostics(data.audioDiagnostics || null);
    setPreviewAudioUrl(String(data.previewAudioUrl || ""));
    setCanApproveAudio(Boolean(data.canApproveAudio));
    setLiveDialDisabled(Boolean(data.liveDialDisabled));
    setEventActive(data.eventActive !== false);
    setEventBlockReason(String(data.eventBlockReason || ""));
    if (data.narrationSettingsPath) {
      setNarrationPath(String(data.narrationSettingsPath));
    }
    if (data.clientRecordedCallsHint) {
      setClientHint(String(data.clientRecordedCallsHint));
    }
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
    setMessage("");
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
      return true;
    } catch (err) {
      console.error(err);
      setError("הפעולה נכשלה");
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  async function approveAudio() {
    if (!heardPreview) {
      alert("יש להאזין לתצוגה המקדימה לפני אישור הקריינות");
      return;
    }
    setBusyKey("approve-audio");
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/ivr/config", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_audio",
          userId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(
          data?.message ||
            data?.error ||
            "אישור הקריינות נכשל — ייתכן שהקובץ אינו נגיש"
        );
        return;
      }
      setMessage("הקריינות אושרה. ניתן לפתוח/לפתוח מחדש סבב אם שאר התנאים מתקיימים.");
      await load();
      onScheduleChanged?.();
    } catch (err) {
      console.error(err);
      setError("אישור הקריינות נכשל");
    } finally {
      setBusyKey(null);
    }
  }

  async function openRound(round: IvrRoundRow, reopen: boolean) {
    setBusyKey(`preview-${round.round}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}/ivr-rounds`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          round: round.round,
          reopen,
          invitationId: invitationId || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.message || data?.error || "בדיקת הסבב נכשלה");
        return;
      }
      if (!data.canProceed) {
        const reasons = Array.isArray(data.blockReasons)
          ? data.blockReasons.join("\n• ")
          : "לא ניתן לפתוח את הסבב";
        const steps = Array.isArray(data.nextSteps)
          ? `\n\nמה נדרש:\n• ${data.nextSteps.join("\n• ")}`
          : "";
        const msg = `לא ניתן ${reopen ? "לפתוח מחדש" : "לפתוח"} את סבב ${round.round}:\n• ${reasons}${steps}`;
        setError(msg);
        alert(msg);
        return;
      }

      const eligible = Number(data.eligibleCount || 0);
      const finalAnswered = Number(data.finalAnsweredCount || 0);
      const dialed = Number(data.dialedCount || 0);
      const filter = Array.isArray(data.eligibility?.filterReasons)
        ? data.eligibility.filterReasons.join(" · ")
        : "";
      const confirmed = confirm(
        [
          reopen
            ? `לפתוח מחדש את סבב ${round.round}?`
            : `לפתוח עכשיו את סבב ${round.round}?`,
          "",
          `זכאים לחיוג כעת: ${eligible}`,
          `כבר נתנו תשובה סופית (לא יחייגו): ${finalAnswered}`,
          `ניסיונות חיוג קיימים בסבב: ${dialed}`,
          filter ? `סינון: ${filter}` : "",
          "",
          "מה יתבצע:",
          "• ייפתח אותו מנגנון חיוג של המערכת (executeIvrRound)",
          "• יחייגו רק אורחים שעדיין זכאים בסבב זה",
          "• לא יימחקו ניסיונות קודמים ולא יאופס RSVP",
          "• לא תתבצע פתיחה כפולה אם יש שיחות פעילות",
          "",
          "הפתיחה לא עוקפת בדיקות תקינות שמע.",
        ]
          .filter(Boolean)
          .join("\n")
      );
      if (!confirmed) return;
    } finally {
      setBusyKey(null);
    }

    const ok = await postAction(
      { action: "open", round: round.round, reopen },
      `${reopen ? "reopen" : "open"}-${round.round}`
    );
    if (ok) {
      alert(reopen ? `סבב ${round.round} נפתח מחדש` : `סבב ${round.round} נפתח`);
      onScheduleChanged?.();
    }
  }

  async function saveSchedule(roundNumber: number) {
    const value = draftTimes[roundNumber] || "";
    const roundsPayload = [1, 2, 3].map((n) => ({
      roundNumber: n,
      scheduledAt: n === roundNumber ? value : draftTimes[n] || "",
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
            פתיחה / פתיחה מחדש, תזמון וסטטוס — מסונכרן עם חשבון הלקוח. ללא עקיפת
            חסימות בטיחות.
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

      {(!eventActive || !audioReady || liveDialDisabled || canApproveAudio) && (
        <div className="mb-3 space-y-2 rounded-xl border border-[#F0D7B0] bg-[#FFF8E6] px-3 py-2 text-xs font-bold text-[#9A651B]">
          {!eventActive && (
            <div>
              {eventBlockReason || "האירוע אינו פעיל — לא ניתן לפתוח סבב."}
            </div>
          )}
          {!audioReady && (
            <div>
              <div>
                {audioBlockReason || "אין קריינות מאושרת ונגישה — החיוג חסום."}
              </div>
              {clientHint ? (
                <div className="mt-1 text-[#7B6754]">{clientHint}</div>
              ) : null}
              {previewAudioUrl ? (
                <div className="mt-2 space-y-2">
                  <audio
                    controls
                    src={previewAudioUrl}
                    className="w-full"
                    data-testid="admin-ivr-preview-audio"
                    onPlay={() => setHeardPreview(true)}
                    onEnded={() => setHeardPreview(true)}
                  />
                  {canApproveAudio ? (
                    <button
                      type="button"
                      disabled={Boolean(busyKey) || !heardPreview}
                      onClick={() => void approveAudio()}
                      className="h-8 rounded-full bg-[#2F3742] px-3 text-[11px] font-black text-white disabled:opacity-40"
                      data-testid="admin-ivr-approve-audio"
                    >
                      אשר קריינות לאחר האזנה
                    </button>
                  ) : null}
                  {!heardPreview && canApproveAudio ? (
                    <div className="text-[10px] text-[#7B6754]">
                      יש להפעיל את התצוגה המקדימה לפני האישור.
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={narrationPath}
                  className="inline-flex h-8 items-center rounded-full border border-[#D9B46F]/60 bg-white px-3 text-[11px] font-black text-[#6B451E]"
                  data-testid="admin-ivr-narration-link"
                >
                  הגדרות קריינות גלובליות
                </a>
              </div>
              {audioDiagnostics ? (
                <div className="mt-2 grid gap-0.5 text-[10px] font-bold text-[#7B6754]">
                  <span>
                    מצב: {audioDiagnostics.audioMode || "ai"} · compose{" "}
                    {audioDiagnostics.composeVersion || "חסר"} / נדרש{" "}
                    {audioDiagnostics.requiredComposeVersion}
                  </span>
                  <span>
                    שם אירוע: {audioDiagnostics.eventNameStatus || "חסר"}
                    {audioDiagnostics.eventNameApproved
                      ? " · מאושר"
                      : " · לא מאושר"}
                    {audioDiagnostics.hasEventNameToken ? "" : " · בלי טוקן"}
                  </span>
                  <span>
                    קובץ מחובר: {audioDiagnostics.composedStatus || "חסר"}
                    {audioDiagnostics.composedApproved
                      ? " · מאושר"
                      : " · לא מאושר"}
                    {audioDiagnostics.hasComposedToken ? "" : " · בלי טוקן"}
                  </span>
                  <span>
                    recordingApproval:{" "}
                    {audioDiagnostics.recordingApprovalApproved
                      ? "מאושר"
                      : "לא מאושר"}
                  </span>
                </div>
              ) : null}
            </div>
          )}
          {liveDialDisabled && (
            <div>חיוגי IVR מושבתים זמנית במערכת.</div>
          )}
        </div>
      )}

      {message && (
        <div className="mb-3 rounded-xl border border-[#CDEAD7] bg-[#F3FBF6] px-3 py-2 text-xs font-bold text-[#1F9A55]">
          {message}
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
        <div className="space-y-2">
          {rounds.map((round) => {
            const busy =
              busyKey === `open-${round.round}` ||
              busyKey === `reopen-${round.round}` ||
              busyKey === `preview-${round.round}` ||
              busyKey === `stop-${round.round}` ||
              busyKey === `resume-${round.round}` ||
              busyKey === `repair-${round.round}` ||
              busyKey === `schedule-${round.round}` ||
              busyKey === "approve-audio";

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
                      <span>זכאים: {round.eligibleCount}</span>
                      <span>בוצעו: {round.dialedCount}</span>
                      <span>נותרו: {round.remainingCount}</span>
                      <span>
                        תשובה סופית: {round.finalAnsweredCount ?? 0}
                      </span>
                      {(round.liveCount || 0) > 0 ? (
                        <span className="text-[#2F5EA8]">
                          פעילות: {round.liveCount}
                        </span>
                      ) : null}
                    </div>
                    {round.eligibility?.filterReasons?.length ? (
                      <div className="mt-1 text-[11px] font-bold text-[#8A7867]">
                        סינון: {round.eligibility.filterReasons.join(" · ")}
                        {` · ממתינים ${round.eligibility.pending}`}
                        {round.eligibility.maybe
                          ? ` · מתלבטים ${round.eligibility.maybe}`
                          : ""}
                      </div>
                    ) : null}
                    {round.statusMismatch ? (
                      <div className="mt-1 text-[11px] font-bold text-[#9A651B]">
                        {round.statusMismatch}
                      </div>
                    ) : null}
                    {round.failureReason ? (
                      <div className="mt-1 text-[11px] font-bold text-red-600">
                        {round.failureReason}
                      </div>
                    ) : null}
                    {round.blockReasons?.length ? (
                      <div className="mt-1 text-[11px] font-bold text-[#8A7867]">
                        חסימה: {round.blockReasons[0]}
                        {round.blockReasons.length > 1
                          ? ` (+${round.blockReasons.length - 1})`
                          : ""}
                      </div>
                    ) : null}
                    {round.nextSteps?.length ? (
                      <div className="mt-1 text-[11px] font-bold text-[#6B451E]">
                        כדי לפתוח: {round.nextSteps[0]}
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
                      onClick={() => void openRound(round, false)}
                      className="h-8 rounded-full bg-[#2F3742] px-3 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                      data-testid={`admin-ivr-open-${round.round}`}
                    >
                      פתח סבב עכשיו
                    </button>

                    {round.showReopen ? (
                      <button
                        type="button"
                        disabled={busy || !round.canReopen}
                        title={
                          round.canReopen
                            ? "פתח מחדש סבב שהושלם — רק לזכאים שנותרו"
                            : (round.blockReasons || []).join(" · ") ||
                              "ממתין לתנאי בטיחות"
                        }
                        onClick={() => void openRound(round, true)}
                        className="h-8 rounded-full bg-[#B97821] px-3 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                        data-testid={`admin-ivr-reopen-${round.round}`}
                      >
                        פתח מחדש סבב
                      </button>
                    ) : null}

                    {round.canRepairStatus ? (
                      <button
                        type="button"
                        disabled={busy}
                        title="מאפס רק את סטטוס ההושלם השגוי — בלי חיוג"
                        onClick={() => {
                          if (
                            !confirm(
                              `לתקן את סטטוס סבב ${round.round} מ״הושלם״ חזרה למתוזמן/טיוטה?\nלא יבוצע חיוג ולא יימחקו ניסיונות.`
                            )
                          ) {
                            return;
                          }
                          void postAction(
                            { action: "repair_status", round: round.round },
                            `repair-${round.round}`
                          ).then((ok) => ok && onScheduleChanged?.());
                        }}
                        className="h-8 rounded-full border border-[#E7D8C6] bg-white px-3 text-[11px] font-black text-[#3A2A1C] disabled:opacity-40"
                        data-testid={`admin-ivr-repair-${round.round}`}
                      >
                        תקן סטטוס
                      </button>
                    ) : null}

                    {round.canStop && round.status !== "done" ? (
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

                    {round.canResume && !round.showReopen ? (
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
