"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, X } from "lucide-react";
import { placeNotificationPanel, type PanelPlacement } from "@/lib/customerNotifications/planners";

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

function severityLabel(severity: CustomerNotification["severity"]) {
  if (severity === "urgent") return "דחופה";
  if (severity === "important") return "חשובה";
  return "רגילה";
}

export default function CustomerNotificationBell({
  enabled = true,
  panelAlign: _panelAlign = "left",
  source = "customer",
}: {
  enabled?: boolean;
  panelAlign?: "left" | "right";
  source?: "customer" | "admin";
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [showBell, setShowBell] = useState(enabled);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [placement, setPlacement] = useState<PanelPlacement | null>(null);
  const listEndpoint = source === "admin" ? "/api/admin/notifications" : "/api/customer-notifications";
  const readEndpoint = source === "admin" ? "/api/admin/notifications/read" : "/api/customer-notifications/read";
  const settingsHref = source === "admin" ? "/admin/notification-settings" : "/dashboard/notifications";

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(listEndpoint, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as Payload | null;
      if (res.status === 401) {
        setShowBell(false);
        return;
      }
      if (!res.ok || !data?.success) return;
      setShowBell(data.showBell !== false);
      setUnreadCount(Number(data.unreadCount || 0));
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      // Keep the last known badge if the network blips.
    }
  }, [enabled, listEndpoint]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const start = source === "customer"
      ? fetch("/api/customer-notifications/sync", {
          method: "POST",
          credentials: "include",
        })
          .then((res) => res.json().catch(() => null))
          .then((data: Payload | null) => {
            if (cancelled || !data?.success) return;
            setShowBell(data.showBell !== false);
            if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
          })
          .catch(() => {})
      : Promise.resolve();
    start.finally(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, load, source]);

  useEffect(() => {
    if (!enabled || !showBell) return;
    const tick = () => {
      if (document.visibilityState === "hidden") return;
      load();
    };
    const timer = window.setInterval(tick, 8000);
    const onFocus = () => load();
    const onCustom = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onFocus);
    window.addEventListener("invistimo:customer-notifications", onCustom);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("invistimo:customer-notifications", onCustom);
    };
  }, [enabled, showBell, load]);

  const measure = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPlacement(
      placeNotificationPanel({
        anchorTop: rect.top,
        anchorBottom: rect.bottom,
        anchorLeft: rect.left,
        anchorRight: rect.right,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      })
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    measure();
    const onLayout = () => measure();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markRead = async (id?: string) => {
    setLoading(true);
    try {
      const res = await fetch(readEndpoint, {
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

  const unread = notifications.filter((item) => !item.read);
  const read = notifications.filter((item) => item.read);

  const renderItem = (item: CustomerNotification) => (
    <div
      key={item.id}
      className={`border-b border-[#F0E4D4] px-4 py-3 ${
        item.read ? "bg-white" : item.severity === "urgent" ? "bg-[#FFF6F3]" : "bg-[#FFF8EF]"
      }`}
    >
      <button
        type="button"
        onClick={async () => {
          if (!item.read) await markRead(item.id);
          setOpen(false);
          if (item.actionHref) router.push(item.actionHref);
        }}
        className="block w-full min-w-0 text-right"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 break-words text-sm font-black leading-5 text-[#3F3328]">
            {item.title}
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
              item.severity === "urgent"
                ? "bg-[#9C3B2E] text-white"
                : item.severity === "important"
                  ? "bg-[#F3E2C2] text-[#8B5E34]"
                  : "bg-[#F4EFE8] text-[#8A7867]"
            }`}
          >
            {severityLabel(item.severity)}
          </span>
        </div>
        <p className="mt-1 break-words text-xs font-semibold leading-5 text-[#6F5C49]">
          {item.body}
        </p>
        <p className="mt-2 text-[11px] font-bold text-[#9A8773]">
          {formatWhen(item.createdAt)}
          {" · "}
          {item.read ? "נקראה" : "לא נקראה"}
        </p>
      </button>
    </div>
  );

  const panel =
    open && placement && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="התראות"
            dir="rtl"
            className="flex flex-col overflow-hidden rounded-[22px] border border-[#E7D3B4] bg-[#FFFDF8] text-right shadow-[0_18px_50px_rgba(80,50,20,0.18)]"
            style={{
              position: "fixed",
              left: placement.left,
              width: placement.width,
              maxHeight: placement.maxHeight,
              top: placement.top,
              bottom: placement.bottom,
              zIndex: 10050,
            }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#F0E4D4] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-[#3F3328]">התראות</p>
                <p className="text-[11px] font-bold text-[#8A7867]">
                  {unreadCount > 0 ? `${unreadCount} שלא נקראו` : "אין התראות חדשות"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={loading || unreadCount === 0}
                  onClick={() => markRead()}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black text-[#8B5E34] disabled:opacity-40"
                >
                  <CheckCheck size={14} />
                  סמן הכול כנקרא
                </button>
                <button
                  type="button"
                  aria-label="סגירת התראות"
                  onClick={() => {
                    setOpen(false);
                    buttonRef.current?.focus();
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6F5C49] hover:bg-[#F8EEDB]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm font-bold text-[#8A7867]">
                  אין התראות פעילות
                </p>
              ) : (
                <>
                  {unread.length > 0 ? (
                    <div>
                      <p className="bg-[#F8EEDB] px-4 py-2 text-[11px] font-black text-[#8B5E34]">
                        חדשות
                      </p>
                      {unread.map(renderItem)}
                    </div>
                  ) : null}
                  {read.length > 0 ? (
                    <div>
                      <p className="bg-[#F7F1E8] px-4 py-2 text-[11px] font-black text-[#8A7867]">
                        שנקראו
                      </p>
                      {read.map(renderItem)}
                    </div>
                  ) : null}
                </>
              )}
            </div>
            <div className="border-t border-[#F0E4D4] px-4 py-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(settingsHref);
                }}
                className="text-[12px] font-black text-[#8B5E34]"
              >
                העדפות התראות
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className="relative" dir="rtl">
      <button
        ref={buttonRef}
        type="button"
        aria-label="התראות"
        aria-haspopup="dialog"
        aria-expanded={open}
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
      {panel}
    </div>
  );
}
