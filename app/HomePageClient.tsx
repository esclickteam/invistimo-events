"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HomeMarketingSections from "@/components/marketing/HomeMarketingSections";

/* =====================================================
   DEMO BUTTON
===================================================== */
function DemoButton({
  children,
  variant = "gold",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "gold" | "dark";
  className?: string;
}) {
  const router = useRouter();

  const baseClass =
    variant === "dark"
      ? `
        group inline-flex w-full min-w-0
        items-center justify-center gap-3
        rounded-full
        bg-[#3F3A34]
        px-6 py-4
        text-[17px] font-extrabold
        text-white
        shadow-[0_18px_40px_rgba(63,58,52,0.20)]
        transition
        hover:-translate-y-0.5
        hover:bg-[#2F2B27]
        sm:w-auto sm:min-w-[220px] sm:px-10
      `
      : `
        group inline-flex w-full min-w-0
        items-center justify-center gap-3
        rounded-full
        bg-gradient-to-l from-[#B8862D] via-[#C9A45C] to-[#8B6220]
        px-6 py-4
        text-[16px] font-extrabold
        text-white
        shadow-[0_18px_38px_rgba(184,134,45,0.26)]
        transition
        hover:-translate-y-0.5
        hover:shadow-[0_22px_46px_rgba(184,134,45,0.34)]
        sm:w-auto sm:min-w-[220px] sm:px-9
      `;

  return (
    <>
      <button
        type="button"
        onClick={() => router.push("/try")}
        className={`${baseClass} ${className}`}
      >
        {children}
      </button>
    </>
  );
}

