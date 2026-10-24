"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SupportBot from "./SupportBot";

/** Single green WhatsApp FAB — matches UserWay size (~54px), no white wrap / rings / pulse. */
export default function SupportBotButton() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    /* =====================================================
       ❌ דפים פנימיים / אחרי התחברות – לא להציג
       חשוב:
       /seating-explained הוא דף חיצוני ולכן לא חוסמים אותו
    ===================================================== */
    const isInternalPage =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/try/dashboard") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/producer") ||
      pathname.startsWith("/events") ||
      pathname.startsWith("/client") ||
      pathname.startsWith("/guests") ||
      pathname === "/seating" ||
      pathname.startsWith("/seating/");

    /* =====================================================
       ❌ דפי התחברות / הרשמה – לא להציג
    ===================================================== */
    const isAuthPage =
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/reset-password");

    /* =====================================================
       ❌ דפי הזמנות / RSVP / תודה – לא להציג
    ===================================================== */
    const isInvitationPage =
      pathname === "/thank-you" ||
      pathname.startsWith("/invite/") ||
      pathname.startsWith("/rsvp/") ||
      pathname.startsWith("/invitation/") ||
      pathname === "/w" ||
      pathname.startsWith("/w/") ||
      pathname === "/wedding-website" ||
      pathname.startsWith("/wedding-website/");

    /* =====================================================
       ✅ דף ציבורי חיצוני
       כל מה שלא פנימי / לא התחברות / לא הזמנה
    ===================================================== */
    const isPublicExternalPage =
      !isInternalPage && !isAuthPage && !isInvitationPage;

    /* =====================================================
       🍪 בדיקה אם המשתמש מחובר לפי cookies
       אם יש קוקי התחברות — לא להציג גם בדף חיצוני
    ===================================================== */
    const hasAuthCookie =
      typeof document !== "undefined" &&
      document.cookie.split(";").some((cookie) => {
        const cookieName = cookie.trim().split("=")[0];

        return (
          cookieName === "token" ||
          cookieName === "authToken" ||
          cookieName === "adminToken"
        );
      });

    const shouldShow = isPublicExternalPage && !hasAuthCookie;

    setCanShow(shouldShow);

    if (!shouldShow) {
      setOpen(false);
    }
  }, [pathname]);

  if (!canShow) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="פתיחת תמיכה בוואטסאפ"
          className="
            fixed z-[9999]
            bottom-[max(1.25rem,calc(env(safe-area-inset-bottom)+1.25rem))]
            right-[max(1.25rem,calc(env(safe-area-inset-right)+1.25rem))]
            flex h-[54px] w-[54px] items-center justify-center
            rounded-full
            bg-[#25D366]
            shadow-[0_6px_18px_rgba(0,0,0,0.22)]
            transition-transform duration-200
            hover:scale-[1.04]
            active:scale-95
            focus-visible:outline focus-visible:outline-2
            focus-visible:outline-offset-2 focus-visible:outline-[#128C7E]
            max-[360px]:h-[50px] max-[360px]:w-[50px]
          "
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M16.02 5C10.05 5 5.22 9.83 5.22 15.8C5.22 17.71 5.72 19.58 6.67 21.23L5 27L10.93 25.45C12.49 26.3 14.24 26.75 16.02 26.75C21.99 26.75 26.82 21.92 26.82 15.95C26.82 9.98 21.99 5 16.02 5Z"
              fill="white"
            />
            <path
              d="M13.14 11.15C12.86 10.53 12.57 10.52 12.31 10.51C12.1 10.5 11.86 10.5 11.62 10.5C11.38 10.5 10.98 10.59 10.64 10.96C10.3 11.34 9.35 12.2 9.35 13.95C9.35 15.7 10.67 17.39 10.85 17.63C11.03 17.87 13.27 21.47 16.78 22.84C19.69 23.98 20.29 23.75 20.93 23.69C21.57 23.63 22.99 22.84 23.28 22.05C23.57 21.26 23.57 20.58 23.48 20.43C23.39 20.28 23.14 20.19 22.77 20.01C22.41 19.83 20.59 18.93 20.26 18.81C19.93 18.69 19.69 18.63 19.45 18.99C19.21 19.35 18.54 20.13 18.33 20.37C18.12 20.61 17.9 20.64 17.54 20.46C17.17 20.28 15.98 19.9 14.56 18.63C13.45 17.64 12.69 16.42 12.48 16.06C12.27 15.7 12.46 15.51 12.64 15.33C12.8 15.17 13 14.91 13.18 14.7C13.36 14.49 13.42 14.34 13.54 14.1C13.66 13.86 13.6 13.65 13.51 13.47C13.42 13.29 12.76 11.52 13.14 11.15Z"
              fill="#25D366"
            />
          </svg>
        </button>
      )}

      {open && <SupportBot onClose={() => setOpen(false)} />}
    </>
  );
}
