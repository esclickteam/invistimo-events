"use client";

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
} from "lucide-react";
import type { ReactNode } from "react";
import ContactForm from "@/app/components/event/ContactForm";

export default function EventManagementPage() {
  const scrollToContact = () => {
    document
      .getElementById("contact")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div dir="rtl" className="w-full overflow-hidden bg-[#0F2A44] text-right">
      {/* HERO */}
      <section className="relative min-h-[620px] overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1525268771113-32d9e9021a97?q=90&w=2400&auto=format&fit=crop')",
          }}
        />

        {/* Premium overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F2A44]/80 via-[#102F4D]/92 to-[#0F2A44]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#D4AF37_0%,transparent_28%)] opacity-[0.16]" />
        <div className="absolute -top-24 right-1/2 h-80 w-80 translate-x-1/2 rounded-full bg-[#D4AF37]/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#3B82F6]/20 blur-3xl" />

        <div className="relative z-10 mx-auto flex min-h-[620px] max-w-7xl items-center justify-center px-4 py-24">
          <div className="max-w-4xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-white/10 px-5 py-2 text-sm font-semibold text-[#F7E7B2] shadow-lg shadow-black/10 backdrop-blur">
              <Crown size={17} />
              הפקת אירועים חכמה עם ליווי מקצועי
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">
              תכנון, הפקה וניהול אירוע
              <span className="block bg-gradient-to-l from-[#F7E7B2] via-[#D4AF37] to-[#FFF7D6] bg-clip-text text-transparent">
                במקום אחד
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-white/88 md:text-xl">
              ב־Invistimo אנחנו משלבים בין מערכת דיגיטלית מתקדמת לניהול האירוע
              לבין עבודה עם מפיקים מהטובים בתחום — כדי לעזור לכם להגיע לאירוע
              החלומות שלכם בצורה מסודרת, רגועה ומדויקת.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={scrollToContact}
                className="
                  group inline-flex items-center justify-center gap-2
                  rounded-2xl bg-gradient-to-l from-[#D4AF37] to-[#B98A1E]
                  px-8 py-4 text-base font-bold text-[#0F2A44]
                  shadow-2xl shadow-[#D4AF37]/20
                  transition hover:-translate-y-0.5 hover:shadow-[#D4AF37]/30
                "
              >
                דברו איתנו על האירוע
                <ArrowLeft
                  size={18}
                  className="transition group-hover:-translate-x-1"
                />
              </button>

              <button
                onClick={scrollToContact}
                className="
                  inline-flex items-center justify-center gap-2
                  rounded-2xl border border-white/20 bg-white/10
                  px-8 py-4 text-base font-bold text-white
                  shadow-xl shadow-black/10 backdrop-blur
                  transition hover:bg-white/15
                "
              >
                לפרטים על המערכת
              </button>
            </div>

            <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
              <HeroMiniCard icon={<ShieldCheck size={22} />} text="ליווי מקצועי" />
              <HeroMiniCard icon={<LayoutDashboard size={22} />} text="מערכת ניהול עצמאית" />
              <HeroMiniCard icon={<Timer size={22} />} text="שליטה מלאה בזמן אמת" />
            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="relative bg-[#0F2A44] px-4 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1E5A86_0%,transparent_34%)] opacity-20" />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-4 py-2 text-sm font-bold text-[#F7E7B2]">
                <Sparkles size={16} />
                אירוע מסודר מתחיל בניהול נכון
              </div>

              <h2 className="text-3xl font-extrabold leading-tight text-white md:text-5xl">
                אתם חולמים על האירוע,
                <span className="block text-[#D4AF37]">
                  אנחנו עוזרים להפוך אותו למסודר.
                </span>
              </h2>

              <p className="mt-6 text-lg leading-9 text-white/78">
                תכנון אירוע כולל עשרות החלטות, ספקים, תשלומים, משימות, אישורי
                הגעה, הושבה ועדכונים של הרגע האחרון. בדיוק בשביל זה בנינו את
                Invistimo — מערכת אחת שמרכזת את כל מה שצריך, עם אפשרות לליווי
                של מפיקים מקצועיים שמכירים את עולם האירועים מבפנים.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="rounded-[1.5rem] bg-white p-6 shadow-xl">
                <h3 className="mb-5 text-xl font-extrabold text-[#0F2A44]">
                  מה אתם מקבלים?
                </h3>

                <div className="space-y-4">
                  <CheckLine text="מערכת עצמאית לניהול כל שלבי האירוע" />
                  <CheckLine text="חיבור למפיקים מקצועיים מהתחום" />
                  <CheckLine text="מעקב אחרי ספקים, משימות, תקציב ותשלומים" />
                  <CheckLine text="אישורי הגעה, הושבה חכמה וניהול יום האירוע" />
                  <CheckLine text="סדר, שליטה ושקט נפשי עד רגע האירוע" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN SERVICE CARDS */}
      <section className="bg-gradient-to-b from-[#0F2A44] via-[#123655] to-[#0F2A44] px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-3 text-sm font-bold tracking-[0.25em] text-[#D4AF37]">
              INVISTIMO EVENT MANAGEMENT
            </p>

            <h2 className="text-3xl font-extrabold text-white md:text-5xl">
              מארגנים אירוע? ככה נוכל לעזור
            </h2>

            <p className="mt-5 text-lg leading-8 text-white/72">
              בין אם אתם רוצים לנהל את האירוע לבד ובין אם אתם רוצים ליווי
              מקצועי — הכל נמצא במקום אחד, בצורה ברורה, חכמה ונוחה.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <ServiceCard
              icon={<Handshake size={34} />}
              title="ליווי של מפיקים מקצועיים"
              text="אנחנו עובדים עם מפיקים מנוסים מהתחום, שיודעים ללוות אתכם בתכנון, בספקים, בלוחות הזמנים ובקבלת החלטות חשובות לאורך הדרך."
            />

            <ServiceCard
              icon={<LayoutDashboard size={34} />}
              title="מערכת ניהול עצמאית"
              text="מערכת דיגיטלית שמרכזת את כל ניהול האירוע במקום אחד — משימות, ספקים, תקציב, תשלומים, לו״ז, אישורי הגעה והושבה."
            />

            <ServiceCard
              icon={<Star size={34} />}
              title="אירוע מדויק ורגוע יותר"
              text="שליטה מלאה בכל מה שקורה לפני האירוע וביום האירוע עצמו — כדי שתוכלו להגיע מוכנים, רגועים ועם פחות הפתעות."
            />
          </div>
        </div>
      </section>

      {/* SELF MANAGEMENT SYSTEM */}
      <section className="relative bg-[#F6F1E8] px-4 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#D4AF37_0%,transparent_28%)] opacity-20" />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="order-2 lg:order-1">
              <div className="rounded-[2rem] border border-[#D4AF37]/20 bg-white p-5 shadow-2xl shadow-[#0F2A44]/10">
                <div className="rounded-[1.5rem] bg-gradient-to-b from-[#0F2A44] to-[#143A5A] p-6 text-white">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#F7E7B2]">
                        דשבורד אירוע
                      </p>
                      <h3 className="mt-1 text-2xl font-extrabold">
                        תמונת מצב מלאה
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-[#D4AF37]/15 p-3 text-[#F7E7B2]">
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
                      <span className="text-[#F7E7B2]">78%</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full w-[78%] rounded-full bg-gradient-to-l from-[#D4AF37] to-[#F7E7B2]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#0F2A44] px-4 py-2 text-sm font-bold text-[#F7E7B2]">
                <ClipboardCheck size={16} />
                מערכת עצמאית להפקת אירוע
              </div>

              <h2 className="text-3xl font-extrabold leading-tight text-[#0F2A44] md:text-5xl">
                לנהל את האירוע לבד,
                <span className="block text-[#B98A1E]">
                  אבל בצורה של מקצוענים.
                </span>
              </h2>

              <p className="mt-6 text-lg leading-9 text-[#385269]">
                המערכת של Invistimo מאפשרת לכם לנהל את כל תהליך ההפקה בצורה
                מסודרת וברורה — בלי אקסלים מפוזרים, בלי פתקים ובלי הודעות
                וואטסאפ שהולכות לאיבוד. הכל מרוכז במקום אחד, עם תמונת מצב
                מלאה ועדכונים בזמן אמת.
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
      <section className="bg-white px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-3 text-sm font-bold tracking-[0.25em] text-[#B98A1E]">
              ALL IN ONE
            </p>

            <h2 className="text-3xl font-extrabold text-[#0F2A44] md:text-5xl">
              כל מה שצריך לניהול אירוע מסודר
            </h2>

            <p className="mt-5 text-lg leading-8 text-[#5B6B7A]">
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
      <section className="relative bg-gradient-to-b from-[#0F2A44] to-[#092038] px-4 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,#D4AF37_0%,transparent_30%)] opacity-15" />

        <div className="relative mx-auto max-w-6xl">
          <div className="rounded-[2.2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur md:p-10">
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-4 py-2 text-sm font-bold text-[#F7E7B2]">
                  <ShieldCheck size={16} />
                  למה לנהל את האירוע דרך Invistimo?
                </div>

                <h2 className="text-3xl font-extrabold leading-tight text-white md:text-5xl">
                  כי אירוע מוצלח מתחיל
                  <span className="block text-[#D4AF37]">מאחורי הקלעים.</span>
                </h2>

                <p className="mt-6 text-lg leading-9 text-white/75">
                  כשכל הנתונים מסודרים במקום אחד, קל יותר לקבל החלטות, לחסוך
                  זמן, למנוע טעויות ולהגיע ליום האירוע רגועים יותר. Invistimo
                  נותנת לכם גם מערכת חכמה לניהול עצמאי וגם אפשרות לליווי
                  מקצועי — בהתאם למה שאתם צריכים.
                </p>

                <button
                  onClick={scrollToContact}
                  className="
                    mt-8 inline-flex items-center justify-center gap-2
                    rounded-2xl bg-gradient-to-l from-[#D4AF37] to-[#B98A1E]
                    px-8 py-4 text-base font-bold text-[#0F2A44]
                    shadow-xl shadow-[#D4AF37]/20
                    transition hover:-translate-y-0.5
                  "
                >
                  השאירו פרטים ונחזור אליכם
                  <ArrowLeft size={18} />
                </button>
              </div>

              <div className="grid gap-4">
                <PremiumPoint
                  title="פחות בלאגן"
                  text="כל המשימות, הספקים והנתונים נמצאים במקום אחד."
                />

                <PremiumPoint
                  title="יותר שליטה"
                  text="תמונת מצב ברורה בכל רגע — לפני האירוע וביום האירוע."
                />

                <PremiumPoint
                  title="ליווי לפי צורך"
                  text="אפשר לנהל לבד, ואפשר לשלב מפיקים מקצועיים מהתחום."
                />

                <PremiumPoint
                  title="חוויה יוקרתית ונוחה"
                  text="עיצוב נקי, מערכת ברורה ותחושה מקצועית לאורך כל הדרך."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[#F6F1E8] px-4 py-20">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[#D4AF37]/20 bg-white p-8 text-center shadow-2xl shadow-[#0F2A44]/10 md:p-12">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F2A44] text-[#D4AF37]">
            <Crown size={28} />
          </div>

          <h2 className="text-3xl font-extrabold text-[#0F2A44] md:text-5xl">
            רוצים אירוע מסודר, חכם ורגוע יותר?
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-9 text-[#5B6B7A]">
            בין אם אתם רוצים לנהל את האירוע בעצמכם ובין אם אתם מחפשים ליווי
            מקצועי — Invistimo נותנת לכם את הכלים, הסדר והשליטה להגיע לאירוע
            כמו שחלמתם.
          </p>

          <button
            onClick={scrollToContact}
            className="
              mt-8 inline-flex items-center justify-center gap-2
              rounded-2xl bg-[#0F2A44]
              px-9 py-4 text-base font-bold text-white
              shadow-xl shadow-[#0F2A44]/20
              transition hover:-translate-y-0.5 hover:bg-[#143A5A]
            "
          >
            לפרטים נוספים
            <ArrowLeft size={18} />
          </button>
        </div>
      </section>

      {/* CONTACT */}
      <ContactForm />
    </div>
  );
}

/* =========================
   COMPONENTS
========================= */

function HeroMiniCard({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/10 px-5 py-4 text-white shadow-xl shadow-black/10 backdrop-blur">
      <div className="mb-2 flex justify-center text-[#F7E7B2]">{icon}</div>
      <p className="text-sm font-bold">{text}</p>
    </div>
  );
}

function ServiceCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div
      className="
        group relative overflow-hidden rounded-[1.7rem]
        border border-white/10 bg-white
        p-7 text-center shadow-2xl shadow-black/10
        transition duration-300 hover:-translate-y-1 hover:shadow-[#D4AF37]/20
      "
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-[#D4AF37] via-[#F7E7B2] to-[#B98A1E]" />

      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F2A44] text-[#D4AF37] shadow-lg shadow-[#0F2A44]/15 transition group-hover:scale-105">
        {icon}
      </div>

      <h3 className="mb-3 text-xl font-extrabold text-[#0F2A44]">{title}</h3>

      <p className="text-sm leading-7 text-[#5B6B7A]">{text}</p>
    </div>
  );
}

function CheckLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 text-right">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[#B98A1E]">
        <CheckCircle2 size={17} />
      </div>

      <p className="text-sm font-semibold leading-7 text-[#30495F]">{text}</p>
    </div>
  );
}

function FeaturePill({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#D4AF37]/20 bg-white px-4 py-3 shadow-sm">
      <CheckCircle2 size={18} className="shrink-0 text-[#B98A1E]" />
      <span className="text-sm font-bold text-[#0F2A44]">{text}</span>
    </div>
  );
}

function DashboardBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-sm text-white/65">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-[#F7E7B2]">{value}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[#E8D9B5] bg-[#FFFDF8] p-6 shadow-lg shadow-[#0F2A44]/5 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-5 flex h-13 w-13 items-center justify-center rounded-2xl bg-[#0F2A44] p-3 text-[#D4AF37]">
        {icon}
      </div>

      <h3 className="mb-2 text-lg font-extrabold text-[#0F2A44]">{title}</h3>

      <p className="text-sm leading-7 text-[#607080]">{text}</p>
    </div>
  );
}

function PremiumPoint({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-black/10">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/15 text-[#F7E7B2]">
          <CheckCircle2 size={20} />
        </div>

        <h3 className="text-lg font-extrabold text-white">{title}</h3>
      </div>

      <p className="pr-12 text-sm leading-7 text-white/70">{text}</p>
    </div>
  );
}