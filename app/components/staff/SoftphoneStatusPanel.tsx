"use client";

import { useEffect, useMemo, useState } from "react";

type AgentStatus =
  | "available"
  | "dialing"
  | "ringing"
  | "in_call"
  | "after_call"
  | "break"
  | "unavailable"
  | "offline";

type CallDirection = "none" | "outbound" | "inbound";

type BusyReason =
  | "outbound_call"
  | "after_call"
  | "back_office"
  | "manager_approval"
  | "break"
  | "personal"
  | "technical"
  | "unavailable";

type AgentState = {
  agentId: string;
  name?: string;
  email?: string;

  status: AgentStatus;
  statusStartedAt: string;
  currentCallId?: string | null;

  todayAvailableSeconds: number;
  todayDialingSeconds: number;
  todayRingingSeconds: number;
  todayTalkSeconds: number;
  todayAfterCallSeconds: number;
  todayBreakSeconds: number;
  todayUnavailableSeconds: number;
  todayOfflineSeconds: number;

  totalCallsToday: number;
  answeredCallsToday: number;
  missedCallsToday: number;
  failedCallsToday: number;

  lastSeenAt?: string;
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  available: "פנוי",
  dialing: "מחייג",
  ringing: "מצלצל",
  in_call: "בשיחה",
  after_call: "טיפול אחרי שיחה",
  break: "הפסקה",
  unavailable: "לא פנוי",
  offline: "מחוץ למשמרת",
};

const BUSY_REASONS: {
  value: BusyReason;
  label: string;
  targetStatus: AgentStatus;
}[] = [
  { value: "outbound_call", label: "הוצאת שיחה", targetStatus: "unavailable" },
  { value: "after_call", label: "טיפול בלקוח", targetStatus: "after_call" },
  { value: "back_office", label: "בק אופיס", targetStatus: "unavailable" },
  { value: "manager_approval", label: "אישור מנהל", targetStatus: "unavailable" },
  { value: "break", label: "הפסקה", targetStatus: "break" },
  { value: "personal", label: "אישי", targetStatus: "unavailable" },
  { value: "technical", label: "תקלה טכנית", targetStatus: "unavailable" },
  { value: "unavailable", label: "לא זמין", targetStatus: "unavailable" },
];

const DIAL_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":");
}

