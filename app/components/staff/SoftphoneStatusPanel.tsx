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
  | "after_call"
  | "back_office"
  | "manager_approval"
  | "break"
  | "personal"
  | "technical"
  | "unavailable"
  | "offline";

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
  offline: "מנותק",
};

const BUSY_REASONS: { value: BusyReason; label: string; targetStatus: AgentStatus }[] = [
  { value: "after_call", label: "טיפול אחרי שיחה", targetStatus: "after_call" },
  { value: "back_office", label: "בק אופיס", targetStatus: "unavailable" },
  { value: "manager_approval", label: "אישור מנהל", targetStatus: "unavailable" },
  { value: "break", label: "הפסקה", targetStatus: "break" },
  { value: "personal", label: "אישי", targetStatus: "unavailable" },
  { value: "technical", label: "תקלה טכנית", targetStatus: "unavailable" },
  { value: "unavailable", label: "לא זמין", targetStatus: "unavailable" },
  { value: "offline", label: "מנותק", targetStatus: "offline" },
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

function getCallDirectionLabel(direction: CallDirection) {
  if (direction === "outbound") return "שיחה יוצאת";
  if (direction === "inbound") return "שיחה נכנסת";
  return "אין שיחה";
}

function getStatusColor(status: AgentStatus) {
  if (status === "available") return "bg-emerald-600 text-white";
  if (status === "in_call") return "bg-red-600 text-white";
  if (status === "dialing" || status === "ringing") return "bg-blue-600 text-white";
  if (status === "after_call") return "bg-orange-500 text-white";
  if (status === "break") return "bg-amber-500 text-white";
  if (status === "offline") return "bg-zinc-700 text-white";
  return "bg-red-500 text-white";
}

export default function SoftphoneStatusPanel() {
  const [agent, setAgent] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<AgentStatus | null>(null);

  const [tick, setTick] = useState(0);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [activeCallNumber, setActiveCallNumber] = useState("");
  const [callDirection, setCallDirection] = useState<CallDirection>("none");

  const [showDialPad, setShowDialPad] = useState(false);
  const [busyReason, setBusyReason] = useState<BusyReason>("break");

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
    } catch (err) {
      console.error("LOAD SOFTPHONE STATUS FAILED:", err);
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(nextStatus: AgentStatus, reason?: BusyReason) {
    try {
      setSavingStatus(nextStatus);

      const res = await fetch("/api/staff/softphone/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          status: nextStatus,
          reason: reason || null,
          phoneNumber: activeCallNumber || phoneNumber || null,
          direction: callDirection,
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

  async function setAvailable() {
    setCallDirection("none");
    setActiveCallNumber("");
    await changeStatus("available");
  }

  async function setBusy() {
    const selectedReason = BUSY_REASONS.find((item) => item.value === busyReason);
    const targetStatus = selectedReason?.targetStatus || "unavailable";

    setCallDirection("none");
    setActiveCallNumber("");
    await changeStatus(targetStatus, busyReason);
  }

  async function startOutboundCall() {
    const cleanNumber = onlyDialChars(phoneNumber);

    if (!cleanNumber) {
      alert("יש להזין מספר לחיוג");
      return;
    }

    setActiveCallNumber(cleanNumber);
    setCallDirection("outbound");
    await changeStatus("dialing");
  }

  async function simulateIncomingCall() {
    const cleanNumber = onlyDialChars(phoneNumber);

    if (!cleanNumber) {
      alert("יש להזין מספר שממנו נכנסה שיחה");
      return;
    }

    setActiveCallNumber(cleanNumber);
    setCallDirection("inbound");
    await changeStatus("ringing");
  }

  async function markRinging() {
    await changeStatus("ringing");
  }

  async function markAnswered() {
    await changeStatus("in_call");
  }

  async function finishCall() {
    await changeStatus("after_call", "after_call");
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

  const activeDisplayNumber = activeCallNumber || phoneNumber || "—";

  const activeBusyReasonLabel =
    BUSY_REASONS.find((item) => item.value === busyReason)?.label || "לא פנוי";

  if (loading) {
    return (
      <section className="rounded-[26px] border border-[#e5d8c6] bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-[#6b5a45]">טוען סופטפון...</p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-[#e5d8c6] bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-[#9b7a3c]">
            LIVE SOFTPHONE
          </p>
          <h2 className="mt-1 text-xl font-black text-[#221b14]">
            סופטפון אישי
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-[#7a6a58]">
          <span>פנוי היום: {formatDuration(agent?.todayAvailableSeconds || 0)}</span>
          <span>שיחה היום: {formatDuration(agent?.todayTalkSeconds || 0)}</span>
          <span>הפסקה: {formatDuration(agent?.todayBreakSeconds || 0)}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-[1240px] items-stretch gap-3">
          <div className="flex w-[150px] flex-col justify-center rounded-2xl border border-[#e5d8c6] bg-[#fbf8f3] px-4 py-3">
            <p className="text-xs font-bold text-[#8b7b68]">סטטוס</p>
            <div
              className={`mt-2 rounded-xl px-3 py-2 text-center text-sm font-black ${getStatusColor(
                currentStatus
              )}`}
            >
              {STATUS_LABELS[currentStatus]}
            </div>
            <p className="mt-2 text-center font-mono text-2xl font-black text-[#221b14]">
              {formatDuration(liveStatusSeconds)}
            </p>
          </div>

          <div className="flex w-[210px] flex-col justify-center rounded-2xl border border-[#e5d8c6] bg-[#fbf8f3] px-4 py-3">
            <p className="text-xs font-bold text-[#8b7b68]">שיחה פעילה</p>
            <p className="mt-2 text-sm font-black text-[#221b14]">
              {getCallDirectionLabel(callDirection)}
            </p>
            <p
              dir="ltr"
              className="mt-1 truncate text-left font-mono text-xl font-black text-[#221b14]"
            >
              {activeDisplayNumber}
            </p>
          </div>

          <div className="flex w-[235px] flex-col justify-center rounded-2xl border border-[#e5d8c6] bg-[#fbf8f3] px-4 py-3">
            <label className="text-xs font-bold text-[#8b7b68]">
              מספר לחיוג / מספר נכנס
            </label>

            <input
              dir="ltr"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(onlyDialChars(event.target.value))}
              placeholder="0500000000"
              className="mt-2 h-11 rounded-xl border border-[#e5d8c6] bg-white px-3 text-left font-mono text-lg font-black text-[#221b14] outline-none transition focus:border-[#b9945a] focus:ring-4 focus:ring-[#b9945a]/10"
            />
          </div>

          <div className="flex w-[300px] flex-col justify-center rounded-2xl border border-[#e5d8c6] bg-[#fbf8f3] px-4 py-3">
            <p className="text-xs font-bold text-[#8b7b68]">זמינות עובד</p>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={setAvailable}
                disabled={savingStatus === "available"}
                className="h-12 rounded-xl bg-emerald-600 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60"
              >
                {savingStatus === "available" ? "מעדכן..." : "פנוי"}
              </button>

              <button
                onClick={setBusy}
                disabled={savingStatus !== null}
                className="h-12 rounded-xl bg-red-600 text-sm font-black text-white shadow-sm transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-60"
              >
                לא פנוי
              </button>
            </div>

            <select
              value={busyReason}
              onChange={(event) => setBusyReason(event.target.value as BusyReason)}
              className="mt-2 h-10 rounded-xl border border-[#e5d8c6] bg-white px-3 text-sm font-bold text-[#221b14] outline-none transition focus:border-[#b9945a]"
            >
              {BUSY_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>

            <p className="mt-1 text-xs font-bold text-[#8b7b68]">
              סיבה נבחרת: {activeBusyReasonLabel}
            </p>
          </div>

          <div className="flex w-[340px] flex-col justify-center rounded-2xl border border-[#e5d8c6] bg-[#fbf8f3] px-4 py-3">
            <p className="text-xs font-bold text-[#8b7b68]">פעולות שיחה</p>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                onClick={startOutboundCall}
                disabled={savingStatus === "dialing"}
                className="h-11 rounded-xl bg-[#221b14] text-xs font-black text-white transition hover:bg-black active:scale-[0.98] disabled:opacity-60"
              >
                {savingStatus === "dialing" ? "מחייג..." : "חיוג"}
              </button>

              <button
                onClick={simulateIncomingCall}
                disabled={savingStatus === "ringing"}
                className="h-11 rounded-xl border border-blue-200 bg-blue-50 text-xs font-black text-blue-700 transition hover:bg-blue-100 active:scale-[0.98] disabled:opacity-60"
              >
                נכנסת
              </button>

              <button
                onClick={markRinging}
                disabled={savingStatus === "ringing"}
                className="h-11 rounded-xl border border-indigo-200 bg-indigo-50 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 active:scale-[0.98] disabled:opacity-60"
              >
                מצלצל
              </button>

              <button
                onClick={markAnswered}
                disabled={savingStatus === "in_call"}
                className="h-11 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.98] disabled:opacity-60"
              >
                ענה
              </button>

              <button
                onClick={finishCall}
                disabled={savingStatus === "after_call"}
                className="h-11 rounded-xl border border-orange-200 bg-orange-50 text-xs font-black text-orange-700 transition hover:bg-orange-100 active:scale-[0.98] disabled:opacity-60"
              >
                סיים
              </button>

              <button
                onClick={() => setShowDialPad((prev) => !prev)}
                className="h-11 rounded-xl border border-[#e5d8c6] bg-white text-xs font-black text-[#221b14] transition hover:bg-[#fff8ed] active:scale-[0.98]"
              >
                מקשים
              </button>
            </div>
          </div>

          <div className="flex w-[180px] flex-col justify-center rounded-2xl border border-[#e5d8c6] bg-[#fbf8f3] px-4 py-3">
            <p className="text-xs font-bold text-[#8b7b68]">שיחות היום</p>

            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <MiniCounter label="סה״כ" value={agent?.totalCallsToday || 0} />
              <MiniCounter label="נענו" value={agent?.answeredCallsToday || 0} />
              <MiniCounter label="לא נענו" value={agent?.missedCallsToday || 0} />
              <MiniCounter label="נכשלו" value={agent?.failedCallsToday || 0} />
            </div>
          </div>
        </div>
      </div>

      {showDialPad && (
        <div className="mt-4 rounded-2xl border border-[#e5d8c6] bg-[#fbf8f3] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-[#221b14]">לוח מקשים</p>
              <p dir="ltr" className="mt-1 text-left font-mono text-lg font-black text-[#221b14]">
                {phoneNumber || "—"}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={removeLastDigit}
                className="rounded-xl border border-[#e5d8c6] bg-white px-4 py-2 text-xs font-black text-[#6b5a45] transition hover:bg-[#fff8ed]"
              >
                מחק
              </button>

              <button
                onClick={clearNumber}
                className="rounded-xl border border-[#e5d8c6] bg-white px-4 py-2 text-xs font-black text-[#6b5a45] transition hover:bg-[#fff8ed]"
              >
                נקה
              </button>
            </div>
          </div>

          <div className="grid max-w-[360px] grid-cols-3 gap-2">
            {DIAL_KEYS.map((digit) => (
              <button
                key={digit}
                onClick={() => appendDigit(digit)}
                className="h-14 rounded-2xl border border-[#e5d8c6] bg-white text-xl font-black text-[#221b14] transition hover:bg-[#fff8ed] active:scale-[0.98]"
              >
                {digit}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function MiniCounter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#e5d8c6] bg-white px-2 py-2">
      <p className="text-[10px] font-bold text-[#8b7b68]">{label}</p>
      <p className="mt-1 font-mono text-base font-black text-[#221b14]">
        {value}
      </p>
    </div>
  );
}