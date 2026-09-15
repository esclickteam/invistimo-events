"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

type ReportStatus =
  | "not_sent"
  | "scheduled"
  | "pending"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

type ReportMessage = {
  id: string;
  roundKey: string;
  roundTitle: string;
  roundType: string;
  messageTypeLabel: string;
  roundNumber: number;
  status: ReportStatus;
  statusLabel: string;
  providerStatus?: string;
  providerMessageId?: string;
  sentAt?: string | null;
  failedAt?: string | null;
  scheduledAt?: string | null;
  createdAt?: string | null;
  attemptedAt?: string | null;
  errorMessage?: string;
  rsvp?: string;
  rsvpLabel?: string;
  attempts?: number;
  admin?: any;
};

type RoundStatusChip = {
  roundKey: string;
  title: string;
  status: ReportStatus;
  statusLabel: string;
  hasMessage: boolean;
  notSentReason?: string | null;
};

type ReportGuest = {
  id: string;
  guestId?: string | null;
  identityKey: string;
  name: string;
  phone: string;
  rsvp: "yes" | "no" | "pending";
  rsvpLabel: string;
  messagesCount: number;
  receivedCount: number;
  failedCount: number;
  pendingCount: number;
  scheduledCount?: number;
  overallStatus: ReportStatus;
  overallStatusLabel: string;
  lastStatus: ReportStatus;
  lastStatusLabel: string;
  lastMessageAt?: string | null;
  lastRoundTitle?: string | null;
  everSent?: boolean;
  everFailed: boolean;
  notSentReason?: string | null;
  lastError?: string;
  roundStatuses: RoundStatusChip[];
  roundsSentCount: number;
  roundsTotal: number;
  messages?: ReportMessage[];
};

type ReportRound = {
  key: string;
  title: string;
  type?: string;
  typeLabel?: string;
  round?: number;
  total: number;
  intended?: number;
  sent: number;
  failed: number;
  pending: number;
  scheduled?: number;
  notSent?: number;
  cancelled?: number;
  summary?: {
    total?: number;
    intended?: number;
    sent: number;
    failed: number;
    pending: number;
    scheduled?: number;
    notSent?: number;
  };
};

type GuestSummary = {
  totalGuests: number;
  receivedAtLeastOne: number;
  receivedNone: number;
  sentAtLeastOnce: number;
  failedAtLeastOnce: number;
  receivedMultiple: number;
  pending: number;
  scheduled: number;
  totalSmsAttempts?: number;
};

type ReportPayload = {
  success: boolean;
  isAdmin?: boolean;
  invitation?: { _id: string; title?: string; eventDate?: string | null };
  summary?: GuestSummary;
  rounds?: ReportRound[];
  guests?: ReportGuest[];
  lastUpdated?: string;
  message?: string;
  error?: string;
  capabilities?: {
    deliveryReceipts?: boolean;
    readReceipts?: boolean;
    statusPolling?: boolean;
  };
};

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeText(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function getStatusClass(status?: string) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "failed" || normalized === "נכשל") {
    return "border-red-200 bg-red-50 text-red-600";
  }
  if (normalized === "sent" || normalized === "נשלח") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (
    normalized === "scheduled" ||
    normalized === "מתוזמן"
  ) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  if (
    normalized === "pending" ||
    normalized === "sending" ||
    normalized === "ממתין"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "בוטל"
  ) {
    return "border-gray-200 bg-gray-50 text-gray-600";
  }
  if (normalized === "not_sent" || normalized === "לא נשלח") {
    return "border-[#E8DCCB] bg-[#F7F1E8] text-[#7A6A58]";
  }

  return "border-[#EFE2D1] bg-[#F6F1EA] text-[#7B6754]";
}

