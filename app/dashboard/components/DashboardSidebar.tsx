"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CheckCircle2,
  MessageCircle,
  Armchair,
  QrCode,
  Shield,
  BarChart3,
  Settings2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  userCanAccessCheckIn,
  userCanManageCheckIn,
} from "@/lib/checkIn/permissions";
import { hasGuestMessagesFeature } from "@/lib/features/entitlements";

export type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  invitationId?: string;
  eventId?: string;
  checkInEnabled?: boolean;
  canOpenEventManagement?: boolean;
  canOpenTransportationManagement?: boolean;
  canOpenWeddingChallenges?: boolean;
  gameOnly?: boolean;
  isDemo?: boolean;
};

type NavItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
  match?: (pathname: string) => boolean;
  hidden?: boolean;
};

const COLLAPSE_KEY = "invistimo.dashboard.sidebar.collapsed";

export function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    // ignore
  }
}

export default function DashboardSidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
  invitationId = "",
  eventId = "",
  checkInEnabled = false,
  canOpenEventManagement = false,
  gameOnly = false,
  isDemo = false,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const canMessages = !gameOnly;
  const canSeating = !gameOnly;
  const canCheckIn =
    !gameOnly &&
    checkInEnabled &&
    userCanAccessCheckIn(user as any);
  const canTeam = !gameOnly && (canOpenEventManagement || userCanManageCheckIn(user as any));
  const canReports = !gameOnly;
  const canSettings = !gameOnly && Boolean(invitationId);
  const canGuestMessages = hasGuestMessagesFeature(user) && !gameOnly;

  const items = useMemo<NavItem[]>(() => {
    const settingsHref = invitationId
      ? `/dashboard/invitations/${invitationId}/edit`
      : "/dashboard";

    const teamHref = eventId
      ? `/events/production?eventId=${eventId}&tab=overview`
      : "/events/production?tab=overview";

    return [
      {
        id: "dashboard",
        label: "דשבורד",
        icon: LayoutDashboard,
        href: gameOnly ? "/dashboard/wedding-challenges" : "/dashboard",
        match: (p) =>
          p === "/dashboard" || p === "/try/dashboard" || p === "/dashboard/",
      },
      {
        id: "guests",
        label: "רשימת מוזמנים",
        icon: Users,
        href: "/dashboard#guests",
        match: (p) => p === "/dashboard" || p === "/try/dashboard",
        hidden: gameOnly,
      },
      {
        id: "rsvp",
        label: "אישורי הגעה",
        icon: CheckCircle2,
        href: "/dashboard#rsvp-stats",
        match: (p) => p === "/dashboard" || p === "/try/dashboard",
        hidden: gameOnly,
      },
      {
        id: "messages",
        label: "שליחת הודעות",
        icon: MessageCircle,
        href: "/dashboard/messages/new",
        match: (p) => p.startsWith("/dashboard/messages"),
        hidden: !canMessages,
      },
      {
        id: "seating",
        label: "סידורי הושבה",
        icon: Armchair,
        href: isDemo ? "/try/dashboard/seating" : "/dashboard/seating",
        match: (p) => p.includes("/dashboard/seating"),
        hidden: !canSeating,
      },
      {
        id: "checkin",
        label: "כניסה לאירוע",
        icon: QrCode,
        href: "/dashboard/check-in",
        match: (p) => p.startsWith("/dashboard/check-in"),
        hidden: !canCheckIn,
      },
      {
        id: "team",
        label: "צוות והרשאות",
        icon: Shield,
        href: teamHref,
        match: (p) => p.startsWith("/events/production"),
        hidden: !canTeam,
      },
      {
        id: "reports",
        label: "דוחות",
        icon: BarChart3,
        href: "/dashboard/reports",
        match: (p) => p.startsWith("/dashboard/reports"),
        hidden: !canReports,
      },
      {
        id: "settings",
        label: "הגדרות האירוע",
        icon: Settings2,
        href: settingsHref,
        match: (p) =>
          p.includes("/invitations/") && p.endsWith("/edit"),
        hidden: !canSettings,
      },
    ].filter((item) => !item.hidden);
  }, [
    invitationId,
    eventId,
    gameOnly,
    isDemo,
    canMessages,
    canSeating,
    canCheckIn,
    canTeam,
    canReports,
    canSettings,
  ]);

  const go = (href: string) => {
    onClose();
    if (href.includes("#")) {
      const [path, hash] = href.split("#");
      if (pathname === path || pathname === `${path}/`) {
        const el = document.getElementById(hash);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    router.push(href);
  };

  const nav = (
    <nav className="flex h-full flex-col">
      <div
        className={`flex items-center border-b border-[#EADBC4] px-3 py-4 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!collapsed && (
          <div>
            <p className="text-[11px] font-black tracking-[0.14em] text-[#B88A2D]">
              INVISTIMO
            </p>
            <p className="mt-0.5 text-sm font-black text-[#3F3328]">ניווט</p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="hidden h-9 w-9 items-center justify-center rounded-full border border-[#E3D6C3] bg-white text-[#5A4635] transition hover:bg-[#F8EEDB] lg:inline-flex"
          aria-label={collapsed ? "הרחב תפריט" : "כווץ תפריט"}
        >
          {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E3D6C3] bg-white text-[#5A4635] lg:hidden"
          aria-label="סגור תפריט"
        >
          <X size={18} />
        </button>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match
            ? item.match(pathname)
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => go(item.href)}
                title={item.label}
                className={`
                  flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-bold transition
                  ${collapsed ? "justify-center" : "justify-start"}
                  ${
                    active
                      ? "bg-[#F3E7D4] text-[#8B5E34] shadow-sm ring-1 ring-[#E3C896]"
                      : "text-[#5A4635] hover:bg-[#FBF7F0]"
                  }
                `}
              >
                <Icon
                  size={18}
                  className={active ? "text-[#B88A2D]" : "text-[#8A7A68]"}
                />
                {!collapsed && <span>{item.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {canGuestMessages && !collapsed && (
        <div className="border-t border-[#EADBC4] px-3 py-3">
          <button
            type="button"
            onClick={() => go("/dashboard/guest-messages")}
            className="w-full rounded-[14px] border border-[#EADBC4] bg-[#FFFDF8] px-3 py-2 text-right text-xs font-bold text-[#5A4635] transition hover:bg-[#F8EEDB]"
          >
            הודעות מהאורחים
          </button>
        </div>
      )}
    </nav>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={`
          fixed bottom-0 top-16 z-30 hidden border-l border-[#EADBC4] bg-[#FFFDF8]
          transition-[width] duration-200 lg:flex
          ${collapsed ? "w-[72px]" : "w-[240px]"}
        `}
        style={{ right: 0 }}
        aria-label="תפריט דשבורד"
      >
        {nav}
      </aside>

      {/* Mobile / tablet drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" dir="rtl">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="סגור תפריט"
            onClick={onClose}
          />
          <aside
            className="absolute bottom-0 top-0 w-[min(86vw,300px)] border-l border-[#EADBC4] bg-[#FFFDF8] shadow-2xl"
            style={{ right: 0 }}
          >
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
