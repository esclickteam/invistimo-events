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

type AgentRow = {
  agentId: string;
  name?: string;
  email?: string;
  phone?: string;

  status: AgentStatus;
  statusStartedAt?: string | null;

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

  lastSeenAt?: string | null;
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

export default function SoftphoneAgentsMonitor() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    loadAgents();

    const refreshInterval = window.setInterval(() => {
      loadAgents();
    }, 15000);

    return () => window.clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  async function loadAgents() {
    try {
      const res = await fetch("/api/staff/softphone/agents", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "LOAD_AGENTS_FAILED");
      }

      setAgents(Array.isArray(data.agents) ? data.agents : []);
    } catch (err) {
      console.error("LOAD SOFTPHONE AGENTS FAILED:", err);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    return {
      total: agents.length,
      available: agents.filter((item) => item.status === "available").length,
      inCall: agents.filter((item) => item.status === "in_call").length,
      break: agents.filter((item) => item.status === "break").length,
      unavailable: agents.filter((item) => item.status === "unavailable").length,
    };
  }, [agents]);

  return (
    <section className="rounded-[32px] border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black tracking-[0.16em] text-[#9b7a3c]">
            LIVE AGENTS
          </p>

          <h2 className="mt-2 text-2xl font-black text-[#2f251d]">
            מעקב עובדי סופטפון
          </h2>

          <p className="mt-1 text-sm text-[#8b7b68]">
            צפייה בזמן אמת מי פנוי, מי בשיחה, מי בהפסקה ומי לא זמין.
          </p>
        </div>

        <button
          onClick={loadAgents}
          className="h-11 rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-5 text-sm font-black text-[#6b5a45] hover:bg-[#fff8ed]"
        >
          רענן
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <MiniStat label="סה״כ" value={stats.total} />
        <MiniStat label="פנויים" value={stats.available} />
        <MiniStat label="בשיחה" value={stats.inCall} />
        <MiniStat label="בהפסקה" value={stats.break} />
        <MiniStat label="לא זמינים" value={stats.unavailable} />
      </div>

      {loading ? (
        <div className="rounded-3xl border border-[#eadfce] bg-[#fffdf9] p-6 text-center text-sm font-bold text-[#6b5a45]">
          טוען עובדים...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[#eadfce]">
          <table className="w-full min-w-[980px] border-collapse text-right">
            <thead>
              <tr className="border-b border-[#eadfce] bg-[#fff8ed] text-xs font-black text-[#6b5a45]">
                <th className="p-4">עובד</th>
                <th className="p-4">סטטוס</th>
                <th className="p-4">זמן בסטטוס</th>
                <th className="p-4">זמן שיחה היום</th>
                <th className="p-4">זמן פנוי היום</th>
                <th className="p-4">זמן הפסקה היום</th>
                <th className="p-4">שיחות היום</th>
                <th className="p-4">נראה לאחרונה</th>
              </tr>
            </thead>

            <tbody>
              {agents.map((agent) => {
                const liveSeconds = secondsSince(agent.statusStartedAt);
                tick;

                return (
                  <tr
                    key={agent.agentId}
                    className="border-b border-[#f0e5d6] text-sm last:border-b-0 hover:bg-[#fffaf3]"
                  >
                    <td className="p-4">
                      <p className="font-black text-[#2f251d]">
                        {agent.name || "ללא שם"}
                      </p>
                      <p className="mt-1 text-xs text-[#8b7b68]">
                        {agent.email || "-"}
                      </p>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                          STATUS_CLASSES[agent.status]
                        }`}
                      >
                        {STATUS_LABELS[agent.status]}
                      </span>
                    </td>

                    <td className="p-4 font-mono text-lg font-black text-[#2f251d]">
                      {formatDuration(liveSeconds)}
                    </td>

                    <td className="p-4 font-mono text-[#6b5a45]">
                      {formatDuration(agent.todayTalkSeconds)}
                    </td>

                    <td className="p-4 font-mono text-[#6b5a45]">
                      {formatDuration(agent.todayAvailableSeconds)}
                    </td>

                    <td className="p-4 font-mono text-[#6b5a45]">
                      {formatDuration(agent.todayBreakSeconds)}
                    </td>

                    <td className="p-4 text-[#6b5a45]">
                      {agent.totalCallsToday || 0}
                    </td>

                    <td className="p-4 text-xs text-[#8b7b68]">
                      {agent.lastSeenAt
                        ? new Date(agent.lastSeenAt).toLocaleTimeString("he-IL")
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {agents.length === 0 && (
            <div className="p-8 text-center text-sm text-[#8b7b68]">
              אין עדיין עובדים כלליים של Invistimo.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-[#eadfce] bg-[#fffdf9] p-4">
      <p className="text-xs font-bold text-[#8b7b68]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#2f251d]">{value}</p>
    </div>
  );
}