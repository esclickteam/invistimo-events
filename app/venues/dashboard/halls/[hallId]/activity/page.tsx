"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Activity, Loader2, RefreshCw } from "lucide-react";

type ActivityEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  meta: Record<string, unknown>;
  actorUserId: string;
  actorName: string;
  createdAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("he-IL");
  } catch {
    return value;
  }
}

export default function VenueActivityPage() {
  const params = useParams<{ hallId: string }>();
  const hallId = params?.hallId || "";

  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ limit: "80" });
      if (q.trim()) qs.set("q", q.trim());
      if (action.trim()) qs.set("action", action.trim());
      if (targetType.trim()) qs.set("targetType", targetType.trim());
      if (actor.trim()) qs.set("actorUserId", actor.trim());
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);

      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(
          hallId
        )}/activity?${qs.toString()}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "טעינה נכשלה");
      }
      setActivity(data.activity || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "טעינה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hallId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hallId]);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-7">
      <header className="mb-5 rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black text-[#9b8a73]">ניהול אולם › Activity Log</div>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black">
              <Activity className="text-[#b98121]" />
              Activity Log
            </h1>
            <p className="mt-2 text-sm font-bold text-[#7f705d]">
              יומן פעילות מהמערכת — {total} רשומות תואמות.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            רענון
          </button>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3 lg:grid-cols-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש חופשי"
            className="h-10 rounded-xl border border-[#eadfce] px-3 text-sm font-bold"
          />
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="action (למשל lead.)"
            className="h-10 rounded-xl border border-[#eadfce] px-3 text-sm font-bold"
          />
          <input
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            placeholder="entity (VenueLead...)"
            className="h-10 rounded-xl border border-[#eadfce] px-3 text-sm font-bold"
          />
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="actor userId"
            className="h-10 rounded-xl border border-[#eadfce] px-3 text-sm font-bold"
          />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 rounded-xl border border-[#eadfce] px-3 text-sm font-bold"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 rounded-xl border border-[#eadfce] px-3 text-sm font-bold"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="h-10 rounded-xl bg-[#b98121] px-4 text-sm font-black text-white"
          >
            סינון
          </button>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setAction("");
              setTargetType("");
              setActor("");
              setFrom("");
              setTo("");
              setTimeout(() => void load(), 0);
            }}
            className="h-10 rounded-xl border border-[#eadfce] px-4 text-sm font-black"
          >
            נקה
          </button>
        </div>
      </header>

      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-[28px] border border-[#eadfce] bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-[#8a7b68]">
            <Loader2 size={20} className="animate-spin text-[#b98121]" />
            טוען יומן...
          </div>
        ) : activity.length === 0 ? (
          <div className="py-16 text-center">
            <Activity size={40} className="mx-auto text-[#d5b36d]" />
            <p className="mt-3 text-sm font-black text-[#2b241c]">אין פעילות תואמת</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#f4ead9]">
            {activity.map((entry) => (
              <li key={entry.id} className="px-5 py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-black text-[#2b241c]">
                      {entry.action}
                    </div>
                    <div className="mt-1 text-xs font-bold text-[#8a7b68]">
                      {entry.targetType}
                      {entry.targetId ? ` · ${entry.targetId}` : ""}
                    </div>
                    {entry.actorName ? (
                      <div className="mt-1 text-xs font-bold text-[#9b8a73]">
                        {entry.actorName}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs font-bold text-[#9b8a73]">
                    {formatDate(entry.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
