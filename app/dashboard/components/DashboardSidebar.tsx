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
  CalendarDays,
  Mail,
  FileSpreadsheet,
  Phone,
  Sparkles,
  Heart,
  Gift,
  ClipboardList,
  Bus,
  WandSparkles,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { userCanAccessCheckIn } from "@/lib/checkIn/permissions";
import {
  hasGuestMessagesFeature,
  hasWeddingWebsiteFeature,
} from "@/lib/features/entitlements";
import { getGuestInvitationUrl } from "@/lib/guestInviteUrl";
import { isPersonalRsvpSite } from "@/types/rsvpSite";

export type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  invitationId?: string;
  invitationShareId?: string;
  rsvpSiteMode?: unknown;
  guestExperienceType?: unknown;
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
  href?: string;
  hash?: string;
  query?: string;
  external?: boolean;
  hidden?: boolean;
  badge?: number;
  match?: (pathname: string, hash: string) => boolean;
};

function pathIsDashboardHome(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname === "/try/dashboard" ||
    pathname === "/dashboard/"
  );
}

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

function NavButton({
  item,
  collapsed,
  active,
  onClick,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
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
        <Icon size={18} className={active ? "text-[#B88A2D]" : "text-[#8A7A68]"} />
        {!collapsed && <span className="flex-1 text-right">{item.label}</span>}
        {!collapsed && item.badge ? (
          <span className="rounded-full bg-[#B88A2D] px-1.5 py-0.5 text-[10px] font-black text-white">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        ) : null}
      </button>
    </li>
  );
}