function StatusBadge({
  status,
  label,
  title,
}: {
  status?: string;
  label?: string;
  title?: string;
}) {
  return (
    <span
      title={title || label || status || ""}
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(status)}`}
    >
      {label || status || "לא נשלח"}
    </span>
  );
}

function StatBox({
  label,
  value,
  danger = false,
  active = false,
  onClick,
  title,
}: {
  label: string;
  value: number;
  danger?: boolean;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const Comp: any = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      className={`rounded-[22px] border p-4 text-right transition ${
        danger
          ? "border-red-200 bg-red-50"
          : active
            ? "border-[#D7A34D] bg-white shadow-sm"
            : "border-[#EFE2D1] bg-[#FFFDF8]"
      } ${onClick ? "cursor-pointer hover:bg-white" : ""}`}
    >
      <div
        className={`text-xs font-black ${
          danger ? "text-red-500" : "text-[#7B6754]"
        }`}
      >
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-black ${
          danger ? "text-red-600" : "text-[#24190F]"
        }`}
      >
        {Number(value || 0).toLocaleString("he-IL")}
      </div>
    </Comp>
  );
}

function SkeletonBlock() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 min-w-[220px] rounded-[22px] bg-[#F3EADF]"
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-20 rounded-[22px] bg-[#F3EADF]" />
        ))}
      </div>
      <div className="h-64 rounded-[22px] bg-[#F3EADF]" />
    </div>
  );
}

