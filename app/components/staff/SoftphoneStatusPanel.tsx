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
  break: "בהפסקה",
  unavailable: "לא זמין",
  offline: "מנותק",
};

const STATUS_STYLES: Record<AgentStatus, string> = {
  available: "border-green-200 bg-green-50 text-green-700",
  dialing: "border-blue-200 bg-blue-50 text-blue-700",
  ringing: "border-indigo-200 bg-indigo-50 text-indigo-700",
  in_call: "border-red-200 bg-red-50 text-red-700",
  after_call: "border-orange-200 bg-orange-50 text-orange-700",
  break: "border-yellow-200 bg-yellow-50 text-yellow-700",
  unavailable: "border-gray-200 bg-gray-100 text-gray-700",
  offline: "border-[#eadfce] bg-[#f4eee7] text-[#6b5a45]",
};

const NOT_AVAILABLE_OPTIONS: { value: AgentStatus; label: string }[] = [
  { value: "break", label: "הפסקה" },
  { value: "after_call", label: "טיפול אחרי שיחה" },
  { value: "unavailable", label: "לא זמין" },
  { value: "offline", label: "מנותק" },
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
  return value.replace(/[^\d*#]/g, "");
}

function getDirectionLabel(direction: CallDirection) {
  if (direction === "outbound") return "שיחה יוצאת";
  if (direction === "inbound") return "שיחה נכנסת";
  return "אין שיחה פעילה";
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
  const [notAvailableReason, setNotAvailableReason] =
    useState<AgentStatus>("break");

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

  async function changeStatus(nextStatus: AgentStatus) {
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

  async function setNotAvailable() {
    setCallDirection("none");
    setActiveCallNumber("");
    await changeStatus(notAvailableReason);
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
    await changeStatus("after_call");
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

  const activeDisplayNumber =
    activeCallNumber || phoneNumber || "לא נבחר מספר";

  const isCallFlow =
    currentStatus === "dialing" ||
    currentStatus === "ringing" ||
    currentStatus === "in_call" ||
    currentStatus === "after_call";

  if (loading) {
    return (
      <section className="rounded-[28px] border border-[#eadfce] bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-[#6b5a45]">טוען סופטפון...</p>
      </section>
    );
  }

  return (
    <section className="rounded-[30px] border border-[#eadfce] bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black tracking-[0.18em] text-[#9b7a3c]">
            LIVE SOFTPHONE
          </p>

          <h2 className="mt-1 text-xl font-black text-[#2f251d]">
            סופטפון אישי
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#7a6a58]">
          <span>זמן פנוי היום: {formatDuration(agent?.todayAvailableSeconds || 0)}</span>
          <span className="text-[#d5c3ad]">|</span>
          <span>זמן שיחה היום: {formatDuration(agent?.todayTalkSeconds || 0)}</span>
          <span className="text-[#d5c3ad]">|</span>
          <span>הפסקה: {formatDuration(agent?.todayBreakSeconds || 0)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[145px_220px_250px_1fr_190px_170px]">
        <div
          className={`flex min-h-[86px] flex-col justify-center rounded-2xl border px-4 py-3 ${STATUS_STYLES[currentStatus]}`}
        >
          <p className="text-xs font-black">סטטוס</p>
          <p className="mt-1 text-lg font-black">{STATUS_LABELS[currentStatus]}</p>
          <p className="mt-1 font-mono text-2xl font-black">
            {formatDuration(liveStatusSeconds)}
          </p>
        </div>

        <div className="flex min-h-[86px] flex-col justify-center rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 py-3">
          <p className="text-xs font-bold text-[#8b7b68]">שיחה</p>

          <p className="mt-1 text-sm font-black text-[#2f251d]">
            {getDirectionLabel(callDirection)}
          </p>

          <p dir="ltr" className="mt-1 truncate text-left font-mono text-lg font-black text-[#2f251d]">
            {activeDisplayNumber}
          </p>
        </div>

        <div className="flex min-h-[86px] flex-col justify-center rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 py-3">
          <p className="text-xs font-bold text-[#8b7b68]">מספר לחיוג / נכנסת</p>

          <input
            dir="ltr"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(onlyDialChars(event.target.value))}
            placeholder="0500000000"
            className="mt-2 h-10 rounded-xl border border-[#eadfce] bg-white px-3 text-left font-mono text-base font-black text-[#2f251d] outline-none focus:border-[#c7a76c]"
          />
        </div>

        <div className="flex min-h-[86px] flex-col justify-center rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 py-3">
          <p className="text-xs font-bold text-[#8b7b68]">פעולות שיחה</p>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={startOutboundCall}
              disabled={savingStatus === "dialing"}
              className="h-10 rounded-xl bg-green-600 px-4 text-xs font-black text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              {savingStatus === "dialing" ? "מחייג..." : "הוצא שיחה"}
            </button>

            <button
              onClick={simulateIncomingCall}
              disabled={savingStatus === "ringing"}
              className="h-10 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
            >
              שיחה נכנסת
            </button>

            <button
              onClick={markRinging}
              disabled={savingStatus === "ringing"}
              className="h-10 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
            >
              מצלצל
            </button>

            <button
              onClick={markAnswered}
              disabled={savingStatus === "in_call"}
              className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              ענה
            </button>

            <button
              onClick={finishCall}
              disabled={savingStatus === "after_call"}
              className="h-10 rounded-xl border border-orange-200 bg-orange-50 px-4 text-xs font-black text-orange-700 transition hover:bg-orange-100 disabled:opacity-60"
            >
              סיום → טיפול
            </button>
          </div>
        </div>

        <div className="flex min-h-[86px] flex-col justify-center rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 py-3">
          <p className="text-xs font-bold text-[#8b7b68]">זמינות</p>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={setAvailable}
              disabled={savingStatus === "available"}
              className="h-10 rounded-xl bg-green-600 px-3 text-xs font-black text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              פנוי
            </button>

            <button
              onClick={setNotAvailable}
              disabled={savingStatus === notAvailableReason}
              className="h-10 rounded-xl bg-[#2f251d] px-3 text-xs font-black text-white transition hover:bg-[#1f1812] disabled:opacity-60"
            >
              לא פנוי
            </button>
          </div>

          <select
            value={notAvailableReason}
            onChange={(event) =>
              setNotAvailableReason(event.target.value as AgentStatus)
            }
            className="mt-2 h-9 rounded-xl border border-[#eadfce] bg-white px-3 text-xs font-bold text-[#4b3b2a] outline-none focus:border-[#c7a76c]"
          >
            {NOT_AVAILABLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-h-[86px] flex-col justify-center rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 py-3">
          <p className="text-xs font-bold text-[#8b7b68]">כלים</p>

          <button
            onClick={() => setShowDialPad((prev) => !prev)}
            className="mt-2 h-10 rounded-xl border border-[#eadfce] bg-white px-3 text-xs font-black text-[#6b5a45] transition hover:bg-[#fff8ed]"
          >
            {showDialPad ? "סגור לוח מקשים" : "פתח לוח מקשים"}
          </button>

          {isCallFlow && (
            <button
              onClick={setAvailable}
              className="mt-2 h-10 rounded-xl border border-[#eadfce] bg-white px-3 text-xs font-black text-[#6b5a45] transition hover:bg-[#fff8ed]"
            >
              חזור לפנוי
            </button>
          )}
        </div>
      </div>

      {showDialPad && (
        <div className="mt-3 rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black text-[#2f251d]">לוח מקשים</p>

            <div className="flex gap-2">
              <button
                onClick={removeLastDigit}
                className="rounded-xl border border-[#eadfce] bg-white px-4 py-2 text-xs font-black text-[#6b5a45] hover:bg-[#fff8ed]"
              >
                מחק
              </button>

              <button
                onClick={clearNumber}
                className="rounded-xl border border-[#eadfce] bg-white px-4 py-2 text-xs font-black text-[#6b5a45] hover:bg-[#fff8ed]"
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
                className="h-14 rounded-2xl border border-[#eadfce] bg-white text-xl font-black text-[#2f251d] transition hover:bg-[#fff8ed]"
              >
                {digit}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniMetric
          label="שיחות היום"
          value={String(agent?.totalCallsToday || 0)}
        />
        <MiniMetric
          label="נענו"
          value={String(agent?.answeredCallsToday || 0)}
        />
        <MiniMetric
          label="לא נענו"
          value={String(agent?.missedCallsToday || 0)}
        />
        <MiniMetric
          label="נכשלו"
          value={String(agent?.failedCallsToday || 0)}
        />
      </div>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 py-3">
      <p className="text-xs font-bold text-[#8b7b68]">{label}</p>
      <p className="mt-1 font-mono text-xl font-black text-[#2f251d]">
        {value}
      </p>
    </div>
  );
}