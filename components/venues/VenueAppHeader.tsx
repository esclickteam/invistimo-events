"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  Grid3X3,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

type VenueOption = {
  venueId: string;
  name: string;
  subtitle?: string;
  role?: string;
};

const ACTIVE_HALL_KEY = "venue.activeHallId";

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const hit = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!hit) return "";
  return decodeURIComponent(hit.split("=").slice(1).join("="));
}

export default function VenueAppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const hallIdFromPath = useMemo(() => {
    const m = String(pathname || "").match(
      /\/venues\/dashboard\/halls\/([^/]+)/
    );
    return m ? decodeURIComponent(m[1]) : "";
  }, [pathname]);

  const activeHallId = hallIdFromPath || readCookie("venue.activeHallId") || "";

  const loadVenues = useCallback(async () => {
    try {
      const res = await fetch("/api/venues/dashboard/my-venues", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setVenues(Array.isArray(data.venues) ? data.venues : []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const current = useMemo(
    () => venues.find((v) => v.venueId === activeHallId) || venues[0],
    [venues, activeHallId]
  );

  const hallBase = current?.venueId
    ? `/venues/dashboard/halls/${encodeURIComponent(current.venueId)}`
    : "";

  const quickLinks = useMemo(() => {
    if (!hallBase) return [];
    return [
      { href: hallBase, label: "סקירה", icon: LayoutDashboard },
      { href: `${hallBase}/calendar`, label: "אירועים", icon: CalendarDays },
      { href: `${hallBase}/seating-templates`, label: "הושבה", icon: Grid3X3 },
      { href: `${hallBase}/employees`, label: "הרשאות", icon: ShieldCheck },
      { href: `${hallBase}/customers`, label: "לקוחות", icon: UsersRound },
    ];
  }, [hallBase]);

  const switchHall = (venueId: string) => {
    try {
      localStorage.setItem(ACTIVE_HALL_KEY, venueId);
      document.cookie = `venue.activeHallId=${encodeURIComponent(
        venueId
      )};path=/;max-age=31536000;SameSite=Lax`;
    } catch {
      /* ignore */
    }
    setOpen(false);
    router.push(`/venues/dashboard/halls/${encodeURIComponent(venueId)}`);
    router.refresh();
  };

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
    window.location.href = "/login";
  };

  return (
    <header
      dir="rtl"
      className="sticky top-0 z-[60] border-b border-[#e6d8c2] bg-[#1c1712]/95 text-[#f7efe3] shadow-[0_10px_30px_rgba(28,23,18,0.18)] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-3 py-2.5 sm:px-5">
        <Link
          href="/venues/dashboard"
          className="flex min-w-0 items-center gap-2.5 rounded-2xl px-2 py-1.5 transition hover:bg-white/5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4a24a] to-[#9a6b1f] text-sm font-black text-[#1c1712] shadow-inner">
            V
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[11px] font-black tracking-[0.28em] text-[#e0b45a]">
              INVISTIMO
            </div>
            <div className="truncate text-sm font-black text-white">
              Venue Suite
            </div>
          </div>
        </Link>

        <div className="relative hidden min-w-0 md:block">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex max-w-[260px] items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right transition hover:bg-white/10"
          >
            <Building2 size={16} className="shrink-0 text-[#e0b45a]" />
            <span className="min-w-0 flex-1 truncate text-sm font-bold">
              {current?.name || "בחירת אולם"}
            </span>
            <ChevronDown
              size={14}
              className={["shrink-0 transition", open ? "rotate-180" : ""].join(
                " "
              )}
            />
          </button>
          {open && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[260px] rounded-2xl border border-[#eadfce] bg-[#fffaf2] p-2 text-[#2b241c] shadow-2xl">
              {venues.length === 0 ? (
                <div className="px-3 py-2 text-sm font-bold text-[#8a7b68]">
                  אין אולמות בחשבון
                </div>
              ) : (
                venues.map((v) => (
                  <button
                    key={v.venueId}
                    type="button"
                    onClick={() => switchHall(v.venueId)}
                    className={[
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-sm font-bold transition",
                      v.venueId === current?.venueId
                        ? "bg-[#fff1d6] text-[#9f6f1a]"
                        : "hover:bg-[#f7efe3]",
                    ].join(" ")}
                  >
                    <Building2 size={15} className="text-[#b98121]" />
                    <span className="truncate">{v.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== hallBase && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition",
                  active
                    ? "bg-[#e0b45a] text-[#1c1712]"
                    : "text-[#f0e2cc] hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <Link
            href="/venues/dashboard"
            className="hidden rounded-full border border-white/15 px-3 py-1.5 text-xs font-extrabold text-[#f0e2cc] transition hover:bg-white/10 sm:inline-flex"
          >
            דשבורד מתחם
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-white/15 disabled:opacity-60"
          >
            <LogOut size={14} />
            התנתקות
          </button>
        </div>
      </div>
    </header>
  );
}
