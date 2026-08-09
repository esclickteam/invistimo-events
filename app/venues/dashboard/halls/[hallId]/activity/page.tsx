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

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/activity?limit=50`,
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
    if (hallId) load();
  }, [hallId]);

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-6 md:px-7">
      <header className="mb-5 rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black text-[#9b8a73]">ניהול אולם › Activity Log</div>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black">
              <Activity className="text-[#b98121]" />
              Activity Log
            </h1>
            <p className="mt-2 text-sm font-bold text-[#7f705d]">
              יומן פעילות מהמערכת — {total} רשומות.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            רענון
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
            <p className="mt-3 text-sm font-black text-[#2b241c]">אין פעילות עדיין</p>
            <p className="mt-1 text-xs font-bold text-[#8a7b68]">
              פעולות במערכת יופיעו כאן אוטומטית.
            </p>
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
                        על ידי {entry.actorName}
                      </div>
                    ) : null}
                  </div>
                  <time className="text-xs font-bold text-[#9b8a73] shrink-0">
                    {formatDate(entry.createdAt)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
