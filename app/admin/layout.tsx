"use client";

// 🔒 קריטי לספארי iOS – מונע snapshot / BFCache
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

/* =====================================================
   ADMIN LAYOUT
===================================================== */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // ✅ שמתי any כדי שלא יישבר אם ה־AuthContext שלך לא מוגדר עם user בטייפים
  const auth = useAuth() as any;
  const { logout } = auth;

  const user = auth?.user || auth?.currentUser || null;

  const adminName =
    user?.name ||
    user?.fullName ||
    user?.email ||
    "Admin";

  const pathname = usePathname();

  const nav = [
    {
      href: "/admin",
      label: "סקירה",
      icon: "overview",
      description: "תמונת מצב כללית",
    },
    {
      href: "/admin/users",
      label: "משתמשים",
      icon: "users",
      description: "ניהול לקוחות ומשתמשים",
    },
    {
      href: "/admin/employees",
      label: "עובדים",
      icon: "employees",
      description: "תיק עובד, מסמכים ושעות",
    },
    {
      href: "/admin/employees/shifts",
      label: "שיבוץ משמרות",
      icon: "calendar",
      description: "שעות, מיקום ובית/אולם",
    },
    {
      href: "/admin/call-recordings",
      label: "הקלטות שיחות",
      icon: "recordings",
      description: "האזנה וניהול הקלטות",
    },
  ];

  /* --------------------------------------------------
     LOGOUT
  -------------------------------------------------- */
  const handleLogout = async () => {
    await logout();
    setOpen(false);
  };

  const isActivePath = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div
      className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 text-slate-900"
      dir="rtl"
    >
      {/* ================= Mobile Header ================= */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 shadow-sm backdrop-blur md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xl font-black text-slate-700"
          aria-label="Open menu"
          type="button"
        >
          ☰
        </button>

        <div className="text-center">
          <p className="text-sm font-black text-slate-900">Admin Panel</p>
          <p className="text-[11px] font-bold text-slate-400">Invistimo</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-black text-indigo-700">
          ⚡
        </div>
      </header>

      {/* ================= Overlay Mobile ================= */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ================= Sidebar ================= */}
      <aside
        className={`
          fixed right-0 top-0 z-50 flex h-full w-[292px] flex-col
          border-l border-white/70 bg-white/92 p-5 shadow-[-18px_0_60px_rgba(79,70,229,0.12)]
          backdrop-blur-xl transition-transform duration-300
          md:sticky md:top-0 md:translate-x-0
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-13 w-13 items-center justify-center rounded-[22px] bg-gradient-to-br from-indigo-500 to-violet-500 p-3 text-lg font-black text-white shadow-lg shadow-indigo-200">
              🛡️
            </div>

            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Admin Panel
              </h2>
              <p className="mt-0.5 text-xs font-bold text-slate-400">
                Invistimo Management
              </p>
            </div>
          </div>

          <button
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-lg font-black text-slate-600 md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Admin Card */}
        <div className="mb-6 rounded-[26px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-indigo-700 shadow-sm ring-1 ring-indigo-100">
              {String(adminName).slice(0, 2)}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900">
                {adminName}
              </p>
              <p className="mt-1 text-xs font-bold text-indigo-500">
                מנהל מערכת
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-2">
          {nav.map((item) => {
            const isActive = isActivePath(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`
                  group flex items-center gap-3 rounded-[22px] px-4 py-3 transition
                  ${
                    isActive
                      ? "bg-gradient-to-l from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-100"
                      : "border border-transparent text-slate-600 hover:border-indigo-100 hover:bg-indigo-50 hover:text-indigo-700"
                  }
                `}
              >
                <span
                  className={`
                    flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base transition
                    ${
                      isActive
                        ? "bg-white/18 text-white"
                        : "bg-slate-50 text-slate-500 group-hover:bg-white group-hover:text-indigo-600"
                    }
                  `}
                >
                  <NavIcon name={item.icon} />
                </span>

                <span className="min-w-0">
                  <span
                    className={`
                      block text-sm font-black
                      ${isActive ? "text-white" : "text-slate-800"}
                    `}
                  >
                    {item.label}
                  </span>

                  <span
                    className={`
                      mt-0.5 block truncate text-[11px] font-bold
                      ${isActive ? "text-white/75" : "text-slate-400"}
                    `}
                  >
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
          <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-black text-slate-500">מערכת</p>
            <p className="mt-1 text-sm font-black text-slate-900">
              Invistimo Admin
            </p>
            <p className="mt-1 text-xs font-bold text-slate-400">
              ניהול לקוחות, עובדים ודוחות
            </p>
          </div>

          <button
            onClick={handleLogout}
            type="button"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 text-sm font-black text-rose-600 transition hover:bg-rose-100"
          >
            <span>התנתקות</span>
            <span>↩</span>
          </button>
        </div>
      </aside>

      {/* ================= Content ================= */}
      <main className="w-full flex-1 p-4 pt-20 md:p-8 md:pt-8">
        <div className="mx-auto w-full max-w-[1700px]">{children}</div>
      </main>
    </div>
  );
}

/* =====================================================
   ICONS
===================================================== */
function NavIcon({ name }: { name: string }) {
  const common = {
    className: "h-5 w-5",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "overview") {
    return (
      <svg {...common}>
        <path d="M3 13h8V3H3z" />
        <path d="M13 21h8v-8h-8z" />
        <path d="M13 3h8v6h-8z" />
        <path d="M3 21h8v-4H3z" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg {...common}>
        <path d="M17 21a5 5 0 0 0-10 0" />
        <circle cx="12" cy="7" r="4" />
        <path d="M22 21a4 4 0 0 0-3-3.87" />
        <path d="M2 21a4 4 0 0 1 3-3.87" />
      </svg>
    );
  }

  if (name === "employees") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="M6.5 16a3 3 0 0 1 5 0" />
        <path d="M14 9h4" />
        <path d="M14 13h4" />
        <path d="M14 17h3" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 14h.01" />
        <path d="M12 14h.01" />
        <path d="M16 14h.01" />
        <path d="M8 18h.01" />
        <path d="M12 18h.01" />
      </svg>
    );
  }

  if (name === "recordings") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v3" />
        <path d="M12 18v3" />
        <path d="M3 12h3" />
        <path d="M18 12h3" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}