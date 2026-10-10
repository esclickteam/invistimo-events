"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  FileText,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  PanelRightClose,
  PanelRightOpen,
  PhoneCall,
  Search,
  Sparkles,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AdminResponsiveEnhancer } from "./admin-responsive";
import "./admin-theme.css";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "סקירה",
    items: [
      {
        href: "/admin",
        label: "סקירת מערכת",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "customers",
    label: "לקוחות ומשתמשים",
    items: [
      {
        href: "/admin/customers",
        label: "לקוחות",
        icon: <Briefcase className="h-4 w-4" />,
      },
      {
        href: "/admin/users",
        label: "משתמשים",
        icon: <Users className="h-4 w-4" />,
      },
      {
        href: "/admin/wedding-challenges",
        label: "Wedding Challenges",
        icon: <Sparkles className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "sales",
    label: "מכירות והצעות",
    items: [
      {
        href: "/admin/sales/quotes",
        label: "הצעות מחיר",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        href: "/admin/sales/new",
        label: "יצירת מכירה",
        icon: <FileText className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "events",
    label: "אירועים",
    items: [
      {
        href: "/admin/invitations",
        label: "ניהול אירועים",
        icon: <CalendarDays className="h-4 w-4" />,
      },
      {
        href: "/admin/calls",
        label: "שירות שיחות",
        icon: <PhoneCall className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "ops",
    label: "תפעול",
    items: [
      {
        href: "/admin/call-recordings",
        label: "הקלטות שיחות",
        icon: <Headphones className="h-4 w-4" />,
      },
      {
        href: "/admin/recorded-calls",
        label: "שיחות מוקלטות",
        icon: <PhoneCall className="h-4 w-4" />,
      },
      {
        href: "/admin/reminder-sms",
        label: "הודעת תזכורת",
        icon: <MessageSquareText className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "staff",
    label: "עובדים",
    items: [
      {
        href: "/admin/employees",
        label: "עובדים",
        icon: <UserRound className="h-4 w-4" />,
      },
      {
        href: "/admin/shift-management",
        label: "ניהול משמרת",
        icon: <BarChart3 className="h-4 w-4" />,
      },
      {
        href: "/admin/employees/shifts",
        label: "שיבוץ משמרות",
        icon: <CalendarDays className="h-4 w-4" />,
      },
    ],
  },
];

const PAGE_META: Array<{
  match: (path: string) => boolean;
  title: string;
  description?: string;
}> = [
  {
    match: (p) => p === "/admin",
    title: "סקירת מערכת",
    description: "נתוני פעילות וסקירה עסקית",
  },
  {
    match: (p) => p.startsWith("/admin/customers/"),
    title: "תיק לקוח",
    description: "פרטים, הצעות, הסכמים ותשלומים",
  },
  {
    match: (p) => p.startsWith("/admin/customers"),
    title: "לקוחות",
    description: "תיקי לקוח, הסכמים והצעות",
  },
  {
    match: (p) => p.startsWith("/admin/sales/quotes/") && p.includes("/edit"),
    title: "עריכת הצעה",
  },
  {
    match: (p) => p.startsWith("/admin/sales/quotes"),
    title: "הצעות מחיר",
    description: "עריכה ופתיחת משתמש מההצעה",
  },
  {
    match: (p) => p.startsWith("/admin/sales/new"),
    title: "יצירת מכירה",
  },
  {
    match: (p) => p.startsWith("/admin/users"),
    title: "משתמשים",
    description: "ניהול חשבונות, הרשאות וניהול כאדמין",
  },
  {
    match: (p) => p.startsWith("/admin/wedding-challenges"),
    title: "Wedding Challenges",
  },
  {
    match: (p) => p.startsWith("/admin/employees/shifts"),
    title: "שיבוץ משמרות",
  },
  {
    match: (p) => p.startsWith("/admin/employees/agreement-template"),
    title: "תבנית הסכם עובדים",
  },
  {
    match: (p) => p.startsWith("/admin/employees/"),
    title: "תיק עובד",
  },
  {
    match: (p) => p.startsWith("/admin/employees"),
    title: "עובדים",
  },
  {
    match: (p) => p.startsWith("/admin/shift-management"),
    title: "ניהול משמרת",
  },
  {
    match: (p) => p.startsWith("/admin/call-recordings"),
    title: "הקלטות שיחות",
  },
  {
    match: (p) => p.startsWith("/admin/recorded-calls"),
    title: "שיחות מוקלטות",
  },
  {
    match: (p) => p.startsWith("/admin/reminder-sms"),
    title: "הודעת תזכורת",
  },
  {
    match: (p) => p.startsWith("/admin/invitations"),
    title: "ניהול אירועים",
  },
  {
    match: (p) => p.startsWith("/admin/calls"),
    title: "שירות שיחות",
  },
  {
    match: (p) => p.startsWith("/admin/forms"),
    title: "טפסים",
  },
];

function resolvePageMeta(pathname: string) {
  for (const item of PAGE_META) {
    if (item.match(pathname)) return item;
  }
  return { title: "ניהול מערכת", description: undefined as string | undefined };
}

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isDesktopNav, setIsDesktopNav] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  const mobileHeaderRef = useRef<HTMLElement>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((g) => [g.id, true]))
  );

  const auth = useAuth() as any;
  const { logout } = auth;
  const user = auth?.user || auth?.currentUser || null;
  const authLoading = Boolean(auth?.loading);
  const adminName =
    authLoading || !user
      ? "Admin"
      : user?.name || user?.fullName || user?.email || "Admin";

  const pathname = usePathname() || "/admin";
  const pageMeta = useMemo(() => resolvePageMeta(pathname), [pathname]);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktopNav(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    const header = mobileHeaderRef.current;
    if (!header) return;
    const apply = () => {
      document.documentElement.style.setProperty(
        "--admin-mobile-header-h",
        `${header.offsetHeight}px`
      );
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
  };

  const navCollapsed = collapsed && isDesktopNav;

  const submitQuickSearch = (value: string) => {
    const q = value.trim();
    if (!q) return;
    window.location.href = `/admin/users?q=${encodeURIComponent(q)}`;
  };

  return (
    <div className="admin-app flex min-h-screen overflow-x-hidden" dir="rtl">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&display=swap"
      />

      <AdminResponsiveEnhancer pathname={pathname} />

      {/* Mobile top bar — drawer navigation below the desktop breakpoint */}
      <header ref={mobileHeaderRef} className="admin-mobile-header lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--admin-border)] text-[var(--admin-text)]"
            aria-label="פתיחת תפריט"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[var(--admin-text)]">
              {pageMeta.title}
            </p>
            {pageMeta.description ? (
              <p className="truncate text-[11px] font-medium text-[var(--admin-muted)]">
                {pageMeta.description}
              </p>
            ) : (
              <p className="truncate text-[11px] font-medium text-[var(--admin-muted)]">
                Invistimo Admin
              </p>
            )}
          </div>
          <Image
            src="/invistimo-logo.png"
            alt="Invistimo"
            width={24}
            height={24}
            className="h-6 w-6 shrink-0 object-contain"
          />
        </div>
        <form
          className="mt-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitQuickSearch(mobileSearch);
          }}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--admin-subtle)]" />
            <input
              type="search"
              value={mobileSearch}
              onChange={(event) => setMobileSearch(event.target.value)}
              placeholder="חיפוש משתמשים…"
              enterKeyHint="search"
              className="admin-input h-11 w-full pr-8 text-sm"
            />
          </div>
        </form>
      </header>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={`admin-sidebar ${mobileOpen ? "is-open" : ""} ${
          navCollapsed ? "is-collapsed" : ""
        }`}
        aria-hidden={!isDesktopNav && !mobileOpen}
      >
        <div
          className={`flex h-[var(--admin-header-h)] items-center border-b border-[var(--admin-border)] px-3 ${
            navCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          <Link href="/admin" className="flex min-w-0 items-center gap-2">
            <Image
              src="/invistimo-logo.png"
              alt="Invistimo"
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 object-contain"
            />
            {!navCollapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[var(--admin-text)]">
                  Invistimo
                </p>
                <p className="truncate text-[10px] font-semibold text-[var(--admin-subtle)]">
                  מערכת ניהול
                </p>
              </div>
            ) : null}
          </Link>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--admin-muted)] hover:bg-gray-100 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="סגירת תפריט"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="admin-sidebar-scroll flex-1 space-y-3 overflow-y-auto px-2 py-3">
          {NAV_GROUPS.map((group) => {
            const groupOpen = openGroups[group.id] !== false;
            return (
              <div key={group.id}>
                {!navCollapsed ? (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((prev) => ({
                        ...prev,
                        [group.id]: !groupOpen,
                      }))
                    }
                    className="mb-1 flex w-full items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]"
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition ${
                        groupOpen ? "" : "-rotate-90"
                      }`}
                    />
                  </button>
                ) : null}

                {(navCollapsed || groupOpen) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isActivePath(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={item.label}
                          onClick={() => setMobileOpen(false)}
                          className={`flex h-11 items-center gap-2.5 rounded-[var(--admin-radius-sm)] px-2.5 text-[13px] font-semibold transition lg:h-10 ${
                            active
                              ? "bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]"
                              : "text-[var(--admin-muted)] hover:bg-gray-50 hover:text-[var(--admin-text)]"
                          } ${navCollapsed ? "justify-center px-0" : ""}`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                              active
                                ? "bg-white text-[var(--admin-brand)]"
                                : "text-[var(--admin-subtle)]"
                            }`}
                          >
                            {item.icon}
                          </span>
                          {!navCollapsed ? <span className="truncate">{item.label}</span> : null}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-[var(--admin-border)] p-2">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="mb-2 hidden h-9 w-full items-center justify-center gap-2 rounded-[var(--admin-radius-sm)] text-xs font-bold text-[var(--admin-muted)] hover:bg-gray-50 lg:flex"
            title={navCollapsed ? "הרחבת תפריט" : "צמצום תפריט"}
          >
            {navCollapsed ? (
              <PanelRightOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelRightClose className="h-4 w-4" />
                צמצום תפריט
              </>
            )}
          </button>

          <div
            className={`mb-2 flex items-center gap-2 rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-gray-50 px-2 py-2 ${
              navCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--admin-brand-soft)] text-xs font-bold text-[var(--admin-brand)]">
              {String(adminName).slice(0, 2)}
            </div>
            {!navCollapsed ? (
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[var(--admin-text)]">
                  {adminName}
                </p>
                <p className="truncate text-[10px] font-semibold text-[var(--admin-subtle)]">
                  מנהל מערכת
                </p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className={`flex h-9 w-full items-center gap-2 rounded-[var(--admin-radius-sm)] border border-red-100 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 ${
              navCollapsed ? "justify-center px-0" : "px-3"
            }`}
          >
            <LogOut className="h-3.5 w-3.5" />
            {!navCollapsed ? "התנתקות" : null}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 hidden h-[var(--admin-header-h)] items-center justify-between gap-3 border-b border-[var(--admin-border)] bg-white/95 px-5 backdrop-blur lg:flex">
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold text-[var(--admin-text)]">
              {pageMeta.title}
            </h1>
            {pageMeta.description ? (
              <p className="truncate text-[11px] font-medium text-[var(--admin-muted)]">
                {pageMeta.description}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden lg:block">
              <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--admin-subtle)]" />
              <input
                type="search"
                placeholder="חיפוש מהיר…"
                className="admin-input h-9 w-56 pr-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const q = (e.target as HTMLInputElement).value.trim();
                  if (!q) return;
                  window.location.href = `/admin/users?q=${encodeURIComponent(q)}`;
                }}
              />
            </div>

            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--admin-border)] text-[var(--admin-muted)] hover:bg-gray-50"
              title="התראות"
            >
              <Bell className="h-4 w-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex h-9 items-center gap-2 rounded-md border border-[var(--admin-border)] bg-white px-2.5 text-xs font-bold text-[var(--admin-text)] hover:bg-gray-50"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--admin-brand-soft)] text-[10px] text-[var(--admin-brand)]">
                  {String(adminName).slice(0, 2)}
                </span>
                <span className="max-w-[120px] truncate">{adminName}</span>
                <ChevronLeft
                  className={`h-3.5 w-3.5 text-[var(--admin-subtle)] transition ${
                    profileOpen ? "-rotate-90" : ""
                  }`}
                />
              </button>

              {profileOpen ? (
                <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-44 overflow-hidden rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white shadow-md">
                  <Link
                    href="/admin/users"
                    className="block px-3 py-2.5 text-xs font-semibold text-[var(--admin-text)] hover:bg-gray-50"
                    onClick={() => setProfileOpen(false)}
                  >
                    ניהול משתמשים
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    התנתקות
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="admin-main min-w-0 flex-1 overflow-x-hidden">
          <div className="admin-content w-full min-w-0 max-w-none">{children}</div>
        </main>
      </div>
    </div>
  );
}
