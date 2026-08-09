"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";

type AlertRow = {
  id: string;
  title: string;
  description: string;
  tone: "amber" | "rose" | "violet" | "emerald";
  type: string;
  read: boolean;
  createdAt: string | null;
};

const toneClasses: Record<AlertRow["tone"], string> = {
  amber: "border-amber-200 bg-amber-50",
  rose: "border-rose-200 bg-rose-50",
  violet: "border-violet-200 bg-violet-50",
  emerald: "border-emerald-200 bg-emerald-50",
};

function formatWhen(value: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("he-IL");
  } catch {
    return value;
  }
}

export default function VenueHallAlerts({ hallId }: { hallId: string }) {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/alerts?unreadOnly=1&limit=8`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (res.ok && data?.success) {
        setAlerts(data.alerts || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [hallId]);

  useEffect(() => {
    if (hallId) load();
  }, [hallId, load]);

  const markRead = async (alertId: string) => {
    try {
      await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/alerts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "markRead", alertId }),
        }
      );
      setAlerts((current) => current.filter((a) => a.id !== alertId));
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm font-bold text-[#8a7b68]">
        <Loader2 size={18} className="animate-spin text-[#b98121]" />
        טוען התראות...
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#d8bd83] bg-[#fffdf8] p-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
          <Bell size={24} />
        </div>
        <div className="mt-3 text-sm font-black text-[#2b241c]">אין התראות פתוחות</div>
        <p className="mx-auto mt-1 max-w-xs text-xs font-bold leading-5 text-[#8a7b68]">
          התראות על לידים חדשים, המרות ועדכונים יופיעו כאן.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={[
            "rounded-2xl border p-3",
            toneClasses[alert.tone] || toneClasses.amber,
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-[#2b241c]">{alert.title}</div>
              {alert.description ? (
                <div className="mt-1 text-xs font-bold leading-5 text-[#7f705d]">
                  {alert.description}
                </div>
              ) : null}
              {alert.createdAt ? (
                <div className="mt-1 text-[11px] font-bold text-[#9b8a73]">
                  {formatWhen(alert.createdAt)}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => markRead(alert.id)}
              className="shrink-0 rounded-xl border border-white/60 bg-white/70 px-2.5 py-1 text-[11px] font-black text-[#6f6252] transition hover:bg-white"
            >
              סימון כנקרא
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