/* =====================================================
   HERO PHONE — CLEAN 3D VIDEO PHONE
===================================================== */
function HeroPhone3D() {
  const [reduceMotion, setReduceMotion] = useState(false);
  /** Defer heavy webm until after first paint / LCP candidate (poster + hero bg). */
  const [videoReady, setVideoReady] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  useEffect(() => {
    if (reduceMotion) return;
    let cancelled = false;
    const conn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    // Skip ~7MB autoplay on data-saver / 2g — keep poster (LCP-safe).
    if (conn?.saveData || conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g") {
      return;
    }
    // Mobile: poster only (no competing 7MB webm). Desktop: play after load/idle.
    const desktopMq = window.matchMedia("(min-width: 768px)");
    if (!desktopMq.matches) return;

    const enable = () => {
      if (!cancelled) setVideoReady(true);
    };
    const start = () => {
      const ric = (
        window as Window & {
          requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback;
      if (typeof ric === "function") {
        ric(enable, { timeout: 3500 });
      } else {
        setTimeout(enable, 2500);
      }
    };
    if (document.readyState === "complete") {
      const t = setTimeout(start, 400);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    window.addEventListener("load", start, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
    };
  }, [reduceMotion]);

  return (
    <div
      className="
        relative z-10
        flex w-full items-center justify-center
        min-h-[420px]
        md:min-h-[500px]
        lg:min-h-[540px]
      "
      style={{ perspective: "1800px" }}
    >
      <div
        className="
          pointer-events-none absolute
          bottom-[22px] left-1/2
          h-[36px] w-[290px]
          -translate-x-1/2
          rounded-full
          bg-black/14
          blur-2xl
          md:w-[360px]
        "
      />

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{
          opacity: 1,
          y: [0, -8, 0],
        }}
        transition={{
          opacity: { duration: 0.8 },
          y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
        }}
        className="
          relative
          h-[485px] w-[242px]
          md:h-[570px] md:w-[285px]
          lg:h-[610px] lg:w-[305px]
        "
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(20deg) rotateX(6deg) rotateZ(-6deg)",
        }}
      >
        <div
          className="
            absolute inset-0
            rounded-[52px]
            bg-gradient-to-br from-[#050505] via-[#202020] to-[#050505]
            shadow-[38px_42px_85px_rgba(37,28,17,0.30),-16px_18px_45px_rgba(201,164,92,0.12)]
          "
          style={{
            transform: "translateZ(-18px) translateX(-11px)",
          }}
        />

        <div
          className="
            absolute -left-[14px] top-[34px]
            h-[90%] w-[21px]
            rounded-l-[40px]
            bg-gradient-to-b from-[#303030] via-[#080808] to-[#1A1A1A]
            shadow-[inset_5px_0_12px_rgba(255,255,255,0.08)]
          "
          style={{
            transform: "translateZ(-8px)",
          }}
        />

        <div
          className="
            absolute inset-0
            rounded-[52px]
            bg-gradient-to-br from-[#080808] via-[#282828] to-[#050505]
            p-[9px]
            shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]
          "
          style={{
            transform: "translateZ(18px)",
          }}
        >
          <span className="absolute -left-[5px] top-[130px] h-16 w-[4px] rounded-l bg-[#111]" />
          <span className="absolute -left-[5px] top-[210px] h-12 w-[4px] rounded-l bg-[#111]" />
          <span className="absolute -right-[4px] top-[170px] h-24 w-[4px] rounded-r bg-[#111]" />

          <div
            className="
              relative h-full w-full
              overflow-hidden
              rounded-[42px]
              bg-white
            "
          >
            <div
              className="
                absolute left-1/2 top-4 z-40
                h-[26px] w-[100px]
                -translate-x-1/2
                rounded-full
                bg-black
                shadow-[0_2px_8px_rgba(0,0,0,0.55)]
              "
            />

            {reduceMotion ? (
              <img
                src="/marketing/invites/invite-wedding-mia-alon.webp"
                alt="הזמנה דיגיטלית — החתונה של מיה ואלון"
                className="h-full w-full bg-[#FBF6EE] object-contain object-top"
                draggable={false}
              />
            ) : videoReady ? (
              <video
                className="h-full w-full bg-[#FBF6EE] object-cover object-top"
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                poster="/marketing/videos/hero-guest-journey-poster.jpg"
                aria-label="מסע אורח: הודעת WhatsApp, הזמנה של מיה ואלון, ואישור הגעה"
              >
                <source src="/marketing/videos/hero-guest-journey.webm" type="video/webm" />
              </video>
            ) : (
              <img
                src="/marketing/videos/hero-guest-journey-poster.jpg"
                alt="מסע אורח: הודעת WhatsApp, הזמנה של מיה ואלון, ואישור הגעה"
                className="h-full w-full bg-[#FBF6EE] object-cover object-top"
                draggable={false}
              />
            )}

            <div
              className="
                pointer-events-none absolute inset-0
                bg-gradient-to-tr
                from-white/0
                via-white/10
                to-white/0
              "
            />

            <div
              className="
                pointer-events-none absolute inset-0
                rounded-[42px]
                border border-white/15
              "
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function HomePageClient() {
  // Landmark <main> lives in LayoutShell — avoid nested <main> here.
  return (
    <div className="overflow-x-hidden bg-[#F4F0E8] pb-[max(5.5rem,env(safe-area-inset-bottom))] text-[#2C241C]">
      {/* ================= HERO — brand-first composition ================= */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 z-0 bg-[url('/homep1.webp')] bg-cover bg-center"
          aria-hidden
        />
        {/* Mobile/tablet: cream veil so espresso type stays readable over the photo.
            Desktop (lg+): keep the approved diagonal wash (dark → cream). */}
        <div
          className="absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(247,241,232,0.94)_0%,rgba(244,240,232,0.88)_42%,rgba(244,240,232,0.72)_100%)] lg:bg-[linear-gradient(105deg,rgba(18,14,10,0.72)_0%,rgba(42,33,26,0.35)_42%,rgba(244,240,232,0.88)_72%,rgba(244,240,232,0.96)_100%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-30 mix-blend-soft-light lg:opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(201,164,92,0.35), transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.25), transparent 35%)",
          }}
          aria-hidden
        />

        <div
          dir="rtl"
          className="relative z-10 mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-8 px-4 pb-12 pt-6 max-[360px]:px-3 sm:px-5 md:gap-10 md:px-10 md:pb-14 md:pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pt-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            className="text-center lg:text-right"
          >
            <h1 className="text-[36px] font-black leading-[1.1] tracking-[-0.04em] text-[#2C241C] max-[360px]:text-[32px] sm:text-[40px] md:text-[58px] lg:text-[68px]">
              האירוע שלכם.
              <span className="mt-2 block bg-gradient-to-l from-[#6E4E1F] via-[#A67C2D] to-[#8B6220] bg-clip-text text-transparent lg:from-[#8B642B] lg:via-[#D4B06A] lg:to-[#B88A2D]">
                הסדר שלנו.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-[36rem] text-[16px] font-semibold leading-8 text-[#3F3328] sm:text-[17px] md:text-[19px] lg:mx-0 lg:text-[#4A3F34]">
              מהרגע שבו שולחים את ההזמנה ועד שהאורח האחרון מוצא את מקומו — כל הפרטים
              הקטנים שמאחורי אירוע גדול, במקום אחד.
              <span className="mt-3 block">
                הזמנות דיגיטליות, אישורי הגעה, סידורי הושבה ועוד הרבה יותר, כדי שאתם
                תוכלו להתרגש מהרגעים החשובים באמת.
              </span>
            </p>
            <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4 lg:justify-start">
              <DemoButton className="w-full min-w-0 sm:w-auto sm:min-w-[220px]">
                בואו נתחיל
                <span className="transition group-hover:-translate-x-1">←</span>
              </DemoButton>
              <Link
                href="/pricing"
                className="inline-flex w-full min-w-0 items-center justify-center rounded-full border border-[#2C241C]/25 bg-[#F7F1E8]/95 px-6 py-4 text-[16px] font-extrabold text-[#2C241C] shadow-[0_14px_32px_rgba(28,22,18,0.12)] transition hover:bg-white sm:w-auto sm:min-w-[220px] sm:px-9"
              >
                החבילות שלנו
              </Link>
            </div>
          </motion.div>

          <div className="relative mx-auto flex w-full max-w-[560px] items-center justify-center py-2 lg:max-w-none lg:py-0">
            {/* Side invites fan behind the phone on every breakpoint — including phones. */}
            <motion.img
              initial={{ opacity: 0, x: 36, rotate: 10 }}
              animate={{ opacity: 1, x: 0, rotate: 8 }}
              transition={{ duration: 0.9, delay: 0.15 }}
              src="/marketing/invites/invite-wedding-mia-alon.webp"
              alt="הזמנה דיגיטלית לחתונה — מיה ואלון"
              className="pointer-events-none absolute left-0 top-3 z-0 w-[46%] max-w-[160px] -translate-x-[18%] rounded-xl object-cover shadow-[0_18px_40px_rgba(20,14,10,0.32)] max-[360px]:w-[50%] max-[360px]:-translate-x-[22%] sm:left-auto sm:-left-2 sm:top-8 sm:w-[42%] sm:max-w-[220px] sm:translate-x-0 sm:shadow-[0_24px_50px_rgba(20,14,10,0.35)] lg:-left-4"
              fetchPriority="low"
              decoding="async"
              draggable={false}
            />
            <motion.img
              initial={{ opacity: 0, x: -36, rotate: -12 }}
              animate={{ opacity: 1, x: 0, rotate: -10 }}
              transition={{ duration: 0.9, delay: 0.25 }}
              src="/marketing/invites/invite-save-the-date-maya-itai.webp"
              alt="כרטיס Save the Date לדוגמה"
              className="pointer-events-none absolute right-0 bottom-5 z-0 w-[42%] max-w-[148px] translate-x-[16%] rounded-xl object-cover shadow-[0_18px_40px_rgba(20,14,10,0.32)] max-[360px]:w-[46%] max-[360px]:translate-x-[20%] sm:right-auto sm:-right-1 sm:bottom-10 sm:w-[38%] sm:max-w-[200px] sm:translate-x-0 sm:shadow-[0_24px_50px_rgba(20,14,10,0.35)] lg:-right-2"
              fetchPriority="low"
              decoding="async"
              draggable={false}
            />
            <div className="relative z-10 w-full max-w-[248px] sm:max-w-[320px]">
              <HeroPhone3D />
            </div>
          </div>
        </div>
      </section>

      <HomeMarketingSections />
    </div>
  );
}