function secondsSince(value?: string | null) {
  if (!value) return 0;

  const start = new Date(value).getTime();
  const now = Date.now();
  const diff = Math.floor((now - start) / 1000);

  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

function onlyDialChars(value: string) {
  return value.replace(/[^\d*#+]/g, "");
}

function getBusyReasonLabel(reason?: BusyReason | null) {
  if (!reason) return "";
  return BUSY_REASONS.find((item) => item.value === reason)?.label || "";
}

function getCallLabel(direction: CallDirection, status: AgentStatus) {
  if (status === "dialing") return "חיוג";
  if (status === "ringing") return "שיחה נכנסת";
  if (status === "in_call") return "בשיחה";

  if (direction === "outbound") return "שיחה יוצאת";
  if (direction === "inbound") return "שיחה נכנסת";

  return "אין שיחה";
}

function statusDotClass(status: AgentStatus) {
  if (status === "available") return "bg-emerald-500";
  if (status === "dialing") return "bg-blue-500";
  if (status === "ringing") return "bg-indigo-500";
  if (status === "in_call") return "bg-red-500";
  if (status === "after_call") return "bg-orange-500";
  if (status === "break") return "bg-amber-500";
  if (status === "offline") return "bg-zinc-400";
  return "bg-red-500";
}

function statusTextClass(status: AgentStatus) {
  if (status === "available") return "text-emerald-700";
  if (status === "dialing") return "text-blue-700";
  if (status === "ringing") return "text-indigo-700";
  if (status === "in_call") return "text-red-700";
  if (status === "after_call") return "text-orange-700";
  if (status === "break") return "text-amber-700";
  if (status === "offline") return "text-zinc-600";
  return "text-red-700";
}

export default function SoftphoneStatusPanel() {
  const [agent, setAgent] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<AgentStatus | null>(null);

  const [tick, setTick] = useState(0);

  const [shiftStarted, setShiftStarted] = useState(false);
  const [shiftStartedAt, setShiftStartedAt] = useState<string | null>(null);
  const [showEndShiftConfirm, setShowEndShiftConfirm] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [activeCallNumber, setActiveCallNumber] = useState("");
  const [callDirection, setCallDirection] = useState<CallDirection>("none");

  const [busyReason, setBusyReason] = useState<BusyReason | "">("");
  const [activeBusyReason, setActiveBusyReason] = useState<BusyReason | null>(null);
  const [showDialer, setShowDialer] = useState(false);

  useEffect(() => {
    loadMyStatus();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  async function loadMyStatus() {
    try {
      setLoading(true);

      const res = await fetch("/api/staff/softphone/status", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "LOAD_STATUS_FAILED");
      }

      setAgent(data.agent);

      if (data.agent?.status && data.agent.status !== "offline") {
        setShiftStarted(true);
        setShiftStartedAt(data.agent.statusStartedAt || new Date().toISOString());
      } else {
        setShiftStarted(false);
        setShiftStartedAt(null);
      }
    } catch (err) {
      console.error("LOAD SOFTPHONE STATUS FAILED:", err);
    } finally {
      setLoading(false);
    }
  }

  function ensureShiftStarted() {
    if (!shiftStarted) {
      const now = new Date().toISOString();
      setShiftStarted(true);
      setShiftStartedAt(now);
    }
  }

  async function changeStatus(
    nextStatus: AgentStatus,
    options?: {
      reason?: BusyReason | null;
      number?: string | null;
      direction?: CallDirection;
      autoStartShift?: boolean;
    }
  ) {
    if (savingStatus) return;

    const shouldAutoStartShift = options?.autoStartShift !== false;

    try {
      if (nextStatus !== "offline" && shouldAutoStartShift) {
        ensureShiftStarted();
      }

      setSavingStatus(nextStatus);

      const res = await fetch("/api/staff/softphone/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          status: nextStatus,
          reason: options?.reason || null,
          phoneNumber: options?.number || activeCallNumber || phoneNumber || null,
          direction: options?.direction || callDirection,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "CHANGE_STATUS_FAILED");
      }

      setAgent((prev) => ({
        ...(prev || {}),
        ...data.agent,
      }));
    } catch (err) {
      console.error("CHANGE SOFTPHONE STATUS FAILED:", err);
      alert("שגיאה בעדכון סטטוס");
    } finally {
      setSavingStatus(null);
    }
  }

  async function startShift() {
    if (savingStatus) return;

    const now = new Date().toISOString();

    setShiftStarted(true);
    setShiftStartedAt(now);
    setCallDirection("none");
    setActiveCallNumber("");
    setActiveBusyReason(null);
    setBusyReason("");
    setShowDialer(false);

    await changeStatus("available", {
      direction: "none",
      number: null,
      reason: null,
      autoStartShift: false,
    });
  }

  function requestEndShift() {
    if (!shiftStarted || savingStatus) return;
    setShowEndShiftConfirm(true);
  }

  async function confirmEndShift() {
    if (savingStatus) return;

    setShowEndShiftConfirm(false);
    setShiftStarted(false);
    setShiftStartedAt(null);
    setCallDirection("none");
    setActiveCallNumber("");
    setActiveBusyReason(null);
    setBusyReason("");
    setShowDialer(false);
    setPhoneNumber("");

    await changeStatus("offline", {
      direction: "none",
      number: null,
      reason: null,
      autoStartShift: false,
    });
  }

  async function setAvailable() {
    if (savingStatus) return;

    ensureShiftStarted();

    setCallDirection("none");
    setActiveCallNumber("");
    setActiveBusyReason(null);
    setBusyReason("");
    setShowDialer(false);

    await changeStatus("available", {
      direction: "none",
      number: null,
      reason: null,
    });
  }

  async function handleBusyReasonChange(value: BusyReason) {
    if (savingStatus) return;

    const selected = BUSY_REASONS.find((item) => item.value === value);
    if (!selected) return;

    ensureShiftStarted();

    setBusyReason(value);
    setActiveBusyReason(value);

    if (value === "outbound_call") {
      setCallDirection("outbound");
      setShowDialer(true);

      await changeStatus("unavailable", {
        reason: value,
        direction: "outbound",
        number: phoneNumber || null,
      });

      return;
    }

    setCallDirection("none");
    setActiveCallNumber("");
    setShowDialer(false);

    await changeStatus(selected.targetStatus, {
      reason: value,
      direction: "none",
      number: null,
    });
  }

  function openDialer() {
    ensureShiftStarted();
    setActiveBusyReason("outbound_call");
    setBusyReason("outbound_call");
    setCallDirection("outbound");
    setShowDialer((prev) => !prev);
  }

  async function startOutboundCall() {
    if (savingStatus) return;

    const cleanNumber = onlyDialChars(phoneNumber);

    if (!cleanNumber) {
      setShowDialer(true);
      return;
    }

    ensureShiftStarted();

    setActiveBusyReason("outbound_call");
    setBusyReason("outbound_call");
    setActiveCallNumber(cleanNumber);
    setCallDirection("outbound");
    setShowDialer(false);

    await changeStatus("dialing", {
      number: cleanNumber,
      direction: "outbound",
      reason: "outbound_call",
    });
  }

  async function simulateIncomingCall() {
    if (savingStatus) return;

    const cleanNumber = onlyDialChars(phoneNumber);

    if (!cleanNumber) {
      alert("יש להזין מספר שממנו נכנסה שיחה");
      setShowDialer(true);
      return;
    }

    ensureShiftStarted();

    setActiveBusyReason(null);
    setActiveCallNumber(cleanNumber);
    setCallDirection("inbound");
    setShowDialer(false);

    await changeStatus("ringing", {
      number: cleanNumber,
      direction: "inbound",
      reason: null,
    });
  }

  async function markAnswered() {
    if (savingStatus) return;

    const cleanNumber = activeCallNumber || onlyDialChars(phoneNumber);

    if (!cleanNumber) {
      alert("אין מספר פעיל לשיחה");
      return;
    }

    ensureShiftStarted();

    setActiveCallNumber(cleanNumber);
    setShowDialer(false);

    await changeStatus("in_call", {
      number: cleanNumber,
      direction: callDirection === "none" ? "outbound" : callDirection,
      reason: activeBusyReason,
    });
  }

  async function finishCall() {
    if (savingStatus) return;

    ensureShiftStarted();

    await changeStatus("after_call", {
      reason: "after_call",
      number: activeCallNumber || phoneNumber,
      direction: callDirection,
    });

    setActiveBusyReason("after_call");
    setBusyReason("after_call");
    setCallDirection("none");
    setActiveCallNumber("");
    setPhoneNumber("");
    setShowDialer(false);
  }

  function appendDigit(digit: string) {
    setPhoneNumber((prev) => onlyDialChars(`${prev}${digit}`));
  }

  function removeLastDigit() {
    setPhoneNumber((prev) => prev.slice(0, -1));
  }

  function clearNumber() {
    setPhoneNumber("");
  }

  const currentStatus: AgentStatus = agent?.status || "offline";

  const liveStatusSeconds = useMemo(() => {
    tick;
    return secondsSince(agent?.statusStartedAt);
  }, [agent?.statusStartedAt, tick]);

  const shiftSeconds = useMemo(() => {
    tick;
    return secondsSince(shiftStartedAt);
  }, [shiftStartedAt, tick]);

  const activeDisplayNumber = activeCallNumber || phoneNumber || "—";
  const canReceiveInbound = shiftStarted && currentStatus === "available";
  const statusLabel =
    activeBusyReason && currentStatus !== "available" && currentStatus !== "offline"
      ? getBusyReasonLabel(activeBusyReason) || STATUS_LABELS[currentStatus]
      : STATUS_LABELS[currentStatus];

  if (loading) {
    return (
      <section dir="rtl" className="w-full rounded-2xl border border-[#e7dac8] bg-white px-4 py-3 shadow-sm">
        <p className="text-sm font-bold text-[#6b5a45]">טוען...</p>
      </section>
    );
  }

  return (
    <section dir="rtl" className="relative w-full">
      <div className="flex w-full flex-col gap-2 rounded-2xl border border-[#e7dac8] bg-white px-3 py-2 shadow-sm">
        <div className="flex min-h-[56px] w-full flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={shiftStarted ? requestEndShift : startShift}
            disabled={!!savingStatus}
            className={`h-10 rounded-xl px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
              shiftStarted
                ? "border border-[#b9945a] bg-white text-[#8a642b] hover:bg-[#fff8ed]"
                : "bg-[#221b14] text-white hover:bg-black"
            }`}
          >
            {shiftStarted ? "סיום משמרת" : "תחילת משמרת"}
          </button>

          <div className="flex h-10 items-center gap-2 rounded-xl border border-[#eadfce] bg-[#fbf8f3] px-3">
            <span className="text-xs font-bold text-[#8b7b68]">משמרת</span>
            <span dir="ltr" className="font-mono text-sm font-black text-[#221b14]">
              {shiftStarted ? formatDuration(shiftSeconds) : "00:00:00"}
            </span>
          </div>

          <button
            type="button"
            onClick={setAvailable}
            disabled={!!savingStatus || !shiftStarted}
            className={`h-10 rounded-xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
              currentStatus === "available"
                ? "bg-emerald-600 text-white"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            פנוי
          </button>

          <select
            value={busyReason}
            onChange={(event) => handleBusyReasonChange(event.target.value as BusyReason)}
            disabled={!!savingStatus || !shiftStarted}
            className={`h-10 min-w-[165px] rounded-xl border px-3 text-sm font-black outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${
              currentStatus !== "available" && currentStatus !== "offline"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-[#e7dac8] bg-white text-[#221b14] focus:border-[#b9945a]"
            }`}
          >
            <option value="">לא פנוי</option>
            {BUSY_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>

          <div className="flex h-10 min-w-[185px] items-center gap-2 rounded-xl border border-[#eadfce] bg-[#fbf8f3] px-3">
            <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(currentStatus)}`} />
            <span className={`text-sm font-black ${statusTextClass(currentStatus)}`}>
              {statusLabel}
            </span>
            <span dir="ltr" className="mr-auto font-mono text-sm font-black text-[#221b14]">
              {formatDuration(liveStatusSeconds)}
            </span>
          </div>

          <div
            className={`flex h-10 items-center rounded-xl px-3 text-xs font-black ${
              canReceiveInbound
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {canReceiveInbound ? "מקבל נכנסות" : "לא מקבל נכנסות"}
          </div>

          <div className="hidden h-8 w-px bg-[#eadfce] xl:block" />

          <div className="flex h-10 min-w-[260px] flex-1 items-center overflow-hidden rounded-xl border border-[#e7dac8] bg-white">
            <button
              type="button"
              onClick={openDialer}
              disabled={!!savingStatus || !shiftStarted}
              className="h-full border-l border-[#e7dac8] bg-[#fbf8f3] px-3 text-sm font-black text-[#221b14] transition hover:bg-[#fff8ed] disabled:cursor-not-allowed disabled:opacity-50"
            >
              מקשים
            </button>

            <input
              dir="ltr"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(onlyDialChars(event.target.value))}
              onFocus={() => {
                if (shiftStarted) {
                  setActiveBusyReason("outbound_call");
                  setBusyReason("outbound_call");
                }
              }}
              placeholder="מספר לחיוג"
              disabled={!shiftStarted}
              className="h-full min-w-0 flex-1 bg-white px-3 text-left font-mono text-sm font-black text-[#221b14] outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
            />

            <button
              type="button"
              onClick={startOutboundCall}
              disabled={!!savingStatus || !shiftStarted}
              className="h-full bg-[#b9945a] px-4 text-sm font-black text-white transition hover:bg-[#9f7a3f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              חיוג
            </button>
          </div>

          <div className="flex h-10 min-w-[245px] items-center gap-2 rounded-xl border border-[#eadfce] bg-[#fbf8f3] px-3">
            <span className="text-xs font-bold text-[#8b7b68]">
              {getCallLabel(callDirection, currentStatus)}
            </span>

            <span dir="ltr" className="max-w-[115px] truncate font-mono text-sm font-black text-[#221b14]">
              {activeDisplayNumber}
            </span>

            {(currentStatus === "dialing" ||
              currentStatus === "ringing" ||
              currentStatus === "in_call") && (
              <span dir="ltr" className="mr-auto font-mono text-sm font-black text-[#b42318]">
                {formatDuration(liveStatusSeconds)}
              </span>
            )}
          </div>

          {(currentStatus === "dialing" || currentStatus === "ringing") && (
            <button
              type="button"
              onClick={markAnswered}
              disabled={!!savingStatus}
              className="h-10 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ענה
            </button>
          )}

          {(currentStatus === "dialing" ||
            currentStatus === "ringing" ||
            currentStatus === "in_call") && (
            <button
              type="button"
              onClick={finishCall}
              disabled={!!savingStatus}
              className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              סיים
            </button>
          )}

          <div className="mr-auto flex items-center gap-3 text-xs font-bold text-[#7a6a58]">
            <span>שיחות: {agent?.totalCallsToday || 0}</span>
            <span>נענו: {agent?.answeredCallsToday || 0}</span>
            <span>פספסו: {agent?.missedCallsToday || 0}</span>
          </div>
        </div>

        {showDialer && (
          <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-[#eadfce] bg-[#fbf8f3] p-2">
            <span className="px-2 text-xs font-black text-[#8b7b68]">לוח מקשים</span>

            {DIAL_KEYS.map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => appendDigit(digit)}
                className="h-9 w-10 rounded-xl border border-[#e7dac8] bg-white text-sm font-black text-[#221b14] transition hover:bg-[#fff8ed]"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={removeLastDigit}
              className="h-9 rounded-xl border border-[#e7dac8] bg-white px-3 text-xs font-black text-[#6b5a45] transition hover:bg-[#fff8ed]"
            >
              מחק
            </button>

            <button
              type="button"
              onClick={clearNumber}
              className="h-9 rounded-xl border border-[#e7dac8] bg-white px-3 text-xs font-black text-[#6b5a45] transition hover:bg-[#fff8ed]"
            >
              נקה
            </button>

            <button
              type="button"
              onClick={startOutboundCall}
              className="h-9 rounded-xl bg-[#221b14] px-4 text-xs font-black text-white transition hover:bg-black"
            >
              חייג עכשיו
            </button>
          </div>
        )}
      </div>

      {showEndShiftConfirm && (
        <div className="absolute right-0 top-[64px] z-50 w-[330px] rounded-2xl border border-[#e7dac8] bg-white p-4 shadow-xl">
          <p className="text-sm font-black text-[#221b14]">לסיים משמרת?</p>

          <p className="mt-2 text-sm font-bold leading-6 text-[#6b5a45]">
            האם את/ה בטוח/ה שברצונך לסיים משמרת?
            <br />
            סה״כ זמן עבודה:{" "}
            <span dir="ltr" className="font-mono font-black text-[#221b14]">
              {formatDuration(shiftSeconds)}
            </span>
          </p>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={confirmEndShift}
              disabled={!!savingStatus}
              className="h-10 flex-1 rounded-xl bg-[#b9945a] text-sm font-black text-white transition hover:bg-[#9f7a3f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              סיום משמרת
            </button>

            <button
              type="button"
              onClick={() => setShowEndShiftConfirm(false)}
              disabled={!!savingStatus}
              className="h-10 flex-1 rounded-xl border border-[#e7dac8] bg-white text-sm font-black text-[#6b5a45] transition hover:bg-[#fff8ed] disabled:cursor-not-allowed disabled:opacity-50"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </section>
  );
}