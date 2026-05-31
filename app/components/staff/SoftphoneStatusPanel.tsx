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
  after_call: "טיפול",
  break: "הפסקה",
  unavailable: "לא פנוי",
  offline: "מנותק",
};

const BUSY_REASONS: {
  value: BusyReason;
  label: string;
  targetStatus: AgentStatus;
}[] = [
  { value: "after_call", label: "טיפול אחרי שיחה", targetStatus: "after_call" },
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

function statusPillClass(status: AgentStatus) {
  if (status === "available") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "dialing") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (status === "ringing") {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }

  if (status === "in_call") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (status === "after_call") {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }

  if (status === "break") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (status === "offline") {
    return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }

  return "bg-red-50 text-red-700 border-red-200";
}

function getCallLabel(direction: CallDirection) {
  if (direction === "outbound") return "שיחה יוצאת";
  if (direction === "inbound") return "שיחה נכנסת";
  return "אין שיחה";
}

export default function SoftphoneStatusPanel() {
  const [agent, setAgent] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<AgentStatus | null>(null);

  const [tick, setTick] = useState(0);

  const [shiftStarted, setShiftStarted] = useState(false);
  const [shiftStartedAt, setShiftStartedAt] = useState<string | null>(null);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [activeCallNumber, setActiveCallNumber] = useState("");
  const [callDirection, setCallDirection] = useState<CallDirection>("none");

  const [busyReason, setBusyReason] = useState<BusyReason>("break");
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
      }
    } catch (err) {
      console.error("LOAD SOFTPHONE STATUS FAILED:", err);
    } finally {
      setLoading(false);
    }
  }

  function ensureShiftStarted() {
    if (!shiftStarted) {
      setShiftStarted(true);
      setShiftStartedAt(new Date().toISOString());
    }
  }

  async function changeStatus(
    nextStatus: AgentStatus,
    options?: {
      reason?: BusyReason | null;
      number?: string | null;
      direction?: CallDirection;
    }
  ) {
    if (savingStatus) return;

    try {
      ensureShiftStarted();
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

    setShiftStarted(true);
    setShiftStartedAt(new Date().toISOString());
    setCallDirection("none");
    setActiveCallNumber("");

    await changeStatus("available", {
      direction: "none",
      number: null,
      reason: null,
    });
  }

  async function endShift() {
    if (savingStatus) return;

    setShiftStarted(false);
    setShiftStartedAt(null);
    setCallDirection("none");
    setActiveCallNumber("");
    setShowDialer(false);

    await changeStatus("offline", {
      direction: "none",
      number: null,
      reason: null,
    });
  }

  async function setAvailable() {
    if (savingStatus) return;

    setCallDirection("none");
    setActiveCallNumber("");

    await changeStatus("available", {
      direction: "none",
      number: null,
      reason: null,
    });
  }

  async function setBusy() {
    if (savingStatus) return;

    const selected = BUSY_REASONS.find((item) => item.value === busyReason);
    const targetStatus = selected?.targetStatus || "unavailable";

    setCallDirection("none");
    setActiveCallNumber("");

    await changeStatus(targetStatus, {
      reason: busyReason,
      direction: "none",
      number: null,
    });
  }

  function openDialer() {
    ensureShiftStarted();
    setShowDialer(true);
  }

  async function startOutboundCall() {
    if (savingStatus) return;

    const cleanNumber = onlyDialChars(phoneNumber);

    if (!cleanNumber) {
      setShowDialer(true);
      return;
    }

    ensureShiftStarted();

    setActiveCallNumber(cleanNumber);
    setCallDirection("outbound");
    setShowDialer(true);

    await changeStatus("dialing", {
      number: cleanNumber,
      direction: "outbound",
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

    setActiveCallNumber(cleanNumber);
    setCallDirection("inbound");

    await changeStatus("ringing", {
      number: cleanNumber,
      direction: "inbound",
    });
  }

  async function markAnswered() {
    if (savingStatus) return;

    ensureShiftStarted();

    const number = activeCallNumber || phoneNumber;

    await changeStatus("in_call", {
      number,
      direction: callDirection === "none" ? "outbound" : callDirection,
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

  if (loading) {
    return (
      <section className="rounded-3xl border border-[#e7dac8] bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-[#6b5a45]">טוען סופטפון...</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-[#e7dac8] bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex min-h-[74px] flex-col gap-2 rounded-2xl bg-[#fbf8f3] p-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={startShift}
              className={`h-11 rounded-2xl px-5 text-sm font-black transition ${
                shiftStarted
                  ? "bg-zinc-200 text-zinc-500"
                  : "bg-[#1f2937] text-white hover:bg-black"
              }`}
            >
              תחילת משמרת
            </button>

            <button
              type="button"
              onClick={endShift}
              className="h-11 rounded-2xl border border-[#e7dac8] bg-white px-5 text-sm font-black text-[#6b5a45] transition hover:bg-[#fff8ed]"
            >
              סיום משמרת
            </button>

            <div
              className={`flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-black ${statusPillClass(
                currentStatus
              )}`}
            >
              <span>{STATUS_LABELS[currentStatus]}</span>
              <span className="font-mono text-base">
                {formatDuration(liveStatusSeconds)}
              </span>
            </div>

            <div className="flex h-11 items-center gap-2 rounded-2xl border border-[#e7dac8] bg-white px-4 text-xs font-bold text-[#6b5a45]">
              <span>משמרת:</span>
              <span className="font-mono text-sm font-black text-[#221b14]">
                {shiftStarted ? formatDuration(shiftSeconds) : "00:00:00"}
              </span>
            </div>

            <div
              className={`flex h-11 items-center rounded-2xl px-4 text-xs font-black ${
                canReceiveInbound
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {canReceiveInbound ? "מקבל שיחות נכנסות" : "לא מקבל נכנסות"}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-[#7a6a58]">
            <span>פנוי: {formatDuration(agent?.todayAvailableSeconds || 0)}</span>
            <span>שיחה: {formatDuration(agent?.todayTalkSeconds || 0)}</span>
            <span>הפסקה: {formatDuration(agent?.todayBreakSeconds || 0)}</span>
            <span>שיחות: {agent?.totalCallsToday || 0}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className="flex flex-1 flex-wrap items-center gap-2 rounded-2xl border border-[#e7dac8] bg-white p-3">
            <button
              type="button"
              onClick={setAvailable}
              className="h-11 rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              פנוי
            </button>

            <button
              type="button"
              onClick={setBusy}
              className="h-11 rounded-2xl bg-red-600 px-6 text-sm font-black text-white transition hover:bg-red-700"
            >
              לא פנוי
            </button>

            <select
              value={busyReason}
              onChange={(event) => setBusyReason(event.target.value as BusyReason)}
              className="h-11 min-w-[190px] rounded-2xl border border-[#e7dac8] bg-[#fbf8f3] px-4 text-sm font-bold text-[#221b14] outline-none focus:border-[#b9945a]"
            >
              {BUSY_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>

            <div className="hidden h-8 w-px bg-[#eadfce] xl:block" />

            <button
              type="button"
              onClick={openDialer}
              className="h-11 rounded-2xl border border-[#e7dac8] bg-[#fbf8f3] px-5 text-sm font-black text-[#221b14] transition hover:bg-[#fff8ed]"
            >
              הוצאת שיחה
            </button>

            <input
              dir="ltr"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(onlyDialChars(event.target.value))}
              onFocus={openDialer}
              placeholder="מספר לחיוג"
              className="h-11 w-[190px] rounded-2xl border border-[#e7dac8] bg-white px-4 text-left font-mono text-sm font-black text-[#221b14] outline-none focus:border-[#b9945a]"
            />

            <button
              type="button"
              onClick={startOutboundCall}
              className="h-11 rounded-2xl bg-[#221b14] px-5 text-sm font-black text-white transition hover:bg-black"
            >
              חיוג
            </button>

            <button
              type="button"
              onClick={simulateIncomingCall}
              className="h-11 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 transition hover:bg-blue-100"
            >
              נכנסת
            </button>

            <button
              type="button"
              onClick={markAnswered}
              className="h-11 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
            >
              ענה
            </button>

            <button
              type="button"
              onClick={finishCall}
              className="h-11 rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-black text-orange-700 transition hover:bg-orange-100"
            >
              סיים
            </button>
          </div>

          <div className="flex min-w-[270px] items-center justify-between rounded-2xl border border-[#e7dac8] bg-[#fbf8f3] px-4 py-3">
            <div>
              <p className="text-xs font-bold text-[#8b7b68]">שיחה פעילה</p>
              <p className="text-sm font-black text-[#221b14]">
                {getCallLabel(callDirection)}
              </p>
            </div>

            <p
              dir="ltr"
              className="max-w-[150px] truncate text-left font-mono text-lg font-black text-[#221b14]"
            >
              {activeDisplayNumber}
            </p>
          </div>
        </div>

        {showDialer && (
          <div className="flex flex-col gap-3 rounded-2xl border border-[#e7dac8] bg-[#fbf8f3] p-3 md:flex-row md:items-center">
            <div className="flex min-w-[240px] items-center gap-2">
              <span className="text-xs font-black text-[#8b7b68]">
                שורת חיוג
              </span>

              <input
                dir="ltr"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(onlyDialChars(event.target.value))}
                placeholder="0500000000"
                className="h-11 flex-1 rounded-2xl border border-[#e7dac8] bg-white px-4 text-left font-mono text-base font-black text-[#221b14] outline-none focus:border-[#b9945a]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {DIAL_KEYS.map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => appendDigit(digit)}
                  className="h-11 w-11 rounded-2xl border border-[#e7dac8] bg-white text-base font-black text-[#221b14] transition hover:bg-[#fff8ed]"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={removeLastDigit}
                className="h-11 rounded-2xl border border-[#e7dac8] bg-white px-4 text-xs font-black text-[#6b5a45] transition hover:bg-[#fff8ed]"
              >
                מחק
              </button>

              <button
                type="button"
                onClick={clearNumber}
                className="h-11 rounded-2xl border border-[#e7dac8] bg-white px-4 text-xs font-black text-[#6b5a45] transition hover:bg-[#fff8ed]"
              >
                נקה
              </button>

              <button
                type="button"
                onClick={startOutboundCall}
                className="h-11 rounded-2xl bg-[#221b14] px-6 text-xs font-black text-white transition hover:bg-black"
              >
                חייג עכשיו
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}