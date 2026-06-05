"use client";

import Link from "next/link";
import { MessageCircle, Clock3, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const SUPPORT_COOKIE_NAME = "staffImpersonationActive";
const STAFF_ID_COOKIE_NAME = "staffOriginalUserId";

function getCookieValue(name: string) {
  if (typeof document === "undefined") return "";

  const cookies = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean);

  const found = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  if (!found) return "";

  return decodeURIComponent(found.split("=").slice(1).join("="));
}

function hasCookie(name: string) {
  return Boolean(getCookieValue(name));
}

export default function Footer() {
  const pathname = usePathname();
  const { user } = useAuth();

  const authUser = user as any;

  const isStaffPage =
    pathname === "/staff" ||
    pathname.startsWith("/staff/");

  const isStaffImpersonating =
    hasCookie(SUPPORT_COOKIE_NAME) ||
    hasCookie(STAFF_ID_COOKIE_NAME) ||
    authUser?.impersonated === true ||
    authUser?.impersonatedBy === true ||
    authUser?.impersonatedByAdmin === true ||
    Boolean(authUser?.impersonationRole);

  if (isStaffPage || isStaffImpersonating) {
    return null;
  }

  return (
    <footer
      dir="rtl"
      className="
        relative overflow-hidden
        border-t border-[#E4D2AF]
        bg-[#F7F1E8]
        text-[#4A3A2A]
      "
    >
      <div
        className="
          pointer-events-none absolute inset-0
          bg-[radial-gradient(circle_at_18%_18%,rgba(201,164,92,0.14),transparent_28%),radial-gradient(circle_at_86%_74%,rgba(255,255,255,0.72),transparent_34%)]
        "
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-16">
        <div
          className="
            grid gap-10
            rounded-[34px]
            border border-[#E4D2AF]
            bg-white/58
            p-6
            shadow-[0_24px_70px_rgba(95,68,34,0.08)]
            backdrop-blur-xl
            md:p-10
            lg:grid-cols-[1.1fr_0.9fr]
          "
        >
          <div className="text-center lg:text-right">
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-[#E3D1AE] bg-[#FFF9EF]/80 px-5 py-2.5 text-[#B8862D]">
              <Sparkles size={18} />
              <span className="text-[13px] font-black tracking-[0.12em]">
                INVISTIMO
              </span>
            </div>

            <h2
              className="
                text-[30px]
                font-black
                leading-[1.2]
                tracking-[-0.03em]
                text-[#3A3028]
                md:text-[40px]
              "
            >
              ניהול אירוע חכם,
              <br />
              מסודר ואלגנטי.
            </h2>

            <p className="mt-4 max-w-[620px] text-[16px] font-semibold leading-[1.9] text-[#6B5A49] lg:mx-0 mx-auto">
              Invistimo מרכזת הזמנות דיגיטליות, אישורי הגעה, הושבה והודעות
              לאורחים — כדי שתנהלו את האירוע בראש שקט ובסטייל.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              {["אישורי הגעה", "הושבה חכמה", "הודעות לאורחים"].map((item) => (
                <span
                  key={item}
                  className="
                    rounded-full
                    border border-[#E5D5B6]
                    bg-[#FFFDF8]/80
                    px-4 py-2
                    text-[13px]
                    font-bold
                    text-[#735B3C]
                    shadow-[0_8px_22px_rgba(95,68,34,0.04)]
                  "
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div
            className="
              rounded-[28px]
              border border-[#E3D1AE]
              bg-[#FFFDF8]/78
              p-6
              shadow-[0_18px_44px_rgba(95,68,34,0.08)]
              backdrop-blur-xl
            "
          >
            <div className="mb-5 flex items-center justify-center gap-3 lg:justify-start">
              <div
                className="
                  flex h-12 w-12 items-center justify-center
                  rounded-2xl
                  bg-gradient-to-br from-[#FFF5E3] to-[#F3E1B9]
                  text-[#B8862D]
                  shadow-[0_12px_28px_rgba(184,134,45,0.14)]
                "
              >
                <MessageCircle size={24} />
              </div>

              <div>
                <h3 className="text-[20px] font-black text-[#3D3127]">
                  צריכים עזרה?
                </h3>
                <p className="text-sm font-semibold text-[#7A6A58]">
                  אנחנו כאן בשבילכם
                </p>
              </div>
            </div>

            <div className="space-y-3 text-center lg:text-right">
              <div className="flex items-center justify-center gap-2 text-[#6B5A49] lg:justify-start">
                <Clock3 size={18} className="text-[#B8862D]" />
                <span className="text-sm font-bold">שעות הפעילות שלנו</span>
              </div>

              <p className="text-sm leading-relaxed text-[#6B5A49]">
                ימים א׳–ה׳: 09:00–18:00
                <br />
                שישי וערבי חג: 09:00–12:00
              </p>
            </div>

            <a
              href="https://wa.me/972555039072"
              target="_blank"
              rel="noopener noreferrer"
              className="
                mt-6 inline-flex w-full items-center justify-center gap-3
                rounded-full
                bg-[#3F3A34]
                px-6 py-4
                text-[15px]
                font-extrabold
                text-white
                shadow-[0_16px_34px_rgba(63,58,52,0.18)]
                transition
                hover:-translate-y-0.5
                hover:bg-[#2F2B27]
              "
            >
              <span>צ׳אט עם נציג ב־WhatsApp</span>

              <img
                src="/icons/whatsapp.png"
                alt="WhatsApp"
                className="h-5 w-5"
              />
            </a>

            <Link
              href="/contact"
              className="
                mt-3 inline-flex w-full items-center justify-center gap-2
                rounded-full
                border border-[#8B6A3E]/35
                bg-white/70
                px-6 py-3.5
                text-[14px]
                font-extrabold
                text-[#4A3A2A]
                transition
                hover:bg-white
                hover:text-[#B8862D]
              "
            >
              <Mail size={17} />
              יצירת קשר
            </Link>
          </div>
        </div>

        <div
          className="
            mt-10 flex flex-col items-center justify-between gap-7
            border-t border-[#E4D2AF]
            pt-8
            lg:flex-row
          "
        >
          <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm font-bold text-[#6B5A49]">
            <Link href="/faq" className="transition hover:text-[#B8862D]">
              שאלות ותשובות
            </Link>

            <Link href="/terms" className="transition hover:text-[#B8862D]">
              תקנון שימוש
            </Link>

            <Link href="/privacy" className="transition hover:text-[#B8862D]">
              מדיניות פרטיות
            </Link>

            <Link
              href="/accessibility"
              className="transition hover:text-[#B8862D]"
            >
              הצהרת נגישות
            </Link>

            <Link href="/contact" className="transition hover:text-[#B8862D]">
              יצירת קשר
            </Link>
          </nav>

          <div className="flex items-center gap-2 text-sm font-semibold text-[#7A6A58]">
            <ShieldCheck size={17} className="text-[#B8862D]" />
            <span>
              © {new Date().getFullYear()} Invistimo · כל הזכויות שמורות
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}