export default function DashboardSidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
  invitationId = "",
  invitationShareId = "",
  rsvpSiteMode,
  guestExperienceType,
  eventId = "",
  checkInEnabled = false;
  canOpenEventManagement = false,
  canOpenTransportationManagement = false,
  canOpenWeddingChallenges = false,
  gameOnly = false,
  isDemo = false,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [hash, setHash] = useState("");
  const [unreadGuestMessages, setUnreadGuestMessages] = useState(0);

  useEffect(() => {
    const sync = () => setHash(window.location.hash || "");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  const canCheckIn =
    !gameOnly && checkInEnabled && userCanAccessCheckIn(user as any);
  const canCallRounds = !gameOnly && user?.includeCalls === true;
  const invitationLooksLikeWebsite = isPersonalRsvpSite(
    rsvpSiteMode ?? guestExperienceType
  );
  const canWeddingWebsite =
    !gameOnly &&
    (hasWeddingWebsiteFeature(user) || invitationLooksLikeWebsite);
  const canGuestMessages =
    !gameOnly &&
    (hasGuestMessagesFeature(user) || invitationLooksLikeWebsite);
  const canCreditGifts = !gameOnly && user?.includeCreditGifts === true;

  useEffect(() => {
    if (!canGuestMessages || isDemo) return;

    let cancelled = false;
    fetch("/api/guest-messages", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUnreadGuestMessages(Number(data?.unreadCount || 0));
      })
      .catch(() => {});

    function onActivity(event: Event) {
      const unread = Number(
        (event as CustomEvent)?.detail?.unreadGuestMessages
      );
      if (Number.isFinite(unread)) setUnreadGuestMessages(unread);
    }

    window.addEventListener("invistimo:guest-activity", onActivity);
    return () => {
      cancelled = true;
      window.removeEventListener("invistimo:guest-activity", onActivity);
    };
  }, [canGuestMessages, isDemo]);
  const dashboardHome = isDemo ? "/try/dashboard" : "/dashboard";

  const { mainItems, serviceItems } = useMemo(() => {
    const invitationHref = invitationId
      ? `/dashboard/edit-invite/${invitationId}`
      : "/dashboard/create-invite";
    const eventDetailsHref = invitationId
      ? `/dashboard/invitations/${invitationId}/edit`
      : dashboardHome;
    const messagesHref = isDemo
      ? "/try/dashboard/messages/new"
      : "/dashboard/messages/new";
    const seatingHref = isDemo ? "/try/dashboard/seating" : "/dashboard/seating";
    const eventManagementHref = eventId
      ? `/events/production?eventId=${eventId}&tab=overview`
      : "/events/production?tab=overview";
    const challengesHref = eventId
      ? `/dashboard/wedding-challenges?eventId=${eventId}`
      : "/dashboard/wedding-challenges";
    const transportHref = eventId
      ? `/dashboard/transportation?eventId=${eventId}`
      : "/dashboard";

    const main: NavItem[] = [
      {
        id: "dashboard",
        label: "דשבורד",
        icon: LayoutDashboard,
        href: dashboardHome,
        match: (path, currentHash) =>
          pathIsDashboardHome(path) && !currentHash,
      },
      {
        id: "event-details",
        label: "פרטי האירוע",
        icon: CalendarDays,
        href: eventDetailsHref,
        hidden: gameOnly || !invitationId,
        match: (path) =>
          path.includes("/invitations/") && path.endsWith("/edit"),
      },
      {
        id: "invitation",
        label: invitationId ? "ההזמנה" : "יצירת הזמנה",
        icon: Mail,
        href: invitationHref,
        hidden: gameOnly,
        match: (path) =>
          path.includes("/edit-invite") ||
          path.includes("/create-invite") ||
          (path.includes("/invitations/") && path.includes("/edit") === false),
      },
      {
        id: "invitation-preview",
        label: "צפייה בהזמנה",
        icon: Eye,
        href: invitationShareId
          ? getGuestInvitationUrl({
              shareId: invitationShareId,
              rsvpSiteMode: rsvpSiteMode ?? guestExperienceType,
              guestExperienceType,
              origin: "",
            })
          : "",
        external: true,
        hidden: gameOnly || !invitationShareId,
      },
      {
        id: "guests",
        label: "רשימת מוזמנים",
        icon: Users,
        href: `${dashboardHome}#guests`,
        hash: "guests",
        hidden: gameOnly,
        match: (path, currentHash) =>
          pathIsDashboardHome(path) && currentHash === "#guests",
      },
      {
        id: "import",
        label: "ייבוא מוזמנים מאקסל",
        icon: FileSpreadsheet,
        href: `${dashboardHome}?action=import`,
        query: "import",
        hidden: gameOnly,
      },
      {
        id: "rsvp",
        label: "אישורי הגעה",
        icon: CheckCircle2,
        href: `${dashboardHome}#rsvp-stats`,
        hash: "rsvp-stats",
        hidden: gameOnly,
        match: (path, currentHash) =>
          pathIsDashboardHome(path) && currentHash === "#rsvp-stats",
      },
      {
        id: "messages",
        label: "שליחת הודעות",
        icon: MessageCircle,
        href: messagesHref,
        hidden: gameOnly,
        match: (path) => path.startsWith("/dashboard/messages") || path.startsWith("/try/dashboard/messages"),
      },
      {
        id: "call-rounds",
        label: "סבבי אישורי הגעה",
        icon: Phone,
        href: `${dashboardHome}?action=calls`,
        query: "calls",
        hidden: !canCallRounds,
      },
      {
        id: "seating",
        label: "סידורי הושבה",
        icon: Armchair,
        href: seatingHref,
        hidden: gameOnly,
        match: (path) => path.includes("/dashboard/seating"),
      },
      {
        id: "checkin",
        label: "כניסה לאירוע",
        icon: QrCode,
        href: "/dashboard/check-in",
        hidden: !canCheckIn,
        match: (path) => path.startsWith("/dashboard/check-in"),
      },
    ];

    const services: NavItem[] = [
      {
        id: "wedding-website",
        label: "אתר חתונה",
        icon: Sparkles,
        href: "/dashboard/wedding-website",
        hidden: !canWeddingWebsite,
        match: (path) => path.startsWith("/dashboard/wedding-website"),
      },
      {
        id: "guest-messages",
        label: "הודעות מהאורחים",
        icon: Heart,
        href: "/dashboard/guest-messages",
        hidden: !canGuestMessages,
        badge: unreadGuestMessages,
        match: (path) => path.startsWith("/dashboard/guest-messages"),
      },
      {
        id: "credit-gifts",
        label: "קישור למתנות באשראי",
        icon: Gift,
        href: "https://ktzr.io/giftInvistimoSignup",
        external: true,
        hidden: !canCreditGifts,
      },
      {
        id: "event-management",
        label: "ניהול אירוע",
        icon: ClipboardList,
        href: eventManagementHref,
        hidden: gameOnly || !canOpenEventManagement,
        match: (path) => path.startsWith("/events/production"),
      },
      {
        id: "transportation",
        label: "ניהול הסעות",
        icon: Bus,
        href: transportHref,
        hidden: gameOnly || !canOpenTransportationManagement,
        match: (path) => path.startsWith("/dashboard/transportation"),
      },
      {
        id: "wedding-challenges",
        label: "ניהול Wedding Challenges",
        icon: WandSparkles,
        href: challengesHref,
        hidden: !canOpenWeddingChallenges && !gameOnly,
        match: (path) => path.startsWith("/dashboard/wedding-challenges"),
      },
    ];

    return {
      mainItems: main.filter((item) => !item.hidden),
      serviceItems: services.filter((item) => !item.hidden),
    };
  }, [
    invitationId,
    invitationShareId,
    rsvpSiteMode,
    guestExperienceType,
    eventId,
    gameOnly,
    isDemo,
    dashboardHome,
    unreadGuestMessages,
    canCallRounds,
    canCheckIn,
    canWeddingWebsite,
    canGuestMessages,
    canCreditGifts,
    canOpenEventManagement,
    canOpenTransportationManagement,
    canOpenWeddingChallenges,
  ]);

  const go = (item: NavItem) => {
    onClose();
    if (isDemo && item.query) {
      return;
    }
    if (item.external && item.href) {
      if (isDemo) return;
      window.open(item.href, "_blank", "noopener,noreferrer");
      return;
    }
    if (item.query) {
      router.push(`${dashboardHome}?action=${item.query}`);
      return;
    }
    const href = item.href || dashboardHome;
    if (href.includes("#")) {
      const [path, nextHash] = href.split("#");
      if (pathname === path || pathname === `${path}/`) {
        const el = document.getElementById(nextHash);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", `${path}#${nextHash}`);
        setHash(`#${nextHash}`);
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
            <p className="mt-0.5 text-sm font-black text-[#3F3328]">האירוע שלי</p>
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

      <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {mainItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              collapsed={collapsed}
              active={Boolean(item.match?.(pathname, hash))}
              onClick={() => go(item)}
            />
          ))}
        </ul>

        {serviceItems.length > 0 ? (
          <div>
            {!collapsed ? (
              <p className="mb-2 px-3 text-[11px] font-black tracking-[0.12em] text-[#B88A2D]">
                שירותים נוספים
              </p>
            ) : null}
            <ul className="space-y-1">
              {serviceItems.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  active={Boolean(item.match?.(pathname, hash))}
                  onClick={() => go(item)}
                />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </nav>
  );

  return (
    <>
      <aside
        className={`
          fixed bottom-0 top-16 z-30 hidden border-l border-[#EADBC4] bg-[#FFFDF8]
          transition-[width] duration-200 lg:flex
          ${collapsed ? "w-[72px]" : "w-[240px]"}
        `}
        style={{ right: 0 }}
        aria-label="תפריט בעל האירוע"
      >
        {nav}
      </aside>

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
