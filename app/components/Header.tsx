"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, UserRound, Sparkles, Home } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

export default function Header() {
  const { user, logout, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [demoChoiceOpen, setDemoChoiceOpen] = useState(false);

  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");

  // ✅ לוגו:
  // מחוברת -> דשבורד
  // לא מחוברת -> ראשי
  const logoHref = user ? "/dashboard" : "/";

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

  const openDemoChoice = () => {
    setMobileOpen(false);
    setDemoChoiceOpen(true);
  };

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

          {/* ✅ לוגו לחיץ גם באזור מפיקים */}
          <div className="flex justify-center" dir="ltr">
            <Link
              href={logoHref}
              aria-label="Invistimo Home"
              className="
                block
                cursor-pointer
                transition
                hover:scale-[1.03]
              "
            >
              <img
                src="/invistimo-logo.png"
                alt="Invistimo Logo"
                className="
                  h-[58px] w-auto select-none
                  drop-shadow-[0_8px_18px_rgba(158,116,42,0.18)]
                "
                draggable={false}
              />
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
                href={logoHref}
                aria-label="Invistimo Home"
                className="
                  flex items-center justify-center
                  cursor-pointer
                  transition
                  hover:scale-[1.03]
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
              <button
                type="button"
                onClick={openDemoChoice}
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
                <Sparkles
                  size={17}
                  className="transition group-hover:rotate-12"
                />
                נסו דמו עכשיו
              </button>

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

      {/* ================= MOBILE DRAWER ================= */}
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
                href={logoHref}
                onClick={() => setMobileOpen(false)}
                className="
                  flex items-center
                  cursor-pointer
                  transition
                  hover:scale-[1.03]
                "
                dir="ltr"
              >
                <img
                  src="/invistimo-logo.png"
                  alt="Invistimo Logo"
                  className="h-[56px] w-auto select-none"
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
              <button
                type="button"
                onClick={openDemoChoice}
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
              </button>

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

      {/* ================= DEMO CHOICE MODAL ================= */}
      {demoChoiceOpen && (
        <div
          dir="rtl"
          className="
            fixed inset-0 z-[9999]
            flex items-center justify-center
            bg-black/45 px-4
            backdrop-blur-sm
            print:hidden
          "
        >
          <div
            className="
              relative
              w-full max-w-2xl
              overflow-hidden
              rounded-[32px]
              border border-[#D9BE80]/70
              bg-[#FFFDF8]
              p-6
              shadow-[0_30px_90px_rgba(43,33,24,0.24)]
            "
          >
            <button
              type="button"
              onClick={() => setDemoChoiceOpen(false)}
              className="
                absolute left-5 top-5
                flex h-10 w-10 items-center justify-center
                rounded-full
                border border-[#E7D8BD]
                bg-white
                text-[#4A3A2A]
                transition
                hover:bg-[#FAF3E7]
              "
              aria-label="סגור בחירת דמו"
            >
              <X size={20} />
            </button>

            <div className="mb-6 pl-12">
              <div
                className="
                  mb-3 inline-flex items-center gap-2
                  rounded-full
                  border border-[#E7D8BD]
                  bg-white/80
                  px-4 py-2
                  text-xs font-black
                  text-[#9A6E24]
                "
              >
                <Sparkles size={14} />
                בחירת דמו
              </div>

              <h2 className="text-2xl font-black text-[#2B2118]">
                איזה דמו תרצו לראות?
              </h2>

              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[#7A6A5E]">
                אפשר לבחור בין מערכת אישורי הגעה והושבה לבין מערכת ניהול והפקת אירוע.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Link
                href="/try/dashboard"
                onClick={() => setDemoChoiceOpen(false)}
                className="
                  group
                  rounded-[28px]
                  border border-[#E8DDD3]
                  bg-white
                  p-5
                  text-right
                  shadow-[0_12px_32px_rgba(91,65,26,0.08)]
                  transition
                  hover:-translate-y-1
                  hover:border-[#C9A45C]
                  hover:shadow-[0_20px_48px_rgba(91,65,26,0.13)]
                "
              >
                <div
                  className="
                    mb-4 flex h-13 w-13 items-center justify-center
                    rounded-2xl
                    bg-[#F5E7DC]
                    text-2xl
                  "
                >
                  👥
                </div>

                <h3 className="text-lg font-black text-[#2B2118]">
                  אישורי הגעה והושבה
                </h3>

                <p className="mt-2 text-sm font-semibold leading-6 text-[#7A6A5E]">
                  דמו למערכת הזמנות, אישורי הגעה, מוזמנים, שולחנות וסידורי הושבה.
                </p>

                <div
                  className="
                    mt-5 inline-flex rounded-2xl
                    bg-gradient-to-l from-[#B8862D] via-[#C9A45C] to-[#8B6220]
                    px-4 py-2
                    text-sm font-black text-white
                    transition
                    group-hover:scale-[1.02]
                  "
                >
                  כניסה לדמו
                </div>
              </Link>

              <Link
                href="/try/event-management"
                onClick={() => setDemoChoiceOpen(false)}
                className="
                  group
                  rounded-[28px]
                  border border-[#E8DDD3]
                  bg-white
                  p-5
                  text-right
                  shadow-[0_12px_32px_rgba(91,65,26,0.08)]
                  transition
                  hover:-translate-y-1
                  hover:border-[#C9A45C]
                  hover:shadow-[0_20px_48px_rgba(91,65,26,0.13)]
                "
              >
                <div
                  className="
                    mb-4 flex h-13 w-13 items-center justify-center
                    rounded-2xl
                    bg-[#F4EDFF]
                    text-2xl
                  "
                >
                  ✨
                </div>

                <h3 className="text-lg font-black text-[#2B2118]">
                  ניהול והפקת אירוע
                </h3>

                <p className="mt-2 text-sm font-semibold leading-6 text-[#7A6A5E]">
                  דמו לניהול ספקים, תקציב, יומן, לוגיסטיקה, אלכוהול ומתנות מהאירוע.
                </p>

                <div
                  className="
                    mt-5 inline-flex rounded-2xl
                    bg-[#2B2118]
                    px-4 py-2
                    text-sm font-black text-white
                    transition
                    group-hover:scale-[1.02]
                  "
                >
                  כניסה לדמו
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}