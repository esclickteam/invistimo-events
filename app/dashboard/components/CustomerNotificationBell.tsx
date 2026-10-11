"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";

type CustomerNotification = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "important" | "urgent";
  actionHref: string;
  read: boolean;
  createdAt: string;
};

type Payload = {
  success?: boolean;
  showBell?: boolean;
  unreadCount?: number;
  notifications?: CustomerNotification[];
};

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export default function CustomerNotificationBell({
  enabled = true,
  panelAlign = "left",
}: {
  enabled?: boolean;
  panelAlign?: "left" | "right";
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/customer-notifications", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as Payload | null;
      if (!res.ok || !data?.success) return;
      setShowBell(Boolean(data.showBell));
      setUnreadCount(Number(data.unreadCount || 0));
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      // Keep the last known badge if the network blips.
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/customer-notifications/sync", {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.json().catch(() => null))
      .then((data: Payload | null) => {
        if (cancelled || !data?.success) return;
        setShowBell(Boolean(data.showBell));
        if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) load();
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled || !showBell) return;
    const timer = window.setInterval(load, 20000);
    const onFocus = () => load();
    const onCustom = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("invistimo:customer-notifications", onCustom);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("invistimo:customer-notifications", onCustom);
    };
  }, [enabled, showBell, load]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const markRead = async (id?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/customer-notifications/read", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : { all: true }),
      });
      const data = (await res.json().catch(() => null)) as Payload | null;
      if (data?.success && typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
      await load();
    } finally {
      setLoading(false);
    }
  };

  if (!enabled || !showBell) return null;

  return (
    <div ref={panelRef} className="relative" dir="rtl">
      <button
        type="button"
        aria-label="התראות"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#D7BE88] bg-white text-[#3F3328] shadow-sm transition hover:bg-[#F8EEDB]"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -left-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#9C3B2E] px-1 text-[10px] font-black text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={`fixed inset-x-3 top-24 z-[80] overflow-hidden rounded-[22px] border border-[#E7D3B4] bg-[#FFFDF8] text-right shadow-[0_18px_50px_rgba(80,50,20,0.18)] sm:absolute sm:inset-x-auto sm:top-[calc(100%+10px)] sm:w-[min(92vw,380px)] ${
            panelAlign === "right" ? "sm:right-0 sm:left-auto" : "sm:left-0"
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#F0E4D4] px-4 py-3">
            <div>
              <p className="text-sm font-black text-[#3F3328]">התראות</p>
              <p className="text-[11px] font-bold text-[#8A7867]">
                {unreadCount > 0 ? `${unreadCount} שלא נקראו` : "אין התראות חדשות"}
              </p>
            </div>
            <button
              type="button"
              disabled={loading || unreadCount === 0}
              onClick={() => markRead()}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black text-[#8B5E34] disabled:opacity-40"
            >
              <CheckCheck size={14} />
              סמן הכל כנקרא
            </button>
          </div>

          <div className="max-h-[min(70vh,440px)] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm font-bold text-[#8A7867]">
                אין התראות פעילות
              </p>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`border-b border-[#F6EEE4] px-4 py-3 ${
                    item.severity === "urgent" ? "bg-[#FFF6F3]" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={async () => {
                      if (!item.read) await markRead(item.id);
                      setOpen(false);
                      if (item.actionHref) router.push(item.actionHref);
                    }}
                    className="block w-full text-right"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-black text-[#3F3328]">{item.title}</p>
                      {item.severity === "urgent" ? (
                        <span className="shrink-0 rounded-full bg-[#9C3B2E] px-2 py-0.5 text-[10px] font-black text-white">
                          דחוף
                        </span>
                      ) : item.severity === "important" ? (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#C5923A]" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#6F5C49]">
                      {item.body}
                    </p>
                    <p className="mt-2 text-[11px] font-bold text-[#9A8773]">
                      {formatWhen(item.createdAt)}
                      {" · "}
                      {item.read ? "נקראה" : "לא נקראה"}
                    </p>
                  </button>
                  {!item.read ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => markRead(item.id)}
                      className="mt-2 text-[11px] font-black text-[#8B5E34]"
                    >
                      סמן כנקראה
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
