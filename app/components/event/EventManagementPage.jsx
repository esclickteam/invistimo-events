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
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1525268771113-32d9e9021a97?q=90&w=2400&auto=format&fit=crop')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-b from-[#F8F2E8]/90 via-[#F8F2E8]/96 to-[#F8F2E8]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#C39A3B_0%,transparent_30%)] opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,#FFFFFF_0%,transparent_36%)] opacity-70" />

        <div className="absolute -right-24 top-10 h-[420px] w-[420px] rounded-full border border-[#D7BB7A]/30" />
        <div className="absolute -right-10 top-28 h-[280px] w-[280px] rounded-full border border-[#D7BB7A]/25" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[#E7D7B7]/40 blur-3xl" />
        <div className="absolute top-20 left-20 h-64 w-64 rounded-full bg-[#FFF9ED]/70 blur-3xl" />

        <div className="relative z-10 mx-auto flex min-h-[690px] max-w-7xl items-center px-4 py-24">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-[#D7BB7A]/60 bg-[#FFFDF7]/75 px-5 py-2 text-sm font-bold text-[#A77A25] shadow-sm backdrop-blur">
              <Sparkles size={17} />
              ניהול אירוע חכם, מסודר ויוקרתי
            </div>

            <h1 className="mx-auto max-w-5xl text-4xl font-black leading-tight tracking-tight text-[#3B3026] md:text-6xl">
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

            <p className="mx-auto max-w-3xl text-lg font-medium leading-9 text-[#6E6255] md:text-xl">
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
                  rounded-2xl border border-[#D8C6A0] bg-[#FFFDF8]/80
                  px-8 py-4 text-base font-extrabold text-[#3B3026]
                  shadow-lg shadow-[#7B6A58]/5 backdrop-blur
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
      <section className="relative bg-[#F8F2E8] px-4 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#D7BB7A_0%,transparent_36%)] opacity-20" />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D7BB7A]/55 bg-[#FFFDF8]/70 px-4 py-2 text-sm font-bold text-[#A77A25] shadow-sm">
                <Crown size={16} />
                אירוע מסודר מתחיל בניהול נכון
              </div>

              <h2 className="text-3xl font-black leading-tight text-[#3B3026] md:text-5xl">
                אתם חולמים על האירוע,
                <span className="block text-[#A77A25]">
                  אנחנו עוזרים לנהל אותו נכון.
                </span>
              </h2>

              <p className="mt-6 text-lg leading-9 text-[#6E6255]">
                תכנון אירוע כולל עשרות החלטות, ספקים, תשלומים, משימות, אישורי
                הגעה, הושבה ועדכונים של הרגע האחרון. בדיוק בשביל זה בנינו את
                Invistimo — מערכת עצמאית שמרכזת את כל ניהול האירוע במקום אחד,
                ובנוסף מאפשרת לקבל ליווי של מפיקת אירועים מקצועית וניהול באולם
                עצמו ביום האירוע.
              </p>
            </div>

            <div className="rounded-[2rem] border border-[#E2D0AA] bg-[#FFFDF8]/65 p-6 shadow-2xl shadow-[#7B6A58]/10 backdrop-blur">
              <div className="rounded-[1.5rem] bg-[#FFFDF8] p-6 shadow-xl shadow-[#7B6A58]/5">
                <h3 className="mb-5 text-xl font-black text-[#3B3026]">
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
      <section className="bg-gradient-to-b from-[#F8F2E8] via-[#FFFDF8] to-[#EFE2CF] px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-3 text-sm font-black tracking-[0.25em] text-[#A77A25]">
              INVISTIMO EVENT MANAGEMENT
            </p>

            <h2 className="text-3xl font-black text-[#3B3026] md:text-5xl">
              מארגנים אירוע? ככה נוכל לעזור
            </h2>

            <p className="mt-5 text-lg leading-8 text-[#7B6A58]">
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
              <div className="rounded-[2rem] border border-[#D8C6A0] bg-[#FFFDF8] p-5 shadow-2xl shadow-[#7B6A58]/10">
                <div className="rounded-[1.5rem] bg-gradient-to-b from-[#4A3B2C] to-[#2F251D] p-6 text-white">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#F4E2B8]">
                        דשבורד אירוע
                      </p>
                      <h3 className="mt-1 text-2xl font-black">
                        תמונת מצב מלאה
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-[#D7BB7A]/18 p-3 text-[#F4E2B8]">
                      <LayoutDashboard size={28} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <DashboardBox label="משימות פתוחות" value="12" />
                    <DashboardBox label="ספקים במעקב" value="8" />
                    <DashboardBox label="אישרו הגעה" value="246" />
                    <DashboardBox label="שולחנות" value="31" />
                  </div>

                  <div className="mt-5 rounded-2xl bg-white/10 p-4">
                    <div className="mb-3 flex items-center justify-between text-sm">
                      <span className="font-bold">התקדמות תכנון האירוע</span>
                      <span className="text-[#F4E2B8]">78%</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full w-[78%] rounded-full bg-gradient-to-l from-[#B8892D] to-[#F4E2B8]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#3B3026] px-4 py-2 text-sm font-bold text-[#F4E2B8]">
                <ClipboardCheck size={16} />
                מערכת עצמאית להפקת אירוע
              </div>

              <h2 className="text-3xl font-black leading-tight text-[#3B3026] md:text-5xl">
                מערכת עצמאית לניהול האירוע,
                <span className="block text-[#A77A25]">
                  עם אפשרות לליווי מקצועי.
                </span>
              </h2>

              <p className="mt-6 text-lg leading-9 text-[#6E6255]">
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

            <h2 className="text-3xl font-black text-[#3B3026] md:text-5xl">
              כל מה שצריך לניהול אירוע מסודר
            </h2>

            <p className="mt-5 text-lg leading-8 text-[#7B6A58]">
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
      <section className="relative bg-gradient-to-b from-[#4A3B2C] to-[#2F251D] px-4 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,#C39A3B_0%,transparent_30%)] opacity-18" />

        <div className="relative mx-auto max-w-6xl">
          <div className="rounded-[2.2rem] border border-white/12 bg-white/[0.07] p-6 shadow-2xl shadow-black/20 backdrop-blur md:p-10">
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E4D0A0]/25 bg-[#C39A3B]/12 px-4 py-2 text-sm font-bold text-[#F4E2B8]">
                  <ShieldCheck size={16} />
                  למה לנהל את האירוע דרך Invistimo?
                </div>

                <h2 className="text-3xl font-black leading-tight text-white md:text-5xl">
                  כי אירוע מוצלח מתחיל
                  <span className="block text-[#D7BB7A]">
                    מאחורי הקלעים.
                  </span>
                </h2>

                <p className="mt-6 text-lg leading-9 text-white/75">
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
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[#D8C6A0] bg-[#FFFDF8] p-8 text-center shadow-2xl shadow-[#7B6A58]/10 md:p-12">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3B3026] text-[#D7BB7A]">
            <Crown size={28} />
          </div>

          <h2 className="text-3xl font-black text-[#3B3026] md:text-5xl">
            רוצים אירוע מסודר, חכם ורגוע יותר?
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-9 text-[#7B6A58]">
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
                rounded-2xl bg-[#3B3026]
                px-9 py-4 text-base font-extrabold text-white
                shadow-xl shadow-[#7B6A58]/20
                transition hover:-translate-y-0.5 hover:bg-[#4A3B2C]
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#2F2A24]/60 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-[2.3rem] border border-[#E2D0AA] bg-[#FFFDF8] p-6 shadow-2xl shadow-black/20 md:p-10"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-6 top-6 flex h-14 w-14 items-center justify-center rounded-full border border-[#D8C6A0] bg-[#FFFDF8] text-[#3B3026] transition hover:bg-[#F8F2E8]"
          aria-label="סגירה"
        >
          <X size={26} />
        </button>

        <div className="mx-auto mb-8 max-w-3xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#D8C6A0] bg-[#F8F2E8] px-5 py-2 text-sm font-black text-[#A77A25]">
            <Sparkles size={18} />
            בחירת דמו
          </div>

          <h2 className="text-3xl font-black text-[#3B3026] md:text-5xl">
            איזה דמו תרצו לראות?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg font-semibold leading-8 text-[#7B6A58]">
            אפשר לבחור בין מערכת אישורי הגעה והושבה לבין מערכת ניהול והפקת
            אירוע.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <DemoCard
            icon="👥"
            title="אישורי הגעה והושבה"
            text="דמו למערכת הזמנות, אישורי הגעה, מוזמנים, שולחנות וסידורי הושבה."
            buttonText="כניסה לדמו"
            variant="gold"
            onClick={onRsvpDemo}
          />

          <DemoCard
            icon="✨"
            title="ניהול והפקת אירוע"
            text="דמו לניהול ספקים, תקציב, יומן, לוגיסטיקה, אלכוהול ומתנות מהאירוע."
            buttonText="כניסה לדמו"
            variant="dark"
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
    <div className="rounded-[2rem] border border-[#E2D0AA] bg-white p-7 text-center shadow-xl shadow-[#7B6A58]/8">
      <div
        className={[
          "mx-auto mb-7 flex h-14 w-full items-center justify-center rounded-full text-2xl",
          isGold ? "bg-[#EFE2CF]" : "bg-[#F2EAFB]",
        ].join(" ")}
      >
        {icon}
      </div>

      <h3 className="text-2xl font-black text-[#3B3026]">{title}</h3>

      <p className="mx-auto mt-4 max-w-md text-lg font-semibold leading-8 text-[#7B6A58]">
        {text}
      </p>

      <button
        type="button"
        onClick={onClick}
        className={[
          "mt-8 inline-flex min-w-[170px] items-center justify-center rounded-2xl px-7 py-3 text-base font-black text-white shadow-lg transition hover:-translate-y-0.5",
          isGold
            ? "bg-gradient-to-l from-[#B8892D] via-[#C49A3A] to-[#A77A25] shadow-[#B8892D]/20"
            : "bg-[#2F251D] shadow-[#2F251D]/20 hover:bg-[#3B3026]",
        ].join(" ")}
      >
        {buttonText}
      </button>
    </div>
  );
}

function HeroMiniCard({ icon, text }) {
  return (
    <div className="rounded-2xl border border-[#D8C6A0] bg-[#FFFDF8]/75 px-5 py-4 text-[#3B3026] shadow-xl shadow-[#7B6A58]/5 backdrop-blur">
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
        p-7 text-center shadow-2xl shadow-[#7B6A58]/10
        transition duration-300 hover:-translate-y-1 hover:shadow-[#A77A25]/15
      "
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-[#B8892D] via-[#F4E2B8] to-[#A77A25]" />

      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3B3026] text-[#D7BB7A] shadow-lg shadow-[#7B6A58]/15 transition group-hover:scale-105">
        {icon}
      </div>

      <h3 className="mb-3 text-xl font-black text-[#3B3026]">{title}</h3>

      <p className="text-sm font-medium leading-7 text-[#7B6A58]">{text}</p>
    </div>
  );
}

function CheckLine({ text }) {
  return (
    <div className="flex items-start gap-3 text-right">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D7BB7A]/18 text-[#A77A25]">
        <CheckCircle2 size={17} />
      </div>

      <p className="text-sm font-bold leading-7 text-[#5F5243]">{text}</p>
    </div>
  );
}

function FeaturePill({ text }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#D8C6A0] bg-[#FFFDF8] px-4 py-3 shadow-sm">
      <CheckCircle2 size={18} className="shrink-0 text-[#A77A25]" />
      <span className="text-sm font-black text-[#3B3026]">{text}</span>
    </div>
  );
}

function DashboardBox({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-sm text-white/65">{label}</p>
      <p className="mt-1 text-3xl font-black text-[#F4E2B8]">{value}</p>
    </div>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <div className="rounded-[1.5rem] border border-[#E2D0AA] bg-[#FFFDF8] p-6 shadow-lg shadow-[#7B6A58]/5 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3B3026] p-3 text-[#D7BB7A]">
        {icon}
      </div>

      <h3 className="mb-2 text-lg font-black text-[#3B3026]">{title}</h3>

      <p className="text-sm font-medium leading-7 text-[#7B6A58]">{text}</p>
    </div>
  );
}

function PremiumPoint({ title, text }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-black/10">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D7BB7A]/15 text-[#F4E2B8]">
          <CheckCircle2 size={20} />
        </div>

        <h3 className="text-lg font-black text-white">{title}</h3>
      </div>

      <p className="pr-12 text-sm font-medium leading-7 text-white/72">
        {text}
      </p>
    </div>
  );
}