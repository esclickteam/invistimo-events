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
  after_call: "אחרי שיחה",
  break: "בהפסקה",
  unavailable: "לא זמין",
  offline: "מנותק",
};

const STATUS_CLASSES: Record<AgentStatus, string> = {
  available: "bg-green-50 text-green-700 border-green-200",
  dialing: "bg-blue-50 text-blue-700 border-blue-200",
  ringing: "bg-indigo-50 text-indigo-700 border-indigo-200",
  in_call: "bg-red-50 text-red-700 border-red-200",
  after_call: "bg-orange-50 text-orange-700 border-orange-200",
  break: "bg-yellow-50 text-yellow-700 border-yellow-200",
  unavailable: "bg-gray-100 text-gray-700 border-gray-200",
  offline: "bg-[#f4eee7] text-[#6b5a45] border-[#eadfce]",
};

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

export default function SoftphoneStatusPanel() {
  const [agent, setAgent] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<AgentStatus | null>(null);
  const [tick, setTick] = useState(0);

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
        headers: { "Content-Type": "application/json" },
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

  const liveStatusSeconds = useMemo(() => {
    tick;
    return secondsSince(agent?.statusStartedAt);
  }, [agent?.statusStartedAt, tick]);

  const status = agent?.status || "offline";

  if (loading) {
    return (
      <section className="rounded-[32px] border border-[#eadfce] bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-[#6b5a45]">טוען סטטוס עובד...</p>
      </section>
    );
  }

  return (
    <section className="rounded-[32px] border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black tracking-[0.16em] text-[#9b7a3c]">
            SOFTPHONE STATUS
          </p>

          <h2 className="mt-2 text-2xl font-black text-[#2f251d]">
            סטטוס עבודה ושיחות
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#7a6a58]">
            כאן העובד מעדכן אם הוא פנוי, בשיחה, בהפסקה או לא זמין.
            הטיימר רץ חי לפי שניות, דקות ושעות.
          </p>
        </div>

        <div
          className={`rounded-3xl border px-5 py-4 text-center ${STATUS_CLASSES[status]}`}
        >
          <p className="text-xs font-black">סטטוס נוכחי</p>
          <p className="mt-1 text-2xl font-black">{STATUS_LABELS[status]}</p>
          <p className="mt-2 font-mono text-3xl font-black">
            {formatDuration(liveStatusSeconds)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatusButton
          label="פנוי"
          active={status === "available"}
          loading={savingStatus === "available"}
          onClick={() => changeStatus("available")}
        />

        <StatusButton
          label="הפסקה"
          active={status === "break"}
          loading={savingStatus === "break"}
          onClick={() => changeStatus("break")}
        />

        <StatusButton
          label="לא זמין"
          active={status === "unavailable"}
          loading={savingStatus === "unavailable"}
          onClick={() => changeStatus("unavailable")}
        />

        <StatusButton
          label="מנותק"
          active={status === "offline"}
          loading={savingStatus === "offline"}
          onClick={() => changeStatus("offline")}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="זמן פנוי היום"
          value={formatDuration(agent?.todayAvailableSeconds || 0)}
        />

        <MetricCard
          label="זמן בשיחה היום"
          value={formatDuration(agent?.todayTalkSeconds || 0)}
        />

        <MetricCard
          label="זמן הפסקה היום"
          value={formatDuration(agent?.todayBreakSeconds || 0)}
        />

        <MetricCard
          label="זמן לא זמין היום"
          value={formatDuration(agent?.todayUnavailableSeconds || 0)}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="שיחות היום"
          value={String(agent?.totalCallsToday || 0)}
        />

        <MetricCard
          label="נענו"
          value={String(agent?.answeredCallsToday || 0)}
        />

        <MetricCard
          label="לא נענו"
          value={String(agent?.missedCallsToday || 0)}
        />

        <MetricCard
          label="נכשלו"
          value={String(agent?.failedCallsToday || 0)}
        />
      </div>
    </section>
  );
}

function StatusButton({
  label,
  active,
  loading,
  onClick,
}: {
  label: string;
  active: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`h-14 rounded-2xl border text-sm font-black transition disabled:opacity-60 ${
        active
          ? "border-[#2f251d] bg-[#2f251d] text-white"
          : "border-[#eadfce] bg-[#fffdf9] text-[#6b5a45] hover:bg-[#fff8ed]"
      }`}
    >
      {loading ? "מעדכן..." : label}
    </button>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#eadfce] bg-[#fffdf9] p-4">
      <p className="text-xs font-bold text-[#8b7b68]">{label}</p>
      <p className="mt-2 font-mono text-2xl font-black text-[#2f251d]">
        {value}
      </p>
    </div>
  );
}