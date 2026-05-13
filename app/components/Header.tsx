"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, UserRound, Sparkles, Home } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

export default function Header() {
  const { user, logout, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");

  const isProducer =
    pathname.startsWith("/producer") ||
    pathname.startsWith("/events/production");

  const navItems = [
    { label: "ראשי", href: "/" },
    { label: "אישורי הגעה", href: "/rsvp" },
    { label: "סידורי הושבה", href: "/seating-explained" },
    { label: "חבילות ומחירים", href: "/pricing" },
    { label: "ניהול והפקת אירוע", href: "/event-management" },
    { label: "צור קשר", href: "/contact" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClick}
          className={`
            relative px-1 py-2 text-[15px] font-semibold transition
            ${
              isActive(item.href)
                ? "text-[#2F261E]"
                : "text-[#5A4A3C] hover:text-[#B88A2D]"
            }
          `}
        >
          {item.label}

          {isActive(item.href) && (
            <span
              className="
                absolute -bottom-1 right-1/2 h-[2px] w-8 translate-x-1/2
                rounded-full
                bg-gradient-to-l from-[#D8B15E] via-[#B88A2D] to-[#8B6220]
              "
            />
          )}
        </Link>
      ))}
    </>
  );

  if (isProducer) {
    return (
      <header
        dir="rtl"
        className="
          fixed top-0 inset-x-0 z-50
          px-3 pt-3
          print:hidden
        "
      >
        <div
          className="
            mx-auto grid h-[74px] max-w-[1500px] grid-cols-[1fr_auto_1fr]
            items-center
            rounded-[24px]
            border border-[#D9BE80]/70
            bg-[#FFFDF8]/90
            px-5 md:px-9
            shadow-[0_18px_50px_rgba(91,65,26,0.12)]
            backdrop-blur-2xl
          "
        >
          <div className="flex justify-start">
            <Link
              href="/producer/dashboard"
              className="
                inline-flex items-center gap-2
                rounded-full
                px-5 py-2.5
                text-[16px] font-bold
                text-[#4A3A2A]
                transition
                hover:bg-[#F6EBD8]
                hover:text-[#B88A2D]
              "
            >
              <Home size={18} />
              ראשי
            </Link>
          </div>

          {/* מרכז — לוגו יוקרתי באמצע */}
<div className="flex justify-center">
  <Link
    href="/"
    aria-label="Invistimo Home"
    className="
      group flex items-center gap-3
      rounded-full
      px-4 py-2
      transition
      hover:bg-[#FFF8EA]
    "
  >
    {/* סמל */}
    <div
      className="
        relative flex h-12 w-12 items-center justify-center
        rounded-full
        border border-[#D8B15E]
        bg-gradient-to-br from-[#FFF8EA] via-[#F7E3B2] to-[#C79A3B]
        shadow-[0_10px_24px_rgba(184,134,45,0.22)]
      "
    >
      <span
        className="
          font-serif text-[28px] font-bold
          leading-none
          text-[#7A551C]
        "
      >
        I
      </span>

      <span
        className="
          absolute -left-1 top-1/2 h-[18px] w-[18px]
          -translate-y-1/2
          rounded-full
          border-l border-[#B88A2D]
          opacity-70
        "
      />

      <span
        className="
          absolute -right-1 top-1/2 h-[18px] w-[18px]
          -translate-y-1/2
          rounded-full
          border-r border-[#B88A2D]
          opacity-70
        "
      />
    </div>

    {/* טקסט */}
    <div className="hidden flex-col leading-none sm:flex" dir="ltr">
      <span
        className="
          font-serif text-[25px] font-semibold
          tracking-[0.22em]
          text-[#2F261E]
          group-hover:text-[#8B6220]
          transition
        "
      >
        INVISTIMO
      </span>

      <span
        dir="rtl"
        className="
          mt-1 text-center text-[11px] font-medium
          tracking-[0.04em]
          text-[#7A6A58]
        "
      >
        אירוע מושלם. ניהול חכם.
      </span>
    </div>
  </Link>
</div>

          <div className="flex justify-end">
            <button
              onClick={logout}
              className="
                rounded-full
                border border-[#C9A45C]/70
                bg-white/70
                px-5 py-2.5
                text-[15px] font-bold
                text-red-600
                transition
                hover:bg-red-50
                hover:text-red-700
              "
            >
              התנתקות
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header
        className="
          fixed top-0 inset-x-0 z-50
          px-3 pt-3
          print:hidden
        "
      >
        <div
          className="
            mx-auto max-w-[1500px]
            rounded-[24px]
            border border-[#D9BE80]/70
            bg-[#FFFDF8]/92
            shadow-[0_18px_55px_rgba(91,65,26,0.13)]
            backdrop-blur-2xl
          "
          dir="rtl"
        >
          <div
            className="
              grid h-[78px] grid-cols-[auto_1fr_auto]
              items-center
              gap-4
              px-4 md:grid-cols-[1fr_auto_1fr]
              md:px-8
            "
          >
            {/* ימין במובייל / ניווט בדסקטופ */}
            <div className="flex items-center justify-start">
              <nav
                className="
                  hidden items-center gap-6
                  md:flex
                  whitespace-nowrap
                "
              >
                <NavLinks />
              </nav>

              {!isDashboard && (
                <button
                  onClick={() => setMobileOpen(true)}
                  className="
                    md:hidden
                    flex h-11 w-11 items-center justify-center
                    rounded-full
                    border border-[#D7BE88]
                    bg-white/80
                    text-[#3F3328]
                    shadow-sm
                  "
                  aria-label="פתח תפריט"
                >
                  <Menu size={25} />
                </button>
              )}
            </div>

            {/* מרכז — לוגו באמצע */}
            <div className="flex justify-center" dir="ltr">
              <Link
                href="/"
                aria-label="Invistimo Home"
                className="
                  flex items-center justify-center
                  transition
                  hover:scale-[1.02]
                "
              >
                <img
                  src="/invistimo-logo.png"
                  alt="Invistimo Logo"
                  className="
                    h-[58px] w-auto select-none
                    md:h-[64px]
                    drop-shadow-[0_8px_18px_rgba(158,116,42,0.18)]
                  "
                  draggable={false}
                />
              </Link>
            </div>

            {/* שמאל — כפתורים */}
            <div className="hidden items-center justify-end gap-3 md:flex">
              <Link
                href="/try/dashboard"
                className="
                  group inline-flex items-center gap-2
                  rounded-[13px]
                  bg-gradient-to-l from-[#B8862D] via-[#C9A45C] to-[#8B6220]
                  px-6 py-3
                  text-[15px] font-extrabold
                  text-white
                  shadow-[0_12px_28px_rgba(184,134,45,0.28)]
                  transition
                  hover:-translate-y-0.5
                  hover:shadow-[0_16px_34px_rgba(184,134,45,0.34)]
                  whitespace-nowrap
                "
                title="דמו – צפייה בלבד"
              >
                <Sparkles size={17} className="transition group-hover:rotate-12" />
                נסו דמו עכשיו
              </Link>

              {!loading &&
                (user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="
                        rounded-[13px]
                        border border-[#C9A45C]/70
                        bg-white/65
                        px-5 py-3
                        text-[15px] font-bold
                        text-[#4A3A2A]
                        transition
                        hover:bg-[#F8EEDB]
                        hover:text-[#B88A2D]
                        whitespace-nowrap
                      "
                    >
                      לוח בקרה
                    </Link>

                    <button
                      onClick={logout}
                      className="
                        rounded-[13px]
                        border border-[#D8C5A7]
                        bg-white/60
                        px-5 py-3
                        text-[15px] font-bold
                        text-[#4A3A2A]
                        transition
                        hover:bg-red-50
                        hover:text-red-600
                        whitespace-nowrap
                      "
                    >
                      התנתקות
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="
                      inline-flex items-center gap-2
                      rounded-[13px]
                      border border-[#C9A45C]/75
                      bg-white/70
                      px-6 py-3
                      text-[15px] font-bold
                      text-[#4A3A2A]
                      transition
                      hover:bg-[#F8EEDB]
                      hover:text-[#B88A2D]
                      whitespace-nowrap
                    "
                  >
                    התחברות
                    <UserRound size={18} className="text-[#B88A2D]" />
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </header>

      {!isDashboard && mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden print:hidden">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />

          <aside
            className="
              absolute top-0 right-0 h-full w-[84%] max-w-sm
              border-l border-[#D9BE80]/70
              bg-[#FFFDF8]
              p-5
              shadow-[0_20px_70px_rgba(0,0,0,0.28)]
            "
            dir="rtl"
          >
            <div className="mb-7 flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center"
                dir="ltr"
              >
                <img
                  src="/invistimo-logo.png"
                  alt="Invistimo Logo"
                  className="h-[56px] w-auto"
                  draggable={false}
                />
              </Link>

              <button
                onClick={() => setMobileOpen(false)}
                className="
                  flex h-10 w-10 items-center justify-center
                  rounded-full
                  border border-[#D7BE88]
                  bg-white
                  text-[#3F3328]
                "
                aria-label="סגור תפריט"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="flex flex-col divide-y divide-[#E7D8BD] rounded-[22px] border border-[#E7D8BD] bg-white/70">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    px-5 py-4 text-[16px] font-bold transition
                    ${
                      isActive(item.href)
                        ? "bg-[#F7EBD4] text-[#9A6E24]"
                        : "text-[#4A3A2A] hover:bg-[#FAF3E7]"
                    }
                  `}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/try/dashboard"
                onClick={() => setMobileOpen(false)}
                className="
                  inline-flex w-full items-center justify-center gap-2
                  rounded-[16px]
                  bg-gradient-to-l from-[#B8862D] via-[#C9A45C] to-[#8B6220]
                  px-6 py-4
                  text-[16px] font-extrabold
                  text-white
                  shadow-[0_12px_28px_rgba(184,134,45,0.28)]
                "
                title="דמו – צפייה בלבד"
              >
                <Sparkles size={18} />
                נסו דמו עכשיו
              </Link>

              {!loading &&
                (user ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="
                        flex w-full items-center justify-center
                        rounded-[16px]
                        border border-[#C9A45C]/70
                        bg-white
                        px-6 py-4
                        text-[16px] font-bold
                        text-[#4A3A2A]
                      "
                    >
                      לוח בקרה
                    </Link>

                    <button
                      onClick={() => {
                        logout();
                        setMobileOpen(false);
                      }}
                      className="
                        flex w-full items-center justify-center
                        rounded-[16px]
                        border border-[#E2C9C9]
                        bg-white
                        px-6 py-4
                        text-[16px] font-bold
                        text-red-600
                      "
                    >
                      התנתקות
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="
                      inline-flex w-full items-center justify-center gap-2
                      rounded-[16px]
                      border border-[#C9A45C]/75
                      bg-white
                      px-6 py-4
                      text-[16px] font-bold
                      text-[#4A3A2A]
                    "
                  >
                    התחברות
                    <UserRound size={18} className="text-[#B88A2D]" />
                  </Link>
                ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}