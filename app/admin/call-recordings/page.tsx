"use client";

import { useEffect, useMemo, useState } from "react";

type CallDirection = "inbound" | "outbound" | "unknown";

type CallRecording = {
  id: string;
  recordingId: string;
  recordingStatus: string;

  callStatus?: string;
  noRecordingReason?: string;

  ringDurationSeconds?: number;
  talkDurationSeconds?: number;

  /**
   * חשוב:
   * recordingUrl / recordingUrls הם בדרך כלל לינקים זמניים מטלניקס / S3.
   * לא מנגנים אותם ישירות בפרונט, כי הם פגים תוקף.
   * הפרונט תמיד מנגן דרך API קבוע אצלנו.
   */
  recordingUrl?: string;
  recordingUrls?: {
    mp3?: string;
    wav?: string;
    raw?: string;
  };

  /**
   * שדות קבועים/עתידיים לאחסון שלך: S3 / R2 / Spaces
   */
  recordingKey?: string;
  recordingStorageKey?: string;
  recordingBucket?: string;
  recordingStorage?: string;
  permanentRecordingUrl?: string;
  storedRecordingUrl?: string;
  hasPermanentFile?: boolean;

  from: string;
  to: string;
  direction: CallDirection;

  agentId?: string;
  agentName?: string;
  agentEmail?: string;

  customerName?: string;
  customerPhone?: string;

  recordedAt?: string | null;
  durationSeconds?: number;
  createdAt?: string | null;
};

