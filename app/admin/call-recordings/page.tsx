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

  const inboundOnPage = recordings.filter(
    (item) => item.direction === "inbound"
  ).length;
  const outboundOnPage = recordings.filter(
    (item) => item.direction === "outbound"
  ).length;
  const withAudio = recordings.filter((item) => hasRecordingFile(item)).length;

  return (
    <main dir="rtl" className="admin-content w-full min-w-0 max-w-none space-y-3 text-[var(--admin-text)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--admin-muted)]">
          {total} שיחות · בעמוד: {inboundOnPage} נכנסות · {outboundOnPage}{" "}
          יוצאות · {withAudio} עם שמע
        </p>
        <button
          type="button"
          onClick={loadRecordings}
          disabled={loading}
          className="inline-flex h-9 items-center rounded-[var(--admin-radius-sm)] bg-[var(--admin-brand)] px-3.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {loading ? "מרענן..." : "רענון"}
        </button>
      </div>

      <div className="admin-filter-bar flex w-full min-w-0 flex-col gap-2 border-b border-[var(--admin-border)] pb-3 md:flex-row md:flex-wrap md:items-center">
        <input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="חיפוש לפי עובד, מייל, מספר, לקוח, מזהה שיחה..."
          className="admin-input h-10 min-w-0 flex-1"
        />

        <select
          value={direction}
          onChange={(event) => {
            setPage(1);
            setDirection(event.target.value as "" | CallDirection);
          }}
          className="admin-select h-10 w-full md:w-[160px]"
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
          className="admin-input h-10 w-full md:w-[160px]"
        />

        <input
          type="date"
          value={toDate}
          onChange={(event) => {
            setPage(1);
            setToDate(event.target.value);
          }}
          className="admin-input h-10 w-full md:w-[160px]"
        />

        <button
          type="button"
          onClick={resetFilters}
          className="h-10 rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-white px-4 text-xs font-bold"
        >
          איפוס
        </button>
      </div>

      {error ? (
        <div className="rounded-[var(--admin-radius)] border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="admin-table-region w-full min-w-0">
        {loading ? (
          <div className="px-4 py-12 text-center text-sm font-semibold text-[var(--admin-muted)]">
            טוען שיחות…
          </div>
        ) : recordings.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm font-semibold text-[var(--admin-muted)]">
            אין עדיין שיחות להצגה
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>כיוון</th>
                  <th>מאת</th>
                  <th>אל</th>
                  <th>משך</th>
                  <th>סטטוס</th>
                  <th>הקלטה</th>
                  <th>פעולות</th>
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

                  return (
                    <tr key={recording.id}>
                      <td>
                        {formatDate(
                          recording.recordedAt || recording.createdAt
                        )}
                      </td>
                      <td>
                        <span
                          className={`admin-row-badge ${
                            recording.direction === "inbound"
                              ? "bg-emerald-50 text-emerald-700"
                              : recording.direction === "outbound"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {DIRECTION_LABELS[recording.direction || "unknown"]}
                        </span>
                      </td>
                      <td>
                        <span
                          className="cell-clip font-bold"
                          title={[fromMain, fromSub].filter(Boolean).join(" · ")}
                          dir={
                            recording.direction === "inbound" ? "ltr" : "rtl"
                          }
                        >
                          {fromMain}
                        </span>
                      </td>
                      <td>
                        <span className="cell-clip" dir="ltr" title={toMain}>
                          {cleanPhone(toMain)}
                        </span>
                      </td>
                      <td dir="ltr">
                        {formatDuration(recording.durationSeconds)}
                      </td>
                      <td>
                        <span
                          className="admin-row-badge bg-gray-100 text-gray-700"
                          title={`הקלטה: ${getRecordingStatusLabel(recording)}`}
                        >
                          {getCallStatusLabel(recording)}
                        </span>
                      </td>
                      <td>
                        {canPlay && streamUrl ? (
                          <audio
                            controls
                            preload="none"
                            src={streamUrl}
                            className="h-9 w-full max-w-full"
                          />
                        ) : (
                          <span className="text-xs text-[var(--admin-subtle)]">
                            {getNoRecordingText(recording)}
                          </span>
                        )}
                      </td>
                      <td className="admin-actions-cell">
                        {canPlay && downloadUrl ? (
                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="inline-flex h-8 items-center rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-white px-2.5 text-xs font-bold hover:bg-gray-50"
                          >
                            הורדה
                          </a>
                        ) : (
                          <span className="text-xs text-[var(--admin-subtle)]">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-table-footer">
          <span>
            עמוד {pagination?.page || page} מתוך{" "}
            {pagination?.totalPages || 1} · סה״כ {pagination?.total || 0}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={!pagination?.hasPrevPage || loading}
              className="inline-flex h-8 items-center rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-white px-3 text-xs font-bold disabled:opacity-45"
            >
              קודם
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={!pagination?.hasNextPage || loading}
              className="inline-flex h-8 items-center rounded-[var(--admin-radius-sm)] bg-[var(--admin-brand)] px-3 text-xs font-bold text-white disabled:opacity-45"
            >
              הבא
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}