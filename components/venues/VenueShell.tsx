"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Loader2,
  Menu,
  PieChart,
  Settings,
  ShieldCheck,
  UsersRound,
  UtensilsCrossed,
  Wrench,
  X,
  Grid3X3,
  Package,
} from "lucide-react";
import type { VenuePermission } from "@/lib/venues/permissions";

const ACTIVE_HALL_KEY = "venue.activeHallId";
const ACTIVE_HALL_COOKIE = "venue.activeHallId";
const SIDEBAR_COLLAPSED_KEY = "venue.sidebarCollapsed";

type VenueOption = {
  venueId: string;
  name: string;
  subtitle: string;
  role: string;
  permissions: VenuePermission[];
};

type NavItem = {
  label: string;
  segment: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  permission?: VenuePermission;
};

const NAV_ITEMS: NavItem[] = [
  { label: "סקירה", segment: "", icon: LayoutDashboard, permission: "dashboard.view" },
  { label: "לידים", segment: "crm", icon: FileText, permission: "leads.view" },
  { label: "אירועים / יומן", segment: "calendar", icon: CalendarDays, permission: "events.view" },
  { label: "לקוחות", segment: "customers", icon: UsersRound, permission: "guests.view" },
  { label: "תפריטים", segment: "menus", icon: UtensilsCrossed, permission: "settings.view" },
  { label: "הושבה", segment: "seating-templates", icon: Grid3X3, permission: "seating.view" },
  { label: "צוות / משמרות", segment: "staff", icon: Wrench, permission: "staff.view" },
  { label: "עובדים והרשאות", segment: "employees", icon: ShieldCheck, permission: "employees.view" },
  { label: "קבצים / חוזים", segment: "files", icon: FolderOpen, permission: "files.view" },
  { label: "ציוד", segment: "equipment", icon: Package, permission: "settings.view" },
  { label: "דוחות", segment: "reports", icon: PieChart, permission: "reports.view" },
  { label: "הגדרות", segment: "settings", icon: Settings, permission: "settings.view" },
  { label: "יומן פעילות", segment: "activity", icon: Activity, permission: "dashboard.view" },
];

function encodeHallId(hallId: string) {
  return encodeURIComponent(hallId);
}

function hallBasePath(hallId: string) {
  return `/venues/dashboard/halls/${encodeHallId(hallId)}`;
}

