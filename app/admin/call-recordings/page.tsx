"use client";

import { useEffect, useMemo, useState } from "react";

type CallDirection = "inbound" | "outbound" | "unknown";

type CallRecording = {
  id: string;
  recordingId: string;
  recordingStatus: string;

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

  /** שדות קבועים/עתידיים לאחסון שלך: S3 / R2 / Spaces */
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

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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

function hasRecordingFile(recording: CallRecording) {
  return Boolean(
    recording.hasPermanentFile ||
      recording.recordingKey ||
      recording.recordingStorageKey ||
      recording.permanentRecordingUrl ||
      recording.storedRecordingUrl ||
      getLegacyRecordingUrl(recording) ||
      getRecordingIdentifier(recording)
  );
}

function cleanPhone(value?: string) {
  return value || "-";
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
                  CALL RECORDINGS
                </p>

                <h1 className="mt-3 text-3xl font-black text-[#2f251d] md:text-4xl">
                  הקלטות שיחות
                </h1>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#8b7b68]">
                  כאן האדמין יכול לראות, לנגן ולהוריד הקלטות שיחות.
                  הניגון מתבצע דרך API קבוע אצלנו כדי שלינקים זמניים מטלניקס לא יישברו.
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
            placeholder="חיפוש לפי מספר, נציג, לקוח, מזהה שיחה..."
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
          <StatCard label="סה״כ הקלטות" value={total} />
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
              טוען הקלטות...
            </div>
          ) : recordings.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-black text-[#2f251d]">
                אין עדיין הקלטות להצגה
              </p>
              <p className="mt-2 text-sm font-semibold text-[#8b7b68]">
                אחרי שיחה מוקלטת, Telnyx ישלח webhook וההקלטה תופיע כאן.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-right">
                <thead>
                  <tr className="border-b border-[#eadfce] bg-[#fff8ed] text-xs font-black text-[#6b5a45]">
                    <th className="p-4">תאריך</th>
                    <th className="p-4">כיוון</th>
                    <th className="p-4">מאת</th>
                    <th className="p-4">אל</th>
                    <th className="p-4">נציג</th>
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

                        <td dir="ltr" className="p-4 font-mono font-black">
                          {cleanPhone(recording.from)}
                        </td>

                        <td dir="ltr" className="p-4 font-mono font-black">
                          {cleanPhone(recording.to)}
                        </td>

                        <td className="p-4">
                          <p className="font-black text-[#2f251d]">
                            {recording.agentName || "-"}
                          </p>
                          {recording.agentEmail && (
                            <p className="mt-1 text-xs text-[#8b7b68]">
                              {recording.agentEmail}
                            </p>
                          )}
                        </td>

                        <td dir="ltr" className="p-4 font-mono font-black">
                          {formatDuration(recording.durationSeconds)}
                        </td>

                        <td className="p-4">
                          <span className="rounded-full bg-[#f7f3ec] px-3 py-1 text-xs font-black text-[#6b5a45]">
                            {recording.recordingStatus || "saved"}
                          </span>
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
                              אין קובץ הקלטה
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
            סה״כ {pagination?.total || 0} הקלטות
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