type ApiResponse = {
  success: boolean;
  recordings?: CallRecording[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  error?: string;
  details?: unknown;
};

const DIRECTION_LABELS: Record<CallDirection, string> = {
  inbound: "נכנסת",
  outbound: "יוצאת",
  unknown: "לא ידוע",
};

const CALL_STATUS_LABELS: Record<string, string> = {
  initiated: "התחילה",
  ringing: "מחייג",
  answered: "נענתה",
  completed: "הסתיימה",
  missed: "שיחה שלא נענתה",
  no_answer: "לא נענתה",
  busy: "תפוס",
  failed: "נכשלה",
  voicemail: "תא קולי",
  canceled: "בוטלה",
  unknown: "לא ידוע",
};

const NO_RECORDING_REASON_LABELS: Record<string, string> = {
  not_answered: "אין הקלטה — השיחה לא נענתה",
  busy: "אין הקלטה — הקו היה תפוס",
  failed: "אין הקלטה — השיחה נכשלה",
  canceled_before_answer: "אין הקלטה — נותק לפני מענה",
  missed: "אין הקלטה — שיחה נכנסת שלא נענתה",
  route_error: "אין הקלטה — שגיאת מערכת",
  telnyx_create_call_failed: "אין הקלטה — Telnyx לא יצר שיחה",
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDuration(totalSeconds?: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function cleanText(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanPhone(value?: string | null) {
  const clean = cleanText(value);
  return clean || "-";
}

function getLegacyRecordingUrl(recording: CallRecording) {
  return (
    recording.recordingUrl ||
    recording.recordingUrls?.mp3 ||
    recording.recordingUrls?.wav ||
    recording.recordingUrls?.raw ||
    ""
  );
}

function getRecordingIdentifier(recording: CallRecording) {
  return String(recording.id || recording.recordingId || "").trim();
}

function getRecordingStreamUrl(recording: CallRecording, download = false) {
  const id = getRecordingIdentifier(recording);
  if (!id) return "";

  const query = download ? "?download=1" : "";

  /**
   * הכתובת הזאת נשארת קבועה גם עוד שנה.
   * השרת מאחוריה צריך להביא את הקובץ מהאחסון הקבוע שלך
   * או לייצר signed-url חדש בזמן אמת.
   */
  return `/api/admin/call-recordings/${encodeURIComponent(id)}/stream${query}`;
}

/**
 * חשוב:
 * לא מספיק שיש id לרשומה.
 * אם אין קובץ אמיתי, לא מציגים נגן ריק של 0:00.
 */
function hasRecordingFile(recording: CallRecording) {
  const recordingStatus = cleanText(recording.recordingStatus).toLowerCase();

  if (recordingStatus === "none") return false;

  return Boolean(
    recording.hasPermanentFile ||
      recording.recordingKey ||
      recording.recordingStorageKey ||
      recording.permanentRecordingUrl ||
      recording.storedRecordingUrl ||
      getLegacyRecordingUrl(recording) ||
      (recordingStatus === "saved" && cleanText(recording.recordingId))
  );
}

/**
 * מאת:
 * שיחה נכנסת = המספר שהתקשר.
 * שיחה יוצאת = העובד שחייג.
 */
function getFromMain(recording: CallRecording) {
  if (recording.direction === "inbound") {
    return (
      cleanText(recording.from) ||
      cleanText(recording.customerPhone) ||
      "לא ידוע"
    );
  }

  if (recording.direction === "outbound") {
    return (
      cleanText(recording.agentName) ||
      cleanText(recording.agentEmail) ||
      cleanText(recording.agentId) ||
      "לא נקלט עובד"
    );
  }

  return (
    cleanText(recording.agentName) ||
    cleanText(recording.agentEmail) ||
    cleanText(recording.from) ||
    cleanText(recording.customerPhone) ||
    "לא ידוע"
  );
}

function getFromSub(recording: CallRecording) {
  if (recording.direction === "inbound") {
    return cleanText(recording.customerName) || "מספר שהתקשר";
  }

  if (recording.direction === "outbound") {
    return cleanText(recording.agentEmail) || "מייל עובד לא נקלט";
  }

  return cleanText(recording.agentEmail) || "";
}

/**
 * אל:
 * שיחה נכנסת = המספר שלנו / מספר המערכת.
 * שיחה יוצאת = המספר שאליו העובד חייג.
 */
function getToMain(recording: CallRecording) {
  if (recording.direction === "inbound") {
    return cleanText(recording.to) || "מספר המערכת";
  }

  if (recording.direction === "outbound") {
    return (
      cleanText(recording.customerPhone) ||
      cleanText(recording.to) ||
      "לא ידוע"
    );
  }

  return (
    cleanText(recording.to) ||
    cleanText(recording.customerPhone) ||
    cleanText(recording.from) ||
    "לא ידוע"
  );
}

function getToSub(recording: CallRecording) {
  if (recording.direction === "inbound") {
    return "מספר המערכת";
  }

  if (recording.direction === "outbound") {
    return cleanText(recording.customerName) || "מספר לקוח";
  }

  return "";
}

function getCallStatusLabel(recording: CallRecording) {
  const callStatus = cleanText(recording.callStatus).toLowerCase();

  if (!callStatus) return "לא ידוע";

  return CALL_STATUS_LABELS[callStatus] || callStatus;
}

function getRecordingStatusLabel(recording: CallRecording) {
  const status = cleanText(recording.recordingStatus).toLowerCase();

  if (status === "none") return "אין הקלטה";
  if (status === "pending") return "ממתין";
  if (status === "started") return "התחילה";
  if (status === "saved") return "saved";
  if (status === "failed") return "נכשלה";
  if (status === "deleted") return "נמחקה";

  return status || "לא ידוע";
}

function getNoRecordingText(recording: CallRecording) {
  const reason = cleanText(recording.noRecordingReason).toLowerCase();

  if (reason && NO_RECORDING_REASON_LABELS[reason]) {
    return NO_RECORDING_REASON_LABELS[reason];
  }

  const callStatus = cleanText(recording.callStatus).toLowerCase();

  if (callStatus === "no_answer") {
    return "אין הקלטה — השיחה לא נענתה";
  }

  if (callStatus === "busy") {
    return "אין הקלטה — הקו היה תפוס";
  }

  if (callStatus === "missed") {
    return "אין הקלטה — שיחה נכנסת שלא נענתה";
  }

  if (callStatus === "failed") {
    return "אין הקלטה — השיחה נכשלה";
  }

  return "אין קובץ הקלטה";
}

export default function AdminCallRecordingsPage() {
  const [recordings, setRecordings] = useState<CallRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<"" | CallDirection>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const [pagination, setPagination] = useState<ApiResponse["pagination"] | null>(
    null
  );

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("limit", String(limit));

    if (search.trim()) params.set("search", search.trim());
    if (direction) params.set("direction", direction);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);

    return params.toString();
  }, [page, limit, search, direction, fromDate, toDate]);

  useEffect(() => {
    void loadRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  async function loadRecordings() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/admin/call-recordings?${queryString}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "LOAD_CALL_RECORDINGS_FAILED");
      }

      setRecordings(Array.isArray(data.recordings) ? data.recordings : []);
      setPagination(data.pagination || null);
    } catch (err) {
      console.error("LOAD CALL RECORDINGS FAILED:", err);
      setError(
        err instanceof Error
          ? err.message
          : "שגיאה בטעינת הקלטות השיחות"
      );
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setDirection("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  const total = pagination?.total || 0;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#f7f3ec] px-4 py-6 text-[#2f251d] md:px-8"
    >
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 overflow-hidden rounded-[34px] border border-[#eadfce] bg-white shadow-[0_24px_80px_rgba(47,37,29,0.08)]">
          <div className="relative p-6 md:p-8">
            <div className="absolute left-0 top-0 h-32 w-32 rounded-br-[60px] bg-[#b9945a]/10" />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-black tracking-[0.18em] text-[#b9945a]">
                  CALL LOG
                </p>

                <h1 className="mt-3 text-3xl font-black text-[#2f251d] md:text-4xl">
                  יומן שיחות והקלטות
                </h1>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#8b7b68]">
                  כאן האדמין יכול לראות שיחות נכנסות, שיחות יוצאות, ניסיונות
                  חיוג והקלטות. בשיחה נכנסת “מאת” הוא המספר שהתקשר ו“אל” הוא
                  מספר המערכת. בשיחה יוצאת “מאת” הוא העובד ו“אל” הוא הלקוח.
                </p>
              </div>

              <button
                type="button"
                onClick={loadRecordings}
                disabled={loading}
                className="h-12 rounded-2xl bg-[#2f251d] px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(47,37,29,0.22)] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "מרענן..." : "רענון"}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-5 grid gap-3 rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="חיפוש לפי עובד, מייל עובד, מספר, לקוח, מזהה שיחה..."
            className="h-12 rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#b9945a]"
          />

          <select
            value={direction}
            onChange={(event) => {
              setPage(1);
              setDirection(event.target.value as "" | CallDirection);
            }}
            className="h-12 rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#b9945a]"
          >
            <option value="">כל הכיוונים</option>
            <option value="inbound">נכנסות</option>
            <option value="outbound">יוצאות</option>
            <option value="unknown">לא ידוע</option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(event) => {
              setPage(1);
              setFromDate(event.target.value);
            }}
            className="h-12 rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#b9945a]"
          />

          <input
            type="date"
            value={toDate}
            onChange={(event) => {
              setPage(1);
              setToDate(event.target.value);
            }}
            className="h-12 rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#b9945a]"
          />

          <button
            type="button"
            onClick={resetFilters}
            className="h-12 rounded-2xl border border-[#eadfce] bg-white px-5 text-sm font-black text-[#6b5a45] transition hover:bg-[#fff8ed]"
          >
            איפוס
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="סה״כ שיחות" value={total} />
          <StatCard
            label="נכנסות בעמוד"
            value={recordings.filter((item) => item.direction === "inbound").length}
          />
          <StatCard
            label="יוצאות בעמוד"
            value={recordings.filter((item) => item.direction === "outbound").length}
          />
          <StatCard
            label="עם קובץ שמע"
            value={recordings.filter((item) => hasRecordingFile(item)).length}
          />
        </div>

        {error && (
          <div className="mb-5 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-[32px] border border-[#eadfce] bg-white shadow-[0_18px_60px_rgba(47,37,29,0.07)]">
          {loading ? (
            <div className="p-10 text-center text-sm font-black text-[#8b7b68]">
              טוען שיחות...
            </div>
          ) : recordings.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-black text-[#2f251d]">
                אין עדיין שיחות להצגה
              </p>
              <p className="mt-2 text-sm font-semibold text-[#8b7b68]">
                אחרי שיחה או ניסיון חיוג, הרשומה תופיע כאן.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-right">
                <thead>
                  <tr className="border-b border-[#eadfce] bg-[#fff8ed] text-xs font-black text-[#6b5a45]">
                    <th className="p-4">תאריך</th>
                    <th className="p-4">כיוון</th>
                    <th className="p-4">מאת</th>
                    <th className="p-4">אל</th>
                    <th className="p-4">משך</th>
                    <th className="p-4">סטטוס</th>
                    <th className="p-4">הקלטה</th>
                    <th className="p-4">פעולות</th>
                  </tr>
                </thead>

                <tbody>
                  {recordings.map((recording) => {
                    const canPlay = hasRecordingFile(recording);
                    const streamUrl = getRecordingStreamUrl(recording);
                    const downloadUrl = getRecordingStreamUrl(recording, true);

                    const fromMain = getFromMain(recording);
                    const fromSub = getFromSub(recording);

                    const toMain = getToMain(recording);
                    const toSub = getToSub(recording);

                    return (
                      <tr
                        key={recording.id}
                        className="border-b border-[#f0e5d6] text-sm last:border-b-0 hover:bg-[#fffaf3]"
                      >
                        <td className="p-4 font-bold text-[#2f251d]">
                          {formatDate(recording.recordedAt || recording.createdAt)}
                        </td>

                        <td className="p-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                              recording.direction === "inbound"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : recording.direction === "outbound"
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                            }`}
                          >
                            {DIRECTION_LABELS[recording.direction || "unknown"]}
                          </span>
                        </td>

                        <td className="p-4">
                          <p
                            dir={
                              recording.direction === "inbound" ? "ltr" : "rtl"
                            }
                            className="font-black text-[#2f251d]"
                          >
                            {fromMain}
                          </p>

                          {fromSub ? (
                            <p
                              dir={
                                recording.direction === "outbound" &&
                                fromSub.includes("@")
                                  ? "ltr"
                                  : "rtl"
                              }
                              className={`mt-1 text-xs font-bold ${
                                recording.direction === "outbound" &&
                                !cleanText(recording.agentEmail)
                                  ? "text-red-500"
                                  : "text-[#8b7b68]"
                              }`}
                            >
                              {fromSub}
                            </p>
                          ) : null}
                        </td>

                        <td className="p-4">
                          <p dir="ltr" className="font-mono font-black">
                            {cleanPhone(toMain)}
                          </p>

                          {toSub ? (
                            <p className="mt-1 text-xs font-bold text-[#8b7b68]">
                              {toSub}
                            </p>
                          ) : null}
                        </td>

                        <td className="p-4">
                          <p dir="ltr" className="font-mono font-black">
                            {formatDuration(recording.durationSeconds)}
                          </p>

                          {recording.ringDurationSeconds ||
                          recording.talkDurationSeconds ? (
                            <p className="mt-1 text-[11px] font-bold text-[#8b7b68]">
                              צלצול:{" "}
                              <span dir="ltr">
                                {formatDuration(recording.ringDurationSeconds)}
                              </span>
                              {" · "}
                              דיבור:{" "}
                              <span dir="ltr">
                                {formatDuration(recording.talkDurationSeconds)}
                              </span>
                            </p>
                          ) : null}
                        </td>

                        <td className="p-4">
                          <div className="grid gap-1">
                            <span className="w-fit rounded-full bg-[#f7f3ec] px-3 py-1 text-xs font-black text-[#6b5a45]">
                              {getCallStatusLabel(recording)}
                            </span>

                            <span className="text-[11px] font-bold text-[#8b7b68]">
                              הקלטה: {getRecordingStatusLabel(recording)}
                            </span>
                          </div>
                        </td>

                        <td className="p-4">
                          {canPlay && streamUrl ? (
                            <div className="grid gap-2">
                              <audio
                                controls
                                preload="none"
                                src={streamUrl}
                                className="h-10 w-[260px]"
                              />

                              <span className="text-[11px] font-bold text-[#8b7b68]">
                                הנגן נטען דרך השרת כדי שלא נשתמש בלינק שפג תוקף.
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-[#8b7b68]">
                              {getNoRecordingText(recording)}
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          {canPlay && downloadUrl ? (
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#b9945a] px-4 text-xs font-black text-white transition hover:bg-[#9f7a3f]"
                            >
                              הורדה / פתיחה
                            </a>
                          ) : (
                            <span className="text-xs text-[#8b7b68]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-bold text-[#8b7b68]">
            עמוד {pagination?.page || page} מתוך {pagination?.totalPages || 1} ·{" "}
            סה״כ {pagination?.total || 0} שיחות
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={!pagination?.hasPrevPage || loading}
              className="h-11 rounded-2xl border border-[#eadfce] bg-white px-5 text-sm font-black text-[#6b5a45] transition hover:bg-[#fff8ed] disabled:cursor-not-allowed disabled:opacity-45"
            >
              קודם
            </button>

            <button
              type="button"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={!pagination?.hasNextPage || loading}
              className="h-11 rounded-2xl bg-[#2f251d] px-5 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-45"
            >
              הבא
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[26px] border border-[#eadfce] bg-white p-5 shadow-sm">
      <p className="text-xs font-black text-[#8b7b68]">{label}</p>
      <p className="mt-2 text-3xl font-black text-[#2f251d]">{value}</p>
    </div>
  );
}