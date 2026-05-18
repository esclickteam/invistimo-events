"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Crown,
  Handshake,
  LayoutDashboard,
  ListChecks,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import ContactForm from "@/app/components/event/ContactForm";

const RSVP_DEMO_URL = "/try/dashboard";
const EVENT_MANAGEMENT_DEMO_URL = "/try/event-management";

export default function EventManagementPage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const scrollToContact = () => {
    document
      .getElementById("contact")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goToDemo = (url) => {
    window.location.href = url;
  };

  return (
    <div dir="rtl" className="w-full overflow-hidden bg-[#F8F2E8] text-right">
      {/* HERO */}
      <section className="relative min-h-[690px] overflow-hidden bg-[#F8F2E8]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFFDF8] via-[#F8F2E8] to-[#F8F2E8]" />

        <div className="absolute -right-40 top-10 h-[520px] w-[520px] rounded-full border border-[#D7BB7A]/25" />
        <div className="absolute -right-20 top-28 h-[360px] w-[360px] rounded-full border border-[#D7BB7A]/20" />
        <div className="absolute -left-32 bottom-0 h-[520px] w-[520px] rounded-full bg-[#FFFDF8]/70 blur-3xl" />
        <div className="absolute left-16 top-24 h-72 w-72 rounded-full bg-[#EFE2CF]/55 blur-3xl" />
        <div className="absolute right-1/2 top-10 h-80 w-80 translate-x-1/2 rounded-full bg-[#F4E2B8]/30 blur-3xl" />

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-[linear-gradient(120deg,transparent_0%,#FFFFFF70_45%,transparent_100%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-[linear-gradient(to_top,#FFFDF8_0%,transparent_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[690px] max-w-7xl items-center px-4 py-24">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-[#D7BB7A]/60 bg-[#FFFDF7]/85 px-5 py-2 text-sm font-bold text-[#A77A25] shadow-sm backdrop-blur">
              <Sparkles size={17} />
              ניהול אירוע חכם, מסודר ויוקרתי
            </div>

            <h1 className="mx-auto max-w-5xl text-4xl font-black leading-tight tracking-tight text-[#2F2F2F] md:text-6xl">
              מערכת עצמאית לניהול אירוע
              <span className="block bg-gradient-to-l from-[#B8892D] via-[#C9A24D] to-[#8E6720] bg-clip-text text-transparent">
                עם אפשרות לליווי מקצועי
              </span>
            </h1>

            <div className="mx-auto my-7 flex max-w-md items-center justify-center gap-4">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#D3B36D]" />
              <Sparkles size={18} className="text-[#B8892D]" />
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#D3B36D]" />
            </div>

            <p className="mx-auto max-w-3xl text-lg font-medium leading-9 text-[#72685D] md:text-xl">
              ב־Invistimo תקבלו מערכת עצמאית וחכמה לניהול האירוע שלכם — עם
              אפשרות להוסיף ליווי אישי של מפיקת אירועים מקצועית וניהול בפועל
              באולם ביום האירוע, כדי שתגיעו לאירוע החלומות שלכם בצורה מסודרת,
              רגועה ומדויקת.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(true)}
                className="
                  group inline-flex min-w-[210px] items-center justify-center gap-2
                  rounded-2xl bg-gradient-to-l from-[#B8892D] via-[#C49A3A] to-[#A77A25]
                  px-8 py-4 text-base font-extrabold text-white
                  shadow-2xl shadow-[#B8892D]/20
                  transition hover:-translate-y-0.5 hover:shadow-[#B8892D]/30
                "
              >
                נסו דמו עכשיו
                <ArrowLeft
                  size={18}
                  className="transition group-hover:-translate-x-1"
                />
              </button>

              <button
                type="button"
                onClick={scrollToContact}
                className="
                  inline-flex min-w-[210px] items-center justify-center gap-2
                  rounded-2xl border border-[#D8C6A0] bg-[#FFFDF8]/90
                  px-8 py-4 text-base font-extrabold text-[#2F2F2F]
                  shadow-lg shadow-[#B8892D]/8 backdrop-blur
                  transition hover:-translate-y-0.5 hover:bg-white
                "
              >
                לפרטים נוספים
              </button>
            </div>

            <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
              <HeroMiniCard
                icon={<LayoutDashboard size={22} />}
                text="מערכת ניהול עצמאית"
              />
              <HeroMiniCard
                icon={<Handshake size={22} />}
                text="ליווי מפיקת אירועים"
              />
              <HeroMiniCard
                icon={<Timer size={22} />}
                text="ניהול באולם ביום האירוע"
              />
            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="relative bg-[#FFFDF8] px-4 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#D7BB7A_0%,transparent_36%)] opacity-20" />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D7BB7A]/55 bg-[#FFFDF8]/85 px-4 py-2 text-sm font-bold text-[#A77A25] shadow-sm">
                <Crown size={16} />
                אירוע מסודר מתחיל בניהול נכון
              </div>

              <h2 className="text-3xl font-black leading-tight text-[#2F2F2F] md:text-5xl">
                אתם חולמים על האירוע,
                <span className="block text-[#A77A25]">
                  אנחנו עוזרים לנהל אותו נכון.
                </span>
              </h2>

              <p className="mt-6 text-lg leading-9 text-[#72685D]">
                תכנון אירוע כולל עשרות החלטות, ספקים, תשלומים, משימות, אישורי
                הגעה, הושבה ועדכונים של הרגע האחרון. בדיוק בשביל זה בנינו את
                Invistimo — מערכת עצמאית שמרכזת את כל ניהול האירוע במקום אחד,
                ובנוסף מאפשרת לקבל ליווי של מפיקת אירועים מקצועית וניהול באולם
                עצמו ביום האירוע.
              </p>
            </div>

            <div className="rounded-[2rem] border border-[#E2D0AA] bg-[#FFFDF8]/80 p-6 shadow-2xl shadow-[#B8892D]/10 backdrop-blur">
              <div className="rounded-[1.5rem] bg-[#FFFDF8] p-6 shadow-xl shadow-[#B8892D]/5">
                <h3 className="mb-5 text-xl font-black text-[#2F2F2F]">
                  מה אתם מקבלים?
                </h3>

                <div className="space-y-4">
                  <CheckLine text="מערכת עצמאית לניהול כל שלבי האירוע" />
                  <CheckLine text="ניהול משימות, ספקים, תקציב, תשלומים ולו״ז" />
                  <CheckLine text="אישורי הגעה, הושבה חכמה וניהול קבוצות" />
                  <CheckLine text="אפשרות לליווי אישי של מפיקת אירועים" />
                  <CheckLine text="אפשרות לניהול בפועל באולם ביום האירוע" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN SERVICE CARDS */}
      <section className="bg-gradient-to-b from-[#FFFDF8] via-[#F8F2E8] to-[#FFFDF8] px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-3 text-sm font-black tracking-[0.25em] text-[#A77A25]">
              INVISTIMO EVENT MANAGEMENT
            </p>

            <h2 className="text-3xl font-black text-[#2F2F2F] md:text-5xl">
              מארגנים אירוע? ככה נוכל לעזור
            </h2>

            <p className="mt-5 text-lg leading-8 text-[#7A7064]">
              המערכת היא הבסיס לניהול עצמאי ומסודר של האירוע, ומי שרוצה יכול
              להוסיף ליווי מקצועי של מפיקת אירועים וניהול באולם ביום האירוע.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <ServiceCard
              icon={<LayoutDashboard size={34} />}
              title="מערכת ניהול עצמאית"
              text="מערכת עצמאית שמרכזת את כל ניהול האירוע במקום אחד — משימות, ספקים, תקציב, תשלומים, לו״ז, אישורי הגעה, הושבה וניהול יום האירוע."
            />

            <ServiceCard
              icon={<Handshake size={34} />}
              title="ליווי של מפיקת אירועים"
              text="למי שרוצה מעבר למערכת העצמאית, ניתן להוסיף ליווי של מפיקת אירועים מקצועית — משלב התכנון ועד קבלת החלטות חשובות בדרך."
            />

            <ServiceCard
              icon={<Star size={34} />}
              title="ניהול באולם ביום האירוע"
              text="ביום האירוע ניתן לקבל ניהול בפועל באולם, מעקב אחר הגעת אורחים, שולחנות, ספקים ועדכונים בזמן אמת — כדי שהכל יעבוד חלק."
            />
          </div>
        </div>
      </section>

      {/* SELF MANAGEMENT SYSTEM */}
      <section className="relative bg-[#F8F2E8] px-4 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#D7BB7A_0%,transparent_28%)] opacity-20" />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="order-2 lg:order-1">
              <div className="rounded-[2rem] border border-[#D8C6A0] bg-[#FFFDF8] p-5 shadow-2xl shadow-[#B8892D]/10">
                <div className="rounded-[1.5rem] border border-[#E2D0AA] bg-gradient-to-b from-[#FFFDF8] via-[#F8F2E8] to-[#EFE2CF] p-6 text-[#2F2F2F] shadow-inner">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#A77A25]">
                        דשבורד אירוע
                      </p>
                      <h3 className="mt-1 text-2xl font-black">
                        תמונת מצב מלאה
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-[#D7BB7A]/20 p-3 text-[#A77A25]">
                      <LayoutDashboard size={28} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <DashboardBox label="משימות פתוחות" value="12" />
                    <DashboardBox label="ספקים במעקב" value="8" />
                    <DashboardBox label="אישרו הגעה" value="246" />
                    <DashboardBox label="שולחנות" value="31" />
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#D8C6A0] bg-[#FFFDF8]/75 p-4">
                    <div className="mb-3 flex items-center justify-between text-sm">
                      <span className="font-bold">התקדמות תכנון האירוע</span>
                      <span className="text-[#A77A25]">78%</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-[#E8DCC8]">
                      <div className="h-full w-[78%] rounded-full bg-gradient-to-l from-[#B8892D] to-[#F4E2B8]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D7BB7A]/60 bg-[#FFFDF8]/85 px-4 py-2 text-sm font-bold text-[#A77A25] shadow-sm">
                <ClipboardCheck size={16} />
                מערכת עצמאית להפקת אירוע
              </div>

              <h2 className="text-3xl font-black leading-tight text-[#2F2F2F] md:text-5xl">
                מערכת עצמאית לניהול האירוע,
                <span className="block text-[#A77A25]">
                  עם אפשרות לליווי מקצועי.
                </span>
              </h2>

              <p className="mt-6 text-lg leading-9 text-[#72685D]">
                המערכת של Invistimo מאפשרת לכם לנהל את כל תהליך האירוע בצורה
                עצמאית, מסודרת וברורה — בלי אקסלים מפוזרים, בלי פתקים ובלי
                הודעות וואטסאפ שהולכות לאיבוד. הכל מרוכז במקום אחד, ובמידת
                הצורך ניתן להוסיף גם ליווי של מפיקת אירועים וניהול בפועל באולם
                ביום האירוע.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FeaturePill text="ניהול משימות" />
                <FeaturePill text="ניהול ספקים" />
                <FeaturePill text="תקציב ותשלומים" />
                <FeaturePill text="לו״ז יום האירוע" />
                <FeaturePill text="אישורי הגעה" />
                <FeaturePill text="הושבה חכמה" />
                <FeaturePill text="ניהול קבוצות" />
                <FeaturePill text="מעקב בזמן אמת" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="bg-[#FFFDF8] px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-3 text-sm font-black tracking-[0.25em] text-[#A77A25]">
              ALL IN ONE
            </p>

            <h2 className="text-3xl font-black text-[#2F2F2F] md:text-5xl">
              כל מה שצריך לניהול אירוע מסודר
            </h2>

            <p className="mt-5 text-lg leading-8 text-[#7A7064]">
              המערכת בנויה כדי לתת לכם שליטה מלאה — מהתכנון הראשוני ועד ניהול
              האורחים בפועל ביום האירוע.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<ListChecks size={28} />}
              title="ניהול משימות"
              text="רשימת משימות מסודרת לפי סטטוס, תיעדוף ושלבי ההפקה."
            />

            <FeatureCard
              icon={<Users size={28} />}
              title="ניהול ספקים"
              text="שמירת ספקים, פרטי קשר, סטטוסים, הערות והתקדמות."
            />

            <FeatureCard
              icon={<WalletCards size={28} />}
              title="תקציב ותשלומים"
              text="מעקב אחרי עלויות, מקדמות, יתרות וסיכום תקציבי ברור."
            />

            <FeatureCard
              icon={<CalendarDays size={28} />}
              title="לו״ז אירוע"
              text="בניית ציר זמן מסודר ליום האירוע ולכל הספקים."
            />

            <FeatureCard
              icon={<ClipboardList size={28} />}
              title="אישורי הגעה"
              text="מעקב בזמן אמת אחרי מי מגיע, מי לא מגיע ומי עדיין בהמתנה."
            />

            <FeatureCard
              icon={<Sparkles size={28} />}
              title="הושבה חכמה"
              text="הושבה לפי אורחים, קבוצות או הושבה אוטומטית בלחיצה."
            />

            <FeatureCard
              icon={<Timer size={28} />}
              title="ניהול יום האירוע"
              text="מעקב אחרי אורחים שהגיעו בפועל, שולחנות ועדכונים מהשטח."
            />

            <FeatureCard
              icon={<PiggyBank size={28} />}
              title="חיסכון בזמן וכסף"
              text="סדר ברור שעוזר לקבל החלטות חכמות ולמנוע טעויות יקרות."
            />
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="relative bg-gradient-to-b from-[#FFFDF8] via-[#F8F2E8] to-[#EFE2CF] px-4 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,#C39A3B_0%,transparent_30%)] opacity-18" />

        <div className="relative mx-auto max-w-6xl">
          <div className="rounded-[2.2rem] border border-[#D8C6A0] bg-[#FFFDF8]/80 p-6 shadow-2xl shadow-[#B8892D]/10 backdrop-blur md:p-10">
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D8C6A0] bg-[#F8F2E8]/80 px-4 py-2 text-sm font-bold text-[#A77A25]">
                  <ShieldCheck size={16} />
                  למה לנהל את האירוע דרך Invistimo?
                </div>

                <h2 className="text-3xl font-black leading-tight text-[#2F2F2F] md:text-5xl">
                  כי אירוע מוצלח מתחיל
                  <span className="block text-[#A77A25]">
                    מאחורי הקלעים.
                  </span>
                </h2>

                <p className="mt-6 text-lg leading-9 text-[#72685D]">
                  כשכל הנתונים מסודרים במקום אחד, קל יותר לקבל החלטות, לחסוך
                  זמן, למנוע טעויות ולהגיע ליום האירוע רגועים יותר. Invistimo
                  נותנת לכם מערכת עצמאית לניהול האירוע, יחד עם אפשרות להוסיף
                  ליווי של מפיקת אירועים וניהול בפועל באולם — בהתאם למה שאתם
                  צריכים.
                </p>

                <button
                  type="button"
                  onClick={scrollToContact}
                  className="
                    mt-8 inline-flex items-center justify-center gap-2
                    rounded-2xl bg-gradient-to-l from-[#B8892D] via-[#C49A3A] to-[#A77A25]
                    px-8 py-4 text-base font-extrabold text-white
                    shadow-xl shadow-[#B8892D]/20
                    transition hover:-translate-y-0.5
                  "
                >
                  השאירו פרטים ונחזור אליכם
                  <ArrowLeft size={18} />
                </button>
              </div>

              <div className="grid gap-4">
                <PremiumPoint
                  title="מערכת אחת מסודרת"
                  text="כל המשימות, הספקים, התקציב, האישורים וההושבה נמצאים במקום אחד."
                />

                <PremiumPoint
                  title="שליטה מלאה"
                  text="תמונת מצב ברורה בכל רגע — לפני האירוע וביום האירוע."
                />

                <PremiumPoint
                  title="ליווי לפי צורך"
                  text="אפשר לנהל עצמאית דרך המערכת, ואפשר להוסיף מפיקת אירועים מקצועית."
                />

                <PremiumPoint
                  title="ניהול באולם"
                  text="ביום האירוע ניתן לקבל ניהול בפועל באולם, מעקב ועדכונים בזמן אמת."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[#F8F2E8] px-4 py-20">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[#D8C6A0] bg-[#FFFDF8] p-8 text-center shadow-2xl shadow-[#B8892D]/10 md:p-12">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D8C6A0] bg-[#F8F2E8] text-[#A77A25]">
            <Crown size={28} />
          </div>

          <h2 className="text-3xl font-black text-[#2F2F2F] md:text-5xl">
            רוצים אירוע מסודר, חכם ורגוע יותר?
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-9 text-[#7A7064]">
            Invistimo נותנת לכם מערכת עצמאית לניהול האירוע, יחד עם אפשרות
            להוסיף ליווי של מפיקת אירועים וניהול בפועל באולם — כדי שתגיעו
            לאירוע מסודר, רגוע ומדויק יותר.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => setIsDemoModalOpen(true)}
              className="
                inline-flex min-w-[210px] items-center justify-center gap-2
                rounded-2xl bg-gradient-to-l from-[#B8892D] via-[#C49A3A] to-[#A77A25]
                px-9 py-4 text-base font-extrabold text-white
                shadow-xl shadow-[#B8892D]/20
                transition hover:-translate-y-0.5
              "
            >
              נסו דמו עכשיו
              <ArrowLeft size={18} />
            </button>

            <button
              type="button"
              onClick={scrollToContact}
              className="
                inline-flex min-w-[210px] items-center justify-center gap-2
                rounded-2xl border border-[#D8C6A0]
                bg-[#FFFDF8]
                px-9 py-4 text-base font-extrabold text-[#2F2F2F]
                shadow-xl shadow-[#B8892D]/10
                transition hover:-translate-y-0.5 hover:bg-white
              "
            >
              לפרטים נוספים
            </button>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact">
        <ContactForm />
      </section>

      {isDemoModalOpen && (
        <DemoChoiceModal
          onClose={() => setIsDemoModalOpen(false)}
          onRsvpDemo={() => goToDemo(RSVP_DEMO_URL)}
          onEventManagementDemo={() => goToDemo(EVENT_MANAGEMENT_DEMO_URL)}
        />
      )}
    </div>
  );
}

/* =========================
   COMPONENTS
========================= */

function DemoChoiceModal({ onClose, onRsvpDemo, onEventManagementDemo }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/25 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-[2.3rem] border border-[#E2D0AA] bg-[#FFFDF8] p-6 shadow-2xl shadow-black/15 md:p-10"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-6 top-6 flex h-14 w-14 items-center justify-center rounded-full border border-[#D8C6A0] bg-[#FFFDF8] text-[#2F2F2F] transition hover:bg-[#F8F2E8]"
          aria-label="סגירה"
        >
          <X size={26} />
        </button>

        <div className="mx-auto mb-8 max-w-3xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#D8C6A0] bg-[#F8F2E8] px-5 py-2 text-sm font-black text-[#A77A25]">
            <Sparkles size={18} />
            בחירת דמו
          </div>

          <h2 className="text-3xl font-black text-[#2F2F2F] md:text-5xl">
            איזה דמו תרצו לראות?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg font-semibold leading-8 text-[#7A7064]">
            אפשר לבחור בין מערכת אישורי הגעה והושבה לבין מערכת ניהול והפקת
            אירוע.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <DemoCard
            icon={<Users size={30} />}
            title="אישורי הגעה והושבה"
            text="דמו למערכת הזמנות, אישורי הגעה, מוזמנים, שולחנות וסידורי הושבה."
            buttonText="כניסה לדמו"
            variant="gold"
            onClick={onRsvpDemo}
          />

          <DemoCard
            icon={<LayoutDashboard size={30} />}
            title="ניהול והפקת אירוע"
            text="דמו לניהול ספקים, תקציב, יומן, לוגיסטיקה, אלכוהול ומתנות מהאירוע."
            buttonText="כניסה לדמו"
            variant="light"
            onClick={onEventManagementDemo}
          />
        </div>
      </div>
    </div>
  );
}

function DemoCard({ icon, title, text, buttonText, variant, onClick }) {
  const isGold = variant === "gold";

  return (
    <div className="rounded-[2rem] border border-[#E2D0AA] bg-[#FFFDF8] p-7 text-center shadow-xl shadow-[#B8892D]/8">
      <div
        className={[
          "mx-auto mb-7 flex h-16 w-full items-center justify-center rounded-full border text-[#A77A25]",
          isGold
            ? "border-[#D8C6A0] bg-[#EFE2CF]"
            : "border-[#D8C6A0] bg-[#F8F2E8]",
        ].join(" ")}
      >
        {icon}
      </div>

      <h3 className="text-2xl font-black text-[#2F2F2F]">{title}</h3>

      <p className="mx-auto mt-4 max-w-md text-lg font-semibold leading-8 text-[#7A7064]">
        {text}
      </p>

      <button
        type="button"
        onClick={onClick}
        className={[
          "mt-8 inline-flex min-w-[170px] items-center justify-center rounded-2xl px-7 py-3 text-base font-black shadow-lg transition hover:-translate-y-0.5",
          isGold
            ? "bg-gradient-to-l from-[#B8892D] via-[#C49A3A] to-[#A77A25] text-white shadow-[#B8892D]/20"
            : "border border-[#D8C6A0] bg-[#FFFDF8] text-[#2F2F2F] shadow-[#B8892D]/10 hover:bg-[#F8F2E8]",
        ].join(" ")}
      >
        {buttonText}
      </button>
    </div>
  );
}

function HeroMiniCard({ icon, text }) {
  return (
    <div className="rounded-2xl border border-[#D8C6A0] bg-[#FFFDF8]/75 px-5 py-4 text-[#2F2F2F] shadow-xl shadow-[#B8892D]/5 backdrop-blur">
      <div className="mb-2 flex justify-center text-[#A77A25]">{icon}</div>
      <p className="text-sm font-black">{text}</p>
    </div>
  );
}

function ServiceCard({ icon, title, text }) {
  return (
    <div
      className="
        group relative overflow-hidden rounded-[1.7rem]
        border border-[#E2D0AA] bg-[#FFFDF8]
        p-7 text-center shadow-2xl shadow-[#B8892D]/10
        transition duration-300 hover:-translate-y-1 hover:shadow-[#A77A25]/15
      "
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-[#B8892D] via-[#F4E2B8] to-[#A77A25]" />

      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D8C6A0] bg-[#F8F2E8] text-[#A77A25] shadow-lg shadow-[#B8892D]/10 transition group-hover:scale-105">
        {icon}
      </div>

      <h3 className="mb-3 text-xl font-black text-[#2F2F2F]">{title}</h3>

      <p className="text-sm font-medium leading-7 text-[#7A7064]">{text}</p>
    </div>
  );
}

function CheckLine({ text }) {
  return (
    <div className="flex items-start gap-3 text-right">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D7BB7A]/18 text-[#A77A25]">
        <CheckCircle2 size={17} />
      </div>

      <p className="text-sm font-bold leading-7 text-[#6E6255]">{text}</p>
    </div>
  );
}

function FeaturePill({ text }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#D8C6A0] bg-[#FFFDF8] px-4 py-3 shadow-sm">
      <CheckCircle2 size={18} className="shrink-0 text-[#A77A25]" />
      <span className="text-sm font-black text-[#2F2F2F]">{text}</span>
    </div>
  );
}

function DashboardBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#D8C6A0] bg-[#FFFDF8]/80 p-4 shadow-sm">
      <p className="text-sm text-[#7A7064]">{label}</p>
      <p className="mt-1 text-3xl font-black text-[#A77A25]">{value}</p>
    </div>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <div className="rounded-[1.5rem] border border-[#E2D0AA] bg-[#FFFDF8] p-6 shadow-lg shadow-[#B8892D]/5 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D8C6A0] bg-[#F8F2E8] p-3 text-[#A77A25]">
        {icon}
      </div>

      <h3 className="mb-2 text-lg font-black text-[#2F2F2F]">{title}</h3>

      <p className="text-sm font-medium leading-7 text-[#7A7064]">{text}</p>
    </div>
  );
}

function PremiumPoint({ title, text }) {
  return (
    <div className="rounded-3xl border border-[#E2D0AA] bg-white/75 p-5 shadow-lg shadow-[#B8892D]/8">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D7BB7A]/15 text-[#A77A25]">
          <CheckCircle2 size={20} />
        </div>

        <h3 className="text-lg font-black text-[#2F2F2F]">{title}</h3>
      </div>

      <p className="pr-12 text-sm font-medium leading-7 text-[#7A7064]">
        {text}
      </p>
    </div>
  );
}