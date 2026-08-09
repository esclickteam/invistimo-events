"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  CalendarDays,
  ChevronDown,
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
} from "lucide-react";
import type { VenuePermission } from "@/lib/venues/permissions";

const ACTIVE_HALL_KEY = "venue.activeHallId";
const ACTIVE_HALL_COOKIE = "venue.activeHallId";

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
  icon: React.ComponentType<{ size?: number }>;
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      // Clear any cached hall-scoped client keys to prevent leakage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (
          key.startsWith("venue.") &&
          key !== ACTIVE_HALL_KEY &&
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
    const target =
      activeSegment ? `${newBase}/${activeSegment}` : newBase;

    setSwitcherOpen(false);
    // Hard navigation resets client React state / fetch cache for the new tenant
    router.push(target);
    router.refresh();
  };

  return (
    <div dir="rtl" className="relative min-h-screen bg-[#f6efe4] text-[#1f2933]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -right-32 top-0 h-[460px] w-[460px] rounded-full bg-[#e8c982]/25 blur-3xl" />
        <div className="absolute -left-40 top-40 h-[560px] w-[560px] rounded-full bg-[#b98121]/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="סגירת תפריט"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          />
        )}

        <aside
          className={[
            "fixed right-0 top-0 z-50 h-full w-[290px] border-l border-[#eadfce] bg-white/95 px-5 py-5 shadow-2xl shadow-black/5 backdrop-blur-xl transition-transform duration-300 lg:sticky lg:translate-x-0 lg:shadow-none",
            sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          ].join(" ")}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black tracking-[0.35em] text-[#c99a3d]">
                INVISTIMO
              </div>
              <div className="mt-1 text-xl font-black text-[#2b241c]">Venue Suite</div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#eadfce] text-[#6f6252] lg:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <div className="relative mt-7">
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              className="flex w-full items-center gap-3 rounded-3xl border border-[#eadfce] bg-[#fbfaf7] p-3 text-right transition hover:border-[#d5b36d]"
            >
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#ead8b8] text-[#b98121]">
                {hallImage ? (
                  <img
                    src={hallImage}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 size={20} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black text-[#2b241c]">
                  {displayName}
                </div>
                <div className="truncate text-xs font-bold text-[#8a7b68]">
                  {displaySubtitle}
                </div>
              </div>
              {loadingVenues ? (
                <Loader2 size={16} className="animate-spin text-[#b98121]" />
              ) : (
                <ChevronDown
                  size={16}
                  className={[
                    "text-[#8a7b68] transition",
                    switcherOpen ? "rotate-180" : "",
                  ].join(" ")}
                />
              )}
            </button>

            {switcherOpen && !loadingVenues && venues.length === 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl border border-[#eadfce] bg-white p-4 shadow-xl">
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
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl border border-[#eadfce] bg-white p-2 shadow-xl">
                {venues.map((venue) => (
                  <button
                    key={venue.venueId}
                    type="button"
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

          <nav className="mt-7 space-y-1">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const href =
                item.segment
                  ? `${hallBasePath(hallId)}/${item.segment}`
                  : hallBasePath(hallId);
              const isActive = activeSegment === item.segment;

              return (
                <Link
                  key={item.label}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={[
                    "group flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm font-extrabold transition",
                    isActive
                      ? "bg-gradient-to-l from-[#b98121] to-[#d5b36d] text-white shadow-lg shadow-[#b98121]/15"
                      : "text-[#736657] hover:bg-[#fbf5ea] hover:text-[#b98121]",
                  ].join(" ")}
                >
                  <Icon size={18} />
                  <span className="flex-1 text-right">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-7 rounded-3xl border border-[#eadfce] bg-gradient-to-br from-[#fffaf0] to-[#f6ead2] p-4">
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
          <div className="sticky top-[56px] z-30 flex items-center gap-3 border-b border-[#eadfce] bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eadfce] bg-white text-[#5f5347]"
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