function RoundChip({ chip }: { chip: RoundStatusChip }) {
  const short =
    chip.title.replace("סבב ", "ס").split(" - ")[0] || chip.title;
  const mark =
    chip.status === "sent"
      ? "✓"
      : chip.status === "failed"
        ? "!"
        : chip.status === "pending" ||
            chip.status === "scheduled" ||
            chip.status === "sending"
          ? "…"
          : "—";

  return (
    <span
      title={`${chip.title}: ${chip.statusLabel}${
        chip.notSentReason ? ` · ${chip.notSentReason}` : ""
      }`}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black ${getStatusClass(chip.status)}`}
    >
      {short} {mark}
    </span>
  );
}

const PAGE_SIZE = 50;

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "הכל" },
  { value: "not_sent", label: "לא נשלח" },
  { value: "scheduled", label: "מתוזמן" },
  { value: "pending", label: "ממתין" },
  { value: "sent", label: "נשלח" },
  { value: "failed", label: "נכשל" },
  { value: "cancelled", label: "בוטל" },
];

const RSVP_FILTERS = [
  { value: "all", label: "הכל" },
  { value: "yes", label: "אישר" },
  { value: "no", label: "סירב" },
  { value: "pending", label: "לא ענה" },
];

const MESSAGE_COUNT_FILTERS = [
  { value: "all", label: "הכל" },
  { value: "0", label: "0 הודעות" },
  { value: "1", label: "הודעה אחת" },
  { value: "1+", label: "הודעה אחת לפחות" },
  { value: "2+", label: "2+ הודעות" },
];

export default function SmsRoundsReportModal({
  invitationId,
  clientName,
  onClose,
}: {
  invitationId: string;
  clientName?: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [invitationTitle, setInvitationTitle] = useState("");
  const [summary, setSummary] = useState<GuestSummary | null>(null);
  const [rounds, setRounds] = useState<ReportRound[]>([]);
  const [guests, setGuests] = useState<ReportGuest[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [selectedRoundKey, setSelectedRoundKey] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rsvpFilter, setRsvpFilter] = useState("all");
  const [messageCountFilter, setMessageCountFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadReport = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const res = await fetch(
          `/api/sms4free/round-report/${encodeURIComponent(invitationId)}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data: ReportPayload = await res.json().catch(() => ({
          success: false,
          message: "תשובת שרת לא תקינה",
        }));

        if (!res.ok || data?.success === false) {
          throw new Error(
            data?.message || data?.error || `טעינת דוח נכשלה (${res.status})`
          );
        }

        setIsAdmin(Boolean(data.isAdmin));
        setInvitationTitle(data.invitation?.title || "");
        setSummary(data.summary || null);
        setRounds(Array.isArray(data.rounds) ? data.rounds : []);
        setGuests(Array.isArray(data.guests) ? data.guests : []);
        setLastUpdated(data.lastUpdated || new Date().toISOString());
      } catch (err) {
        setError(err instanceof Error ? err.message : "טעינת הדוח נכשלה");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [invitationId]
  );

  useEffect(() => {
    if (!invitationId) return;
    loadReport("initial");
  }, [invitationId, loadReport]);

  useEffect(() => {
    setPage(1);
  }, [
    selectedRoundKey,
    statusFilter,
    rsvpFilter,
    messageCountFilter,
    search,
  ]);

  const filteredGuests = useMemo(() => {
    const q = normalizeText(search);
    const qDigits = onlyDigits(search);

    return guests.filter((guest) => {
      if (selectedRoundKey !== "all") {
        const roundHit = guest.roundStatuses?.find(
          (item) => item.roundKey === selectedRoundKey
        );
        if (!roundHit) return false;

        if (statusFilter !== "all" && roundHit.status !== statusFilter) {
          return false;
        }
      } else if (statusFilter !== "all") {
        if (statusFilter === "not_sent") {
          if (guest.receivedCount > 0) return false;
        } else if (statusFilter === "failed") {
          if (!guest.everFailed && guest.lastStatus !== "failed") return false;
        } else if (
          statusFilter === "pending" ||
          statusFilter === "scheduled" ||
          statusFilter === "sending"
        ) {
          if (
            guest.pendingCount <= 0 &&
            (guest.scheduledCount || 0) <= 0 &&
            guest.lastStatus !== statusFilter &&
            guest.overallStatus !== statusFilter
          ) {
            return false;
          }
        } else if (
          guest.overallStatus !== statusFilter &&
          guest.lastStatus !== statusFilter
        ) {
          return false;
        }
      }

      if (rsvpFilter !== "all" && guest.rsvp !== rsvpFilter) return false;

      if (messageCountFilter === "0" && guest.messagesCount !== 0) return false;
      if (messageCountFilter === "1" && guest.messagesCount !== 1) return false;
      if (messageCountFilter === "1+" && guest.receivedCount < 1) return false;
      if (messageCountFilter === "2+" && guest.messagesCount < 2) return false;

      if (q || qDigits) {
        const haystack = [
          guest.name,
          guest.phone,
          guest.overallStatusLabel,
          guest.lastStatusLabel,
          guest.lastError,
          guest.notSentReason,
          guest.rsvpLabel,
        ]
          .map((value) => normalizeText(value))
          .join(" ");

        const matchText = q ? haystack.includes(q) : false;
        const matchPhone = qDigits
          ? onlyDigits(guest.phone).includes(qDigits)
          : false;

        if (!(matchText || matchPhone)) return false;
      }

      return true;
    });
  }, [
    guests,
    selectedRoundKey,
    statusFilter,
    rsvpFilter,
    messageCountFilter,
    search,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredGuests.length / PAGE_SIZE));
  const pagedGuests = filteredGuests.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const selectedRound =
    selectedRoundKey === "all"
      ? null
      : rounds.find((round) => round.key === selectedRoundKey) || null;

  function toggleExpand(guestId: string) {
    setExpandedId((current) => (current === guestId ? null : guestId));
  }

  function displayStatusForGuest(guest: ReportGuest) {
    if (selectedRoundKey === "all") {
      return {
        overall: guest.overallStatus,
        overallLabel: guest.overallStatusLabel,
        last: guest.lastStatus,
        lastLabel: guest.lastStatusLabel,
        reason: guest.notSentReason,
      };
    }

    const roundHit = guest.roundStatuses?.find(
      (item) => item.roundKey === selectedRoundKey
    );

    return {
      overall: guest.overallStatus,
      overallLabel: guest.overallStatusLabel,
      last: roundHit?.status || "not_sent",
      lastLabel: roundHit?.statusLabel || "לא נשלח",
      reason: roundHit?.notSentReason || null,
    };
  }

  async function handleExportExcel() {
    if (exporting) return;

    try {
      setExporting(true);

      const res = await fetch(
        `/api/sms4free/round-report/${encodeURIComponent(invitationId)}/export`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            round: selectedRoundKey,
            status: statusFilter,
            rsvp: rsvpFilter,
            messageCount: messageCountFilter,
            search,
            clientName,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.message || data?.error || `ייצוא האקסל נכשל (${res.status})`
        );
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
      const fileName = utfMatch
        ? decodeURIComponent(utfMatch[1])
        : plainMatch?.[1] || "SMS_Report.xlsx";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ייצוא האקסל נכשל");
    } finally {
      setExporting(false);
    }
  }

  const emptyMessage =
    guests.length === 0
      ? "אין עדיין הודעות או אורחים להצגה בדוח זה."
      : selectedRound
        ? "אין אורחים התואמים לסינון שבחרת בסבב זה."
        : "אין אורחים התואמים לסינון שבחרת.";

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[10050] flex items-start justify-center overflow-y-auto bg-black/45 px-2 py-3 backdrop-blur-sm sm:px-4 sm:py-6"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[calc(100dvh-24px)] w-[calc(100vw-1rem)] max-w-[1400px] min-w-0 flex-col overflow-hidden rounded-[26px] border border-[#E7D8C6] bg-white shadow-[0_28px_90px_rgba(0,0,0,0.25)] sm:max-h-[calc(100dvh-48px)] sm:w-[calc(100vw-2rem)] sm:rounded-[34px]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-[#EFE2D1] bg-gradient-to-br from-[#FFFDF8] to-[#F8EFE3] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#6B5138] shadow-sm transition hover:bg-[#F1E5D6]"
            >
              <X size={20} />
            </button>

            <div className="min-w-0 flex-1 text-right">
              <h2 className="break-words text-2xl font-black text-[#3A2A1C] sm:text-3xl">
                דוח SMS לסבבים
              </h2>
              <p className="mt-1 text-sm font-bold leading-6 text-[#8A7867]">
                {clientName || invitationTitle || "לקוח"} · SMS4FREE · סטטוסים
                אמיתיים בלבד (ללא מסירה/קריאה)
              </p>
              {lastUpdated && (
                <p className="mt-1 text-xs font-bold text-[#A08B74]">
                  עודכן לאחרונה: {formatDateTime(lastUpdated)}
                </p>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {loading ? (
            <SkeletonBlock />
          ) : error && guests.length === 0 ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-sm font-bold leading-7 text-red-700">
              {error}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => loadReport("initial")}
                  className="rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-700"
                >
                  נסו שוב
                </button>
              </div>
            </div>
          ) : (
            <div className="min-w-0 space-y-5">
              {error && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  הרענון נכשל: {error}. מוצגים הנתונים האחרונים שנשמרו במסך.
                </div>
              )}

              <section className="rounded-[24px] border border-[#E7D8C6] bg-[#FFFDF8] p-4">
                <div className="mb-3 text-sm font-black text-[#7B6754]">
                  סבבים
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRoundKey("all")}
                    className={`min-w-[220px] shrink-0 rounded-[22px] border px-4 py-3 text-right transition ${
                      selectedRoundKey === "all"
                        ? "border-[#D7A34D] bg-white shadow-sm"
                        : "border-[#EFE2D1] bg-white/60 hover:bg-white"
                    }`}
                  >
                    <div className="text-base font-black text-[#3A2A1C]">
                      כל הסבבים
                    </div>
                    <div className="mt-1 text-xs font-black text-[#8A7867]">
                      {summary?.totalGuests || guests.length} אורחים ייחודיים
                    </div>
                  </button>

                  {rounds.map((round) => {
                    const intended =
                      round.intended ??
                      round.summary?.intended ??
                      round.total;
                    const notSent =
                      round.notSent ?? round.summary?.notSent ?? 0;

                    return (
                      <button
                        key={round.key}
                        type="button"
                        onClick={() => setSelectedRoundKey(round.key)}
                        className={`min-w-[240px] shrink-0 rounded-[22px] border px-4 py-3 text-right transition ${
                          selectedRoundKey === round.key
                            ? "border-[#D7A34D] bg-white shadow-sm"
                            : "border-[#EFE2D1] bg-white/60 hover:bg-white"
                        }`}
                      >
                        <div className="text-base font-black text-[#3A2A1C]">
                          {round.title}
                        </div>
                        <div className="mt-0.5 text-[11px] font-bold text-[#A08B74]">
                          {round.typeLabel || round.type || ""}
                        </div>
                        <div className="mt-2 space-y-0.5 text-xs font-black leading-5 text-[#8A7867]">
                          <div>{intended} מיועדים</div>
                          <div>
                            {round.sent} נשלחו · {round.failed} נכשלו
                          </div>
                          <div>
                            {notSent} לא נשלחו · {round.pending} ממתינים ·{" "}
                            {round.scheduled || 0} מתוזמנים
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[24px] border border-[#E7D8C6] bg-white p-4">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-[#3A2A1C]">
                      {selectedRound?.title || "תצוגה מאוחדת לפי אורח"}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-[#8A7867]">
                      מוצגים {filteredGuests.length.toLocaleString("he-IL")} מתוך{" "}
                      {guests.length.toLocaleString("he-IL")} אורחים
                      {typeof summary?.totalSmsAttempts === "number"
                        ? ` · סה״כ ${summary.totalSmsAttempts.toLocaleString("he-IL")} הודעות SMS`
                        : ""}
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                    <button
                      type="button"
                      disabled={refreshing}
                      onClick={() => loadReport("refresh")}
                      title="רענון מה-DB (אין polling לסטטוסי מסירה מ-SMS4FREE)"
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#E7D8C6] bg-white px-5 text-sm font-black text-[#6B451E] shadow-sm transition hover:bg-[#FFF8E6] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                    >
                      {refreshing ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                      רענון מהשרת
                    </button>
                    <button
                      type="button"
                      disabled={exporting || guests.length === 0}
                      onClick={() => {
                        void handleExportExcel();
                      }}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#1F7A4D] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#17663F] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                    >
                      {exporting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : null}
                      ייצוא דוח לאקסל
                    </button>
                  </div>
                </div>

                {selectedRound ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <StatBox
                      label="מיועדים"
                      value={
                        selectedRound.intended ??
                        selectedRound.summary?.intended ??
                        selectedRound.total
                      }
                    />
                    <StatBox label="נשלחו" value={selectedRound.sent} />
                    <StatBox
                      label="נכשלו"
                      value={selectedRound.failed}
                      danger
                    />
                    <StatBox
                      label="לא נשלחו"
                      value={
                        selectedRound.notSent ??
                        selectedRound.summary?.notSent ??
                        0
                      }
                    />
                    <StatBox label="ממתינים" value={selectedRound.pending} />
                    <StatBox
                      label="מתוזמנים"
                      value={selectedRound.scheduled || 0}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                    <StatBox
                      label="סה״כ אורחים"
                      value={summary?.totalGuests || guests.length}
                    />
                    <StatBox
                      label="קיבלו לפחות SMS אחד"
                      value={summary?.receivedAtLeastOne || 0}
                      active={messageCountFilter === "1+"}
                      onClick={() => {
                        setSelectedRoundKey("all");
                        setStatusFilter("all");
                        setMessageCountFilter("1+");
                      }}
                    />
                    <StatBox
                      label="לא קיבלו SMS"
                      value={summary?.receivedNone || 0}
                      active={statusFilter === "not_sent"}
                      onClick={() => {
                        setSelectedRoundKey("all");
                        setMessageCountFilter("all");
                        setStatusFilter("not_sent");
                      }}
                    />
                    <StatBox
                      label="נשלח לפחות פעם אחת"
                      value={summary?.sentAtLeastOnce || 0}
                      onClick={() => {
                        setSelectedRoundKey("all");
                        setMessageCountFilter("all");
                        setStatusFilter("sent");
                      }}
                    />
                    <StatBox
                      label="נכשלו לפחות פעם אחת"
                      value={summary?.failedAtLeastOnce || 0}
                      danger
                      active={statusFilter === "failed"}
                      onClick={() => {
                        setSelectedRoundKey("all");
                        setMessageCountFilter("all");
                        setStatusFilter("failed");
                      }}
                    />
                    <StatBox
                      label="קיבלו 2+ SMS"
                      value={summary?.receivedMultiple || 0}
                      active={messageCountFilter === "2+"}
                      onClick={() => {
                        setSelectedRoundKey("all");
                        setStatusFilter("all");
                        setMessageCountFilter("2+");
                      }}
                    />
                    <StatBox
                      label="ממתינים"
                      value={summary?.pending || 0}
                      onClick={() => {
                        setSelectedRoundKey("all");
                        setMessageCountFilter("all");
                        setStatusFilter("pending");
                      }}
                    />
                    <StatBox
                      label="מתוזמנים"
                      value={summary?.scheduled || 0}
                      onClick={() => {
                        setSelectedRoundKey("all");
                        setMessageCountFilter("all");
                        setStatusFilter("scheduled");
                      }}
                    />
                  </div>
                )}
              </section>

              <section className="min-w-0 rounded-[24px] border border-[#E7D8C6] bg-white p-4">
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black text-[#6B5A48]">
                      סבב
                    </span>
                    <select
                      value={selectedRoundKey}
                      onChange={(e) => setSelectedRoundKey(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-3 text-sm font-bold text-[#3A2A1C] outline-none"
                    >
                      <option value="all">כל הסבבים</option>
                      {rounds.map((round) => (
                        <option key={round.key} value={round.key}>
                          {round.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black text-[#6B5A48]">
                      סטטוס
                    </span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-3 text-sm font-bold text-[#3A2A1C] outline-none"
                    >
                      {STATUS_FILTERS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black text-[#6B5A48]">
                      RSVP
                    </span>
                    <select
                      value={rsvpFilter}
                      onChange={(e) => setRsvpFilter(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-3 text-sm font-bold text-[#3A2A1C] outline-none"
                    >
                      {RSVP_FILTERS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black text-[#6B5A48]">
                      כמות הודעות
                    </span>
                    <select
                      value={messageCountFilter}
                      onChange={(e) => setMessageCountFilter(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-3 text-sm font-bold text-[#3A2A1C] outline-none"
                    >
                      {MESSAGE_COUNT_FILTERS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="mb-4 block">
                  <span className="mb-2 block text-sm font-black text-[#6B5A48]">
                    חיפוש לפי שם, טלפון, סטטוס או שגיאה
                  </span>
                  <div className="flex h-12 items-center gap-3 rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-4">
                    <Search size={18} className="text-[#9A7A52]" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="לדוגמה: אביב / 058 / נכשל"
                      className="w-full bg-transparent text-sm font-bold text-[#3A2A1C] outline-none placeholder:text-[#B6A28C]"
                    />
                  </div>
                </label>

                <div
                  className="w-full min-w-0 max-w-full overflow-x-auto overflow-y-auto rounded-[22px] border border-[#EFE2D1]"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <table className="w-max min-w-[1400px] border-collapse text-right text-sm">
                    <thead className="sticky top-0 z-10 bg-[#F5EFE6] text-xs font-black text-[#7B6754]">
                      <tr>
                        <th className="w-10 whitespace-nowrap p-3"></th>
                        <th className="min-w-[160px] whitespace-nowrap p-4">
                          אורח
                        </th>
                        <th className="min-w-[130px] whitespace-nowrap p-4">
                          טלפון
                        </th>
                        <th className="min-w-[90px] whitespace-nowrap p-4">
                          RSVP
                        </th>
                        <th className="min-w-[280px] p-4">סבבים</th>
                        <th className="min-w-[100px] whitespace-nowrap p-4">
                          מספר הודעות
                        </th>
                        <th className="min-w-[120px] whitespace-nowrap p-4">
                          סטטוס כללי
                        </th>
                        <th className="min-w-[140px] whitespace-nowrap p-4">
                          סטטוס אחרון
                        </th>
                        <th className="min-w-[140px] whitespace-nowrap p-4">
                          הודעה אחרונה
                        </th>
                        <th className="min-w-[100px] whitespace-nowrap p-4">
                          פעולות
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#EFE2D1] bg-white">
                      {pagedGuests.map((guest) => {
                        const expanded = expandedId === guest.id;
                        const display = displayStatusForGuest(guest);

                        return (
                          <GuestRows
                            key={guest.id}
                            guest={guest}
                            expanded={expanded}
                            display={display}
                            isAdmin={isAdmin}
                            onToggle={() => toggleExpand(guest.id)}
                            onOpenMessages={() => setExpandedId(guest.id)}
                          />
                        );
                      })}

                      {pagedGuests.length === 0 && (
                        <tr>
                          <td
                            colSpan={10}
                            className="p-10 text-center font-bold text-[#8A7867]"
                          >
                            {emptyMessage}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredGuests.length > PAGE_SIZE && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-bold text-[#8A7867]">
                      עמוד {page} מתוך {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                        className="rounded-2xl border border-[#E7D8C6] bg-white px-4 py-2 text-sm font-black text-[#6B451E] disabled:opacity-40"
                      >
                        הקודם
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() =>
                          setPage((value) => Math.min(totalPages, value + 1))
                        }
                        className="rounded-2xl border border-[#E7D8C6] bg-white px-4 py-2 text-sm font-black text-[#6B451E] disabled:opacity-40"
                      >
                        הבא
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function GuestRows({
  guest,
  expanded,
  display,
  isAdmin,
  onToggle,
  onOpenMessages,
}: {
  guest: ReportGuest;
  expanded: boolean;
  display: {
    overall: string;
    overallLabel: string;
    last: string;
    lastLabel: string;
    reason?: string | null;
  };
  isAdmin: boolean;
  onToggle: () => void;
  onOpenMessages: () => void;
}) {
  return (
    <>
      <tr className="cursor-pointer hover:bg-[#FFFDF8]" onClick={onToggle}>
        <td className="p-3 text-[#8A7867]">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </td>
        <td className="max-w-[220px] p-4 font-black text-[#3A2A1C]">
          <div className="truncate" title={guest.name || undefined}>
            {guest.name || "—"}
          </div>
        </td>
        <td className="whitespace-nowrap p-4 font-bold text-[#6B5A48]" dir="ltr">
          {guest.phone || "—"}
        </td>
        <td className="whitespace-nowrap p-4 font-bold text-[#6B5A48]">
          {guest.rsvpLabel}
        </td>
        <td className="min-w-[280px] p-4">
          <div className="flex flex-nowrap items-center gap-1.5">
            {guest.roundsTotal > 0 && (
              <span className="text-[11px] font-bold text-[#A08B74]">
                {guest.roundsSentCount} מתוך {guest.roundsTotal}
              </span>
            )}
            <div className="flex flex-nowrap gap-1">
              {(guest.roundStatuses || []).map((chip) => (
                <RoundChip key={chip.roundKey} chip={chip} />
              ))}
            </div>
          </div>
        </td>
        <td className="whitespace-nowrap p-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMessages();
            }}
            className="inline-flex rounded-full border border-[#E7D8C6] bg-white px-2.5 py-1 text-[11px] font-black text-[#6B451E] hover:bg-[#FFF8E6]"
            title="פתח היסטוריית הודעות"
          >
            {guest.messagesCount === 0
              ? "0 הודעות"
              : guest.messagesCount === 1
                ? "הודעה אחת"
                : `${guest.messagesCount} הודעות`}
          </button>
        </td>
        <td className="whitespace-nowrap p-4">
          <StatusBadge
            status={display.overall}
            label={display.overallLabel}
            title="הסטטוס המתקדם ביותר שהושג אי פעם"
          />
        </td>
        <td className="whitespace-nowrap p-4">
          <div className="space-y-1">
            <StatusBadge
              status={display.last}
              label={display.lastLabel}
              title="סטטוס הניסיון האחרון"
            />
            {display.last === "not_sent" && display.reason && (
              <div className="max-w-[200px] whitespace-normal text-[11px] font-bold leading-4 text-[#8A7867]">
                {display.reason}
              </div>
            )}
            {display.last === "failed" && guest.lastError && (
              <div
                className="max-w-[200px] whitespace-normal text-[11px] font-bold leading-4 text-red-600"
                title={guest.lastError}
              >
                {guest.lastError}
              </div>
            )}
          </div>
        </td>
        <td className="whitespace-nowrap p-4 font-bold text-[#6B5A48]">
          {formatDateTime(guest.lastMessageAt) || "—"}
        </td>
        <td className="whitespace-nowrap p-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="rounded-2xl border border-[#E7D8C6] bg-white px-3 py-2 text-xs font-black text-[#6B451E] hover:bg-[#FFF8E6]"
          >
            {expanded ? "סגור" : "פירוט"}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-[#FFFDF8]">
          <td colSpan={10} className="p-4">
            <GuestTimeline guest={guest} isAdmin={isAdmin} />
          </td>
        </tr>
      )}
    </>
  );
}

function GuestTimeline({
  guest,
  isAdmin,
}: {
  guest: ReportGuest;
  isAdmin: boolean;
}) {
  const messages = guest.messages || [];

  if (messages.length === 0) {
    return (
      <div className="rounded-2xl border border-[#EFE2D1] bg-white px-4 py-5 text-sm font-bold text-[#8A7867]">
        לא נשלח עדיין אף SMS לאורח זה.
        {guest.notSentReason ? ` סיבה: ${guest.notSentReason}` : ""}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-black text-[#3A2A1C]">
        היסטוריית SMS · {guest.name || "אורח"}
      </div>

      <div className="grid gap-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className="rounded-2xl border border-[#EFE2D1] bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-black text-[#3A2A1C]">
                  {message.roundTitle}
                </div>
                <div className="mt-0.5 text-xs font-bold text-[#8A7867]">
                  {message.messageTypeLabel}
                </div>
              </div>
              <StatusBadge
                status={message.status}
                label={message.statusLabel}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#6B5A48] md:grid-cols-4">
              <div>
                נוצר: {formatDateTime(message.createdAt) || "—"}
              </div>
              <div>
                מתוזמן: {formatDateTime(message.scheduledAt) || "—"}
              </div>
              <div>
                ניסיון שליחה:{" "}
                {formatDateTime(message.attemptedAt || message.createdAt) ||
                  "—"}
              </div>
              <div>נשלח: {formatDateTime(message.sentAt) || "—"}</div>
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-[#8A7867]">
              <span>
                RSVP: {message.rsvpLabel || message.rsvp || "—"}
              </span>
              {message.providerStatus ? (
                <span>Provider: {message.providerStatus}</span>
              ) : null}
              {message.failedAt && (
                <span className="text-red-600">
                  נכשל: {formatDateTime(message.failedAt)}
                </span>
              )}
              {message.errorMessage && (
                <span className="text-red-600">{message.errorMessage}</span>
              )}
              {isAdmin && message.providerMessageId && (
                <span className="break-all" dir="ltr">
                  message id: {message.providerMessageId}
                </span>
              )}
              {isAdmin && message.admin?.scheduleId && (
                <span className="break-all" dir="ltr">
                  schedule: {message.admin.scheduleId}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
