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

type RecentCall = {
  id: string;
  number: string;
  label?: string;
  direction: "outbound" | "inbound" | "missed";
  time: string;
};

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

const MOCK_RECENT_CALLS: RecentCall[] = [
  {
    id: "1",
    number: "050-123-4567",
    label: "לקוח אחרון",
    direction: "outbound",
    time: "12:44",
  },
  {
    id: "2",
    number: "052-888-1940",
    label: "שיחה נכנסת",
    direction: "inbound",
    time: "11:20",
  },
  {
    id: "3",
    number: "054-777-2211",
    label: "לא נענתה",
    direction: "missed",
    time: "10:08",
  },
];

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
  return value.replace(/[^\d*#+-]/g, "");
}

function normalizeDialNumber(value: string) {
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

  return "אין שיחה פעילה";
}

function statusDotClass(status: AgentStatus) {
  if (status === "available") return "bg-emerald-500 shadow-emerald-200";
  if (status === "dialing") return "bg-blue-500 shadow-blue-200";
  if (status === "ringing") return "bg-indigo-500 shadow-indigo-200";
  if (status === "in_call") return "bg-red-500 shadow-red-200";
  if (status === "after_call") return "bg-orange-500 shadow-orange-200";
  if (status === "break") return "bg-amber-500 shadow-amber-200";
  if (status === "offline") return "bg-zinc-400 shadow-zinc-200";
  return "bg-red-500 shadow-red-200";
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

function recentCallBadgeClass(direction: RecentCall["direction"]) {
  if (direction === "outbound") return "bg-[#f7efe3] text-[#8a642b]";
  if (direction === "inbound") return "bg-emerald-50 text-emerald-700";
  return "bg-red-50 text-red-700";
}

function recentCallDirectionLabel(direction: RecentCall["direction"]) {
  if (direction === "outbound") return "יוצאת";
  if (direction === "inbound") return "נכנסת";
  return "פספוס";
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
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>(MOCK_RECENT_CALLS);

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
    setShowDialer(false);
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

  function toggleDialer() {
    if (!shiftStarted) return;

    setActiveBusyReason("outbound_call");
    setBusyReason("outbound_call");
    setCallDirection("outbound");
    setShowEndShiftConfirm(false);
    setShowDialer((prev) => !prev);
  }

  function selectRecentCall(call: RecentCall) {
    setPhoneNumber(call.number);
    setActiveBusyReason("outbound_call");
    setBusyReason("outbound_call");
    setCallDirection("outbound");
  }

  function addRecentCall(number: string, direction: RecentCall["direction"]) {
    const clean = number.trim();
    if (!clean) return;

    const now = new Date();
    const time = now.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setRecentCalls((prev) => {
      const withoutDuplicate = prev.filter((item) => item.number !== clean);

      return [
        {
          id: `${Date.now()}`,
          number: clean,
          label: direction === "outbound" ? "חיוג אחרון" : "שיחה אחרונה",
          direction,
          time,
        },
        ...withoutDuplicate,
      ].slice(0, 5);
    });
  }

  async function startOutboundCall() {
    if (savingStatus) return;

    const cleanNumber = normalizeDialNumber(phoneNumber);

    if (!cleanNumber) {
      setShowDialer(true);
      return;
    }

    ensureShiftStarted();

    setActiveBusyReason("outbound_call");
    setBusyReason("outbound_call");
    setActiveCallNumber(cleanNumber);
    setPhoneNumber(cleanNumber);
    setCallDirection("outbound");
    setShowDialer(false);

    addRecentCall(cleanNumber, "outbound");

    await changeStatus("dialing", {
      number: cleanNumber,
      direction: "outbound",
      reason: "outbound_call",
    });
  }

  async function simulateIncomingCall() {
    if (savingStatus) return;

    const cleanNumber = normalizeDialNumber(phoneNumber);

    if (!cleanNumber) {
      alert("יש להזין מספר שממנו נכנסה שיחה");
      setShowDialer(true);
      return;
    }

    ensureShiftStarted();

    setActiveBusyReason(null);
    setActiveCallNumber(cleanNumber);
    setPhoneNumber(cleanNumber);
    setCallDirection("inbound");
    setShowDialer(false);

    addRecentCall(cleanNumber, "inbound");

    await changeStatus("ringing", {
      number: cleanNumber,
      direction: "inbound",
      reason: null,
    });
  }

  async function markAnswered() {
    if (savingStatus) return;

    const cleanNumber = activeCallNumber || normalizeDialNumber(phoneNumber);

    if (!cleanNumber) {
      alert("אין מספר פעיל לשיחה");
      return;
    }

    ensureShiftStarted();

    setActiveCallNumber(cleanNumber);
    setPhoneNumber(cleanNumber);
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
    setPhoneNumber((prev) => normalizeDialNumber(`${prev}${digit}`));
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

  const isCallActive =
    currentStatus === "dialing" ||
    currentStatus === "ringing" ||
    currentStatus === "in_call";

  if (loading) {
    return (
      <section
        dir="rtl"
        className="w-full rounded-2xl border border-[#e7dac8] bg-white px-4 py-3 shadow-sm"
      >
        <p className="text-sm font-bold text-[#6b5a45]">טוען...</p>
      </section>
    );
  }

  return (
    <section dir="rtl" className="relative w-full">
      <div className="w-full rounded-[22px] border border-[#e8dcc9] bg-[#fffdf9] p-2 shadow-[0_10px_35px_rgba(34,27,20,0.07)]">
        <div className="flex min-h-[58px] w-full flex-wrap items-center gap-2 rounded-[18px] border border-[#f0e7d8] bg-white px-3 py-2">
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
                ? "bg-emerald-600 text-white shadow-sm"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            פנוי
          </button>

          <select
            value={busyReason}
            onChange={(event) => handleBusyReasonChange(event.target.value as BusyReason)}
            disabled={!!savingStatus || !shiftStarted}
            className={`h-10 min-w-[170px] rounded-xl border px-3 text-sm font-black outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${
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

          <div className="flex h-10 min-w-[190px] items-center gap-2 rounded-xl border border-[#eadfce] bg-[#fbf8f3] px-3">
            <span
              className={`h-2.5 w-2.5 rounded-full shadow-[0_0_0_4px] ${statusDotClass(
                currentStatus
              )}`}
            />
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

          <div className="relative flex h-10 min-w-[320px] flex-1 items-center overflow-visible rounded-xl border border-[#e7dac8] bg-white">
            <button
              type="button"
              onClick={toggleDialer}
              disabled={!!savingStatus || !shiftStarted}
              className={`h-full rounded-r-xl border-l border-[#e7dac8] px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                showDialer
                  ? "bg-[#221b14] text-white"
                  : "bg-[#fbf8f3] text-[#221b14] hover:bg-[#fff8ed]"
              }`}
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

            {showDialer && (
              <div className="absolute left-0 top-[50px] z-50 w-[270px] rounded-[24px] border border-[#e8dcc9] bg-white p-4 shadow-[0_22px_60px_rgba(34,27,20,0.18)]">
                <div className="mb-3 rounded-2xl border border-[#eadfce] bg-[#fbf8f3] px-3 py-2">
                  <p className="text-center text-[11px] font-black text-[#8b7b68]">
                    לוח מקשים
                  </p>
                  <p
                    dir="ltr"
                    className="mt-1 truncate text-center font-mono text-xl font-black tracking-wide text-[#221b14]"
                  >
                    {phoneNumber || "—"}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {DIAL_KEYS.map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => appendDigit(digit)}
                      className="flex h-14 items-center justify-center rounded-2xl border border-[#e7dac8] bg-white text-xl font-black text-[#221b14] transition hover:border-[#b9945a] hover:bg-[#fff8ed] active:scale-95"
                    >
                      {digit}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={removeLastDigit}
                    className="h-11 rounded-2xl border border-[#e7dac8] bg-white text-xs font-black text-[#6b5a45] transition hover:bg-[#fff8ed]"
                  >
                    מחק
                  </button>

                  <button
                    type="button"
                    onClick={clearNumber}
                    className="h-11 rounded-2xl border border-[#e7dac8] bg-white text-xs font-black text-[#6b5a45] transition hover:bg-[#fff8ed]"
                  >
                    נקה
                  </button>

                  <button
                    type="button"
                    onClick={startOutboundCall}
                    className="h-11 rounded-2xl bg-[#221b14] text-xs font-black text-white transition hover:bg-black"
                  >
                    חייג
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex h-10 min-w-[250px] items-center gap-2 rounded-xl border border-[#eadfce] bg-[#fbf8f3] px-3">
            <span className="text-xs font-bold text-[#8b7b68]">
              {getCallLabel(callDirection, currentStatus)}
            </span>

            <span
              dir="ltr"
              className="max-w-[115px] truncate font-mono text-sm font-black text-[#221b14]"
            >
              {activeDisplayNumber}
            </span>

            {isCallActive && (
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

          {isCallActive && (
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

        <div className="mt-2 flex w-full flex-wrap items-center gap-2 rounded-[18px] border border-[#f0e7d8] bg-[#fbf8f3] px-3 py-2">
          <div className="ml-2 text-xs font-black text-[#8b7b68]">שיחות אחרונות</div>

          {recentCalls.length === 0 ? (
            <div className="text-xs font-bold text-[#9b8b78]">אין שיחות אחרונות</div>
          ) : (
            recentCalls.map((call) => (
              <button
                key={call.id}
                type="button"
                onClick={() => selectRecentCall(call)}
                className="flex h-10 items-center gap-2 rounded-xl border border-[#e7dac8] bg-white px-3 text-right transition hover:border-[#b9945a] hover:bg-[#fffaf2]"
              >
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-black ${recentCallBadgeClass(
                    call.direction
                  )}`}
                >
                  {recentCallDirectionLabel(call.direction)}
                </span>

                <span dir="ltr" className="font-mono text-sm font-black text-[#221b14]">
                  {call.number}
                </span>

                <span className="text-xs font-bold text-[#8b7b68]">
                  {call.label}
                </span>

                <span className="text-xs font-bold text-[#b0a08d]">
                  {call.time}
                </span>
              </button>
            ))
          )}

          <button
            type="button"
            onClick={simulateIncomingCall}
            disabled={!!savingStatus || !shiftStarted}
            className="mr-auto h-10 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            סימולציית נכנסת
          </button>
        </div>
      </div>

      {showEndShiftConfirm && (
        <div className="absolute right-0 top-[68px] z-50 w-[340px] rounded-2xl border border-[#e7dac8] bg-white p-4 shadow-[0_22px_60px_rgba(34,27,20,0.18)]">
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