function setActiveHallCookie(hallId: string) {
  try {
    document.cookie = `${ACTIVE_HALL_COOKIE}=${encodeURIComponent(hallId)};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

function readCollapsedPreference(): boolean | null {
  try {
    const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    /* ignore */
  }
  return null;
}

function writeCollapsedPreference(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export default function VenueShell({
  hallId,
  hallName,
  hallSubtitle,
  hallImage,
  permissions,
  children,
}: {
  hallId: string;
  hallName: string;
  hallSubtitle?: string;
  hallImage?: string;
  permissions: VenuePermission[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const visibleNav = useMemo(
    () =>
      NAV_ITEMS.filter(
        (item) => !item.permission || permissionSet.has(item.permission)
      ),
    [permissionSet]
  );

  const activeSegment = useMemo(() => {
    const base = hallBasePath(hallId);
    if (pathname === base || pathname === `${base}/`) return "";
    const rest = pathname.replace(base, "").replace(/^\//, "");
    const first = rest.split("/")[0];
    return first || "";
  }, [pathname, hallId]);

  const fetchVenues = useCallback(async () => {
    setLoadingVenues(true);
    try {
      const res = await fetch("/api/venues/dashboard/my-venues", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setVenues(Array.isArray(data.venues) ? data.venues : []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingVenues(false);
    }
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_HALL_KEY, hallId);
      setActiveHallCookie(hallId);
    } catch {
      /* ignore */
    }
  }, [hallId]);

  // Restore preference, or auto-collapse on tablet / small laptop widths.
  useEffect(() => {
    const saved = readCollapsedPreference();
    if (saved !== null) {
      setCollapsed(saved);
      return;
    }

    const mq = window.matchMedia("(max-width: 1279px)");
    const apply = () => setCollapsed(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
    setSwitcherOpen(false);
  }, [pathname]);

  // Escape closes mobile drawer / switcher
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setSwitcherOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsedPreference(next);
      return next;
    });
    setSwitcherOpen(false);
  };

  const currentVenue = useMemo(
    () => venues.find((v) => v.venueId === hallId),
    [venues, hallId]
  );

  const displayName = currentVenue?.name || hallName;
  const displaySubtitle =
    currentVenue?.subtitle || hallSubtitle || "ניהול אולם";

  const switchVenue = (newHallId: string) => {
    if (newHallId === hallId) {
      setSwitcherOpen(false);
      return;
    }

    try {
      localStorage.setItem(ACTIVE_HALL_KEY, newHallId);
      setActiveHallCookie(newHallId);
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (
          key.startsWith("venue.") &&
          key !== ACTIVE_HALL_KEY &&
          key !== SIDEBAR_COLLAPSED_KEY &&
          (key.includes(hallId) || key.includes("cache"))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }

    const newBase = hallBasePath(newHallId);
    const target = activeSegment ? `${newBase}/${activeSegment}` : newBase;

    setSwitcherOpen(false);
    setMobileOpen(false);
    router.push(target);
    router.refresh();
  };

  // On mobile overlay the drawer is always "expanded" (labels visible).
  // On lg+ the sticky rail respects collapsed.
  const railCollapsed = collapsed;

  return (
    <div dir="rtl" className="relative min-h-screen bg-[#f6efe4] text-[#1f2933]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -right-32 top-0 h-[460px] w-[460px] rounded-full bg-[#e8c982]/25 blur-3xl" />
        <div className="absolute -left-40 top-40 h-[560px] w-[560px] rounded-full bg-[#b98121]/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        {mobileOpen && (
          <button
            type="button"
            aria-label="סגירת תפריט"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          />
        )}

        <aside
          aria-label="תפריט ניהול אולם"
          data-collapsed={railCollapsed ? "true" : "false"}
          className={[
            "fixed right-0 top-0 z-50 flex h-full flex-col border-l border-[#eadfce] bg-white/95 shadow-2xl shadow-black/5 backdrop-blur-xl transition-[width,transform] duration-300 ease-out",
            "lg:sticky lg:top-0 lg:z-40 lg:h-screen lg:translate-x-0 lg:shadow-none",
            // Mobile: full drawer width when open
            "w-[min(290px,88vw)] px-4 py-4",
            mobileOpen ? "translate-x-0" : "translate-x-full",
            // Desktop widths
            railCollapsed
              ? "lg:w-[76px] lg:px-2 lg:py-4"
              : "lg:w-[290px] lg:px-5 lg:py-5",
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center gap-2",
              railCollapsed ? "lg:flex-col lg:gap-3" : "justify-between",
            ].join(" ")}
          >
            <div
              className={[
                "min-w-0",
                railCollapsed ? "lg:flex lg:flex-col lg:items-center" : "",
              ].join(" ")}
            >
              <div
                className={[
                  "font-black tracking-[0.35em] text-[#c99a3d]",
                  railCollapsed
                    ? "text-[10px] lg:tracking-[0.2em]"
                    : "text-[11px]",
                ].join(" ")}
              >
                {railCollapsed ? (
                  <span className="hidden lg:inline" title="INVISTIMO Venue Suite">
                    INV
                  </span>
                ) : null}
                <span className={railCollapsed ? "lg:hidden" : ""}>INVISTIMO</span>
              </div>
              <div
                className={[
                  "font-black text-[#2b241c]",
                  railCollapsed
                    ? "mt-0.5 text-sm lg:hidden"
                    : "mt-1 text-xl",
                ].join(" ")}
              >
                Venue Suite
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-pressed={railCollapsed}
                aria-label={
                  railCollapsed ? "הרחב תפריט צד" : "כווץ תפריט צד לאייקונים"
                }
                title={railCollapsed ? "הרחב תפריט" : "כווץ לאייקונים"}
                className="hidden h-9 w-9 items-center justify-center rounded-2xl border border-[#eadfce] text-[#6f6252] transition hover:border-[#d5b36d] hover:bg-[#fbf5ea] hover:text-[#b98121] lg:flex"
              >
                {railCollapsed ? (
                  <ChevronsLeft size={18} />
                ) : (
                  <ChevronsRight size={18} />
                )}
              </button>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="סגור תפריט"
                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#eadfce] text-[#6f6252] lg:hidden"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="relative mt-5 lg:mt-7">
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              title={displayName}
              aria-expanded={switcherOpen}
              aria-haspopup="listbox"
              className={[
                "flex w-full items-center rounded-3xl border border-[#eadfce] bg-[#fbfaf7] text-right transition hover:border-[#d5b36d]",
                railCollapsed
                  ? "justify-center gap-0 p-2 lg:rounded-2xl"
                  : "gap-3 p-3",
              ].join(" ")}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#ead8b8] text-[#b98121]">
                {hallImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hallImage}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 size={20} />
                )}
              </div>
              <div
                className={[
                  "min-w-0 flex-1",
                  railCollapsed ? "lg:hidden" : "",
                ].join(" ")}
              >
                <div className="truncate text-sm font-black text-[#2b241c]">
                  {displayName}
                </div>
                <div className="truncate text-xs font-bold text-[#8a7b68]">
                  {displaySubtitle}
                </div>
              </div>
              {loadingVenues ? (
                <Loader2
                  size={16}
                  className={[
                    "animate-spin text-[#b98121]",
                    railCollapsed ? "lg:hidden" : "",
                  ].join(" ")}
                />
              ) : (
                <ChevronDown
                  size={16}
                  className={[
                    "text-[#8a7b68] transition",
                    switcherOpen ? "rotate-180" : "",
                    railCollapsed ? "lg:hidden" : "",
                  ].join(" ")}
                />
              )}
            </button>

            {switcherOpen && !loadingVenues && venues.length === 0 && (
              <div
                className={[
                  "absolute z-50 rounded-2xl border border-[#eadfce] bg-white p-4 shadow-xl",
                  railCollapsed
                    ? "left-auto right-0 top-[calc(100%+6px)] w-[240px] lg:right-full lg:top-0 lg:ml-0 lg:mr-2"
                    : "left-0 right-0 top-[calc(100%+6px)]",
                ].join(" ")}
              >
                <p className="text-center text-sm font-bold text-[#8a7b68]">
                  אין אולמות נוספים בחשבון
                </p>
                <Link
                  href="/venues/dashboard"
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[#b98121] transition hover:bg-[#fbf5ea]"
                  onClick={() => setSwitcherOpen(false)}
                >
                  <LayoutDashboard size={16} />
                  דשבורד מתחם
                </Link>
              </div>
            )}

            {switcherOpen && venues.length > 0 && (
              <div
                role="listbox"
                className={[
                  "absolute z-50 rounded-2xl border border-[#eadfce] bg-white p-2 shadow-xl",
                  railCollapsed
                    ? "left-auto right-0 top-[calc(100%+6px)] w-[240px] max-h-[60vh] overflow-y-auto lg:right-full lg:top-0 lg:mr-2"
                    : "left-0 right-0 top-[calc(100%+6px)] max-h-[50vh] overflow-y-auto",
                ].join(" ")}
              >
                {venues.map((venue) => (
                  <button
                    key={venue.venueId}
                    type="button"
                    role="option"
                    aria-selected={venue.venueId === hallId}
                    onClick={() => switchVenue(venue.venueId)}
                    className={[
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-sm font-bold transition",
                      venue.venueId === hallId
                        ? "bg-[#fff8eb] text-[#9f6f1a]"
                        : "text-[#6f6252] hover:bg-[#fbf5ea]",
                    ].join(" ")}
                  >
                    <Building2 size={16} className="shrink-0 text-[#b98121]" />
                    <span className="truncate">{venue.name}</span>
                  </button>
                ))}
                <Link
                  href="/venues/dashboard"
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[#6f6252] transition hover:bg-[#fbf5ea]"
                  onClick={() => setSwitcherOpen(false)}
                >
                  <LayoutDashboard size={16} />
                  דשבורד מתחם
                </Link>
              </div>
            )}
          </div>

          <nav className="mt-5 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pb-3 lg:mt-7">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const href = item.segment
                ? `${hallBasePath(hallId)}/${item.segment}`
                : hallBasePath(hallId);
              const isActive = activeSegment === item.segment;

              return (
                <Link
                  key={item.label}
                  href={href}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={[
                    "group flex h-12 w-full items-center rounded-2xl text-sm font-extrabold transition",
                    railCollapsed
                      ? "justify-center gap-0 px-0 lg:h-11"
                      : "gap-3 px-4",
                    isActive
                      ? "bg-gradient-to-l from-[#b98121] to-[#d5b36d] text-white shadow-lg shadow-[#b98121]/15"
                      : "text-[#736657] hover:bg-[#fbf5ea] hover:text-[#b98121]",
                  ].join(" ")}
                >
                  <Icon size={18} className="shrink-0" />
                  <span
                    className={[
                      "flex-1 text-right",
                      railCollapsed ? "lg:hidden" : "",
                    ].join(" ")}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div
            className={[
              "mt-auto rounded-3xl border border-[#eadfce] bg-gradient-to-br from-[#fffaf0] to-[#f6ead2] p-4",
              railCollapsed ? "lg:hidden" : "",
            ].join(" ")}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#c58b2c] shadow-sm">
              <UtensilsCrossed size={19} />
            </div>
            <div className="mt-3 text-sm font-black text-[#2b241c]">ניהול אולם</div>
            <p className="mt-1 text-xs font-bold leading-5 text-[#7f705d]">
              לידים, אירועים, לקוחות, צוות ודוחות — כל האולם במקום אחד.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="sticky top-[56px] z-30 flex items-center gap-3 border-b border-[#eadfce] bg-white/80 px-3 py-3 backdrop-blur sm:px-4 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="פתח תפריט ניהול"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#eadfce] bg-white text-[#5f5347]"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black text-[#2b241c]">
                {displayName}
              </div>
              <div className="truncate text-xs font-bold text-[#8a7b68]">
                {visibleNav.find((n) => n.segment === activeSegment)?.label ||
                  "סקירה"}
              </div>
            </div>
          </div>

          <div className="min-h-screen">{children}</div>
        </section>
      </div>
    </div>
  );
}
