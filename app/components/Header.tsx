"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Menu, X, UserRound, Sparkles, Home } from "lucide-react";
import { useAuth, getUserRedirectPath } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import {
  DesktopMarketingNav,
  MobileMarketingNav,
} from "@/app/components/header/MarketingHeaderNav";

function HeaderMark({ className }: { className: string }) {
  return (
    <span className={`relative inline-flex shrink-0 items-center ${className}`}>
      <img
        src="/invistimo-logo.png"
        alt=""
        width={180}
        height={60}
        decoding="async"
        fetchPriority="low"
        className="site-header-logo-ink h-full w-auto select-none"
        draggable={false}
      />
      <img
        src="/invistimo-logo.png"
        alt=""
        width={180}
        height={60}
        decoding="async"
        fetchPriority="low"
        className="site-header-logo-light pointer-events-none absolute inset-0 h-full w-auto select-none brightness-0 invert drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
        draggable={false}
      />
    </span>
  );
}

function isCinematicOverlayPath(pathname: string) {
  // Only the approved homepage hero is a full-bleed dark video.
  // Every other public page uses the cream header with plum text.
  return pathname === "/";
}

export default function Header() {
  const { user, logout, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [demoChoiceOpen, setDemoChoiceOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const cinematic = !isDashboard && isCinematicOverlayPath(pathname);

  const isStaffPage =
    pathname === "/staff" || pathname.startsWith("/staff/");

  // Hide only on live demo / published wedding sites — not the marketing hub.
  const isWeddingWebsite =
    pathname === "/w" ||
    pathname.startsWith("/w/") ||
    pathname.startsWith("/wedding-website/");

  const shouldHideHeader = isStaffPage || isWeddingWebsite;

  const dashboardHref = user ? getUserRedirectPath(user) : "/dashboard";
  const logoHref = "/";

  const isProducer =
    pathname.startsWith("/producer") ||
    pathname.startsWith("/events/production");

  const openDemoChoice = () => {
    setMobileOpen(false);
    setDemoChoiceOpen(true);
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    if (!cinematic) {
      el.style.setProperty("--header-p", "1");
      return;
    }

    let frame = 0;
    const update = () => {
      const progress = Math.min(1, Math.max(0, window.scrollY / 160));
      el.style.setProperty("--header-p", progress.toFixed(3));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [cinematic, pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  if (shouldHideHeader) {
    return null;
  }

  if (isProducer) {
    return (
      <header
        dir="rtl"
        className="sticky top-0 z-50 w-full bg-[#F8F5EE] px-3 py-3 print:hidden"
      >
        <div
          className="mx-auto grid h-[74px] max-w-[1500px] grid-cols-[1fr_auto_1fr] items-center rounded-[24px] border border-[#D9BE80]/70 bg-[#FFFDF8] px-5 md:px-9 shadow-[0_8px_24px_rgba(91,65,26,0.08)]"
        >
          <div className="flex justify-start">
            <Link
              href="/producer/dashboard"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[16px] font-bold text-[#4A3A2A] transition hover:bg-[#F6EBD8] hover:text-[#B88A2D]"
            >
              <Home size={18} />
              ראשי
            </Link>
          </div>

          <div className="flex justify-center" dir="ltr">
            <Link
              href="/producer/dashboard"
              aria-label="Invistimo Home"
              className="block cursor-pointer transition hover:scale-[1.03]"
            >
              <img
                src="/invistimo-logo.png"
                alt="Invistimo Logo"
                width={162}
                height={54}
                decoding="async"
                fetchPriority="low"
                className="h-[54px] w-auto select-none drop-shadow-[0_6px_14px_rgba(158,116,42,0.14)]"
                draggable={false}
              />
            </Link>
          </div>

          <div className="flex justify-end">
            <button
              onClick={logout}
              className="rounded-full border border-[#C9A45C]/70 bg-white px-5 py-2.5 text-[15px] font-bold text-red-600 transition hover:bg-red-50 hover:text-red-700"
            >
              התנתקות
            </button>
          </div>
        </div>
      </header>
    );
  }

  const headerStyle = {
    "--header-p": cinematic ? 0 : 1,
  } as CSSProperties;

  return (
    <>
      <header
        ref={headerRef}
        style={headerStyle}
        className={`site-header ${cinematic ? "fixed" : "sticky"} top-0 z-50 w-full pt-[env(safe-area-inset-top)] print:hidden`}
      >
        <div
          className="relative z-50 mx-auto max-w-[1500px] overflow-visible"
          dir="rtl"
        >
          {/* Mobile and narrow tablet: logo on the right, actions on the left */}
          <div
            className="flex h-[72px] items-center justify-between gap-3 px-4 lg:hidden"
            dir="rtl"
          >
            <Link
              href={logoHref}
              aria-label="Invistimo — חזרה לדף הבית"
              className="flex shrink-0 items-center"
            >
              <HeaderMark className="h-10 w-[120px]" />
            </Link>

            {!isDashboard && (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={openDemoChoice}
                  className="inline-flex items-center gap-1.5 rounded-none bg-[#42182F] px-3.5 py-2 text-[13px] font-extrabold text-[#FFF8F0] [&_svg]:text-current"
                  title="דמו – צפייה בלבד"
                >
                  <Sparkles size={14} />
                  דמו
                </button>
                <button
                  onClick={() => setMobileOpen(true)}
                  className="site-header-ghost flex h-11 w-11 items-center justify-center"
                  aria-label="פתח תפריט"
                  aria-expanded={mobileOpen}
                  aria-controls="mobile-main-nav"
                >
                  <Menu size={22} />
                </button>
              </div>
            )}
          </div>

          {/* Tablet landscape and desktop: logo right, nav center, actions left */}
          <div
            className="hidden h-[76px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-visible px-5 lg:grid xl:px-8"
            dir="rtl"
          >
            <div className="flex items-center justify-start">
              <Link
                href={logoHref}
                aria-label="Invistimo — חזרה לדף הבית"
                className="flex items-center"
              >
                <HeaderMark className="h-11 w-[132px] xl:h-14 xl:w-[168px]" />
              </Link>
            </div>

            <div className="relative z-[60] flex min-w-0 items-center justify-center overflow-visible">
              <DesktopMarketingNav pathname={pathname} />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={openDemoChoice}
                className="group inline-flex items-center gap-2 whitespace-nowrap rounded-none bg-[#42182F] px-4 py-2.5 text-[13px] font-extrabold text-[#FFF8F0] transition-colors hover:bg-[#842B4C] xl:px-5 xl:text-[14px] [&_svg]:text-current"
                title="דמו – צפייה בלבד"
              >
                <Sparkles size={16} className="transition group-hover:rotate-12" />
                <span className="xl:hidden">דמו</span>
                <span className="hidden xl:inline">נסו דמו עכשיו</span>
              </button>

              {!loading &&
                (user ? (
                  <>
                    <Link
                      href={dashboardHref}
                      className="site-header-ghost whitespace-nowrap px-4 py-2.5 text-[13px] font-bold xl:px-5 xl:text-[14px]"
                    >
                      לוח בקרה
                    </Link>

                    <button
                      onClick={logout}
                      className="site-header-ghost whitespace-nowrap px-4 py-2.5 text-[13px] font-bold xl:px-5 xl:text-[14px]"
                    >
                      התנתקות
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="site-header-ghost inline-flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-[13px] font-bold xl:px-5 xl:text-[14px]"
                  >
                    התחברות
                    <UserRound size={17} />
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </header>

      {!isDashboard && mobileOpen && (
        <div
          id="mobile-main-nav"
          className="fixed inset-0 z-[60] print:hidden lg:hidden"
        >
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />

          <aside
            className="absolute right-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto border-l border-[#D9BE80]/70 bg-[#FFFDF8] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.28)]"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="תפריט ראשי"
          >
            <div className="mb-6 flex items-center justify-between">
              <Link
                href={logoHref}
                onClick={() => setMobileOpen(false)}
                className="flex items-center cursor-pointer transition hover:scale-[1.03]"
                dir="ltr"
                aria-label="Invistimo — חזרה לדף הבית"
              >
                <img
                  src="/invistimo-logo.png"
                  alt="Invistimo Logo"
                  width={168}
                  height={56}
                  decoding="async"
                  fetchPriority="low"
                  className="h-[56px] w-auto select-none"
                  draggable={false}
                />
              </Link>

              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D7BE88] bg-white text-[#3F3328]"
                aria-label="סגור תפריט"
              >
                <X size={22} />
              </button>
            </div>

            <MobileMarketingNav
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={openDemoChoice}
                className="inline-flex w-full items-center justify-center gap-2 rounded-none bg-[#2F261E] px-6 py-4 text-[16px] font-extrabold text-[#FFFDF8] shadow-[0_12px_28px_rgba(47,38,30,0.18)]"
                title="דמו – צפייה בלבד"
              >
                <Sparkles size={18} className="text-[#D8B15E]" />
                נסו דמו עכשיו
              </button>

              {!loading &&
                (user ? (
                  <>
                    <Link
                      href={dashboardHref}
                      onClick={() => setMobileOpen(false)}
                      className="flex w-full items-center justify-center rounded-none border border-[#C9A45C]/70 bg-white px-6 py-4 text-[16px] font-bold text-[#4A3A2A]"
                    >
                      לוח בקרה
                    </Link>

                    <button
                      onClick={() => {
                        logout();
                        setMobileOpen(false);
                      }}
                      className="flex w-full items-center justify-center rounded-none border border-[#E2C9C9] bg-white px-6 py-4 text-[16px] font-bold text-red-600"
                    >
                      התנתקות
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-none border border-[#C9A45C]/75 bg-white px-6 py-4 text-[16px] font-bold text-[#4A3A2A]"
                  >
                    התחברות
                    <UserRound size={18} className="text-[#B88A2D]" />
                  </Link>
                ))}
            </div>
          </aside>
        </div>
      )}

      {demoChoiceOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm print:hidden"
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-[#D9BE80]/70 bg-[#FFFDF8] p-6 shadow-[0_30px_90px_rgba(43,33,24,0.24)]"
            role="dialog"
            aria-modal="true"
            aria-label="בחירת דמו"
          >
            <button
              type="button"
              onClick={() => setDemoChoiceOpen(false)}
              className="absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-[#E7D8BD] bg-white text-[#4A3A2A] transition hover:bg-[#FAF3E7]"
              aria-label="סגור בחירת דמו"
            >
              <X size={20} />
            </button>

            <div className="mb-6 pl-12">
              <div
                className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E7D8BD] bg-white/80 px-4 py-2 text-xs font-black text-[#9A6E24]"
              >
                <Sparkles size={14} />
                בחירת דמו
              </div>

              <h2 className="text-2xl font-black text-[#2B2118]">
                איזה דמו תרצו לראות?
              </h2>

              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[#7A6A5E]">
                אפשר לבחור בין מערכת אישורי הגעה והושבה לבין פלטפורמה לניהול
                האירוע.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Link
                href="/try/dashboard"
                onClick={() => setDemoChoiceOpen(false)}
                className="group rounded-[28px] border border-[#E8DDD3] bg-white p-5 text-right shadow-[0_12px_32px_rgba(91,65,26,0.08)] transition hover:-translate-y-1 hover:border-[#C9A45C] hover:shadow-[0_20px_48px_rgba(91,65,26,0.13)]"
              >
                <div
                  className="mb-4 flex h-13 w-13 items-center justify-center rounded-2xl bg-[#F5E7DC] text-2xl"
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
                  className="mt-5 inline-flex rounded-2xl bg-[#2F261E] px-4 py-2 text-sm font-black text-white transition group-hover:scale-[1.02]"
                >
                  כניסה לדמו
                </div>
              </Link>

              <Link
                href="/try/event-management"
                onClick={() => setDemoChoiceOpen(false)}
                className="group rounded-[28px] border border-[#E8DDD3] bg-white p-5 text-right shadow-[0_12px_32px_rgba(91,65,26,0.08)] transition hover:-translate-y-1 hover:border-[#C9A45C] hover:shadow-[0_20px_48px_rgba(91,65,26,0.13)]"
              >
                <div
                  className="mb-4 flex h-13 w-13 items-center justify-center rounded-2xl bg-[#F4EDFF] text-2xl"
                >
                  ✨
                </div>

                <h3 className="text-lg font-black text-[#2B2118]">
                  ניהול האירוע
                </h3>

                <p className="mt-2 text-sm font-semibold leading-6 text-[#7A6A5E]">
                  דמו לניהול ספקים, תקציב, יומן, לוגיסטיקה, אלכוהול ומתנות
                  מהאירוע.
                </p>

                <div
                  className="mt-5 inline-flex rounded-2xl bg-[#2B2118] px-4 py-2 text-sm font-black text-white transition group-hover:scale-[1.02]"
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

