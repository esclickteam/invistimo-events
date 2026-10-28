"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Frank_Ruhl_Libre } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Play,
  Users,
  Wallet,
  X,
} from "lucide-react";
import ContactForm from "@/app/components/event/ContactForm";

const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-event-mgmt-display",
});

const PRODUCT = {
  hero: "/images/event-management/product/hero-dashboard.webp",
  overview: "/images/event-management/product/overview-dashboard.webp",
  planning: "/images/event-management/product/planning-concept.webp",
  suppliers: "/images/event-management/product/suppliers-budget.webp",
  calendar: "/images/event-management/product/calendar-schedule.webp",
  logistics: "/images/event-management/product/logistics-timeline.webp",
  guests: "/images/event-management/product/guests-dashboard.webp",
  seating: "/images/event-management/product/seating-map.webp",
};

const VIDEOS = {
  overview: {
    src: "/videos/event-management/system-overview.webm",
    poster: "/videos/event-management/system-overview-poster.jpg",
    caption: "/videos/event-management/system-overview.vtt",
    title: "סקירת מערכת הניהול",
  },
  tasks: {
    src: "/videos/event-management/tasks-flow.webm",
    poster: "/videos/event-management/tasks-flow-poster.jpg",
    caption: "/videos/event-management/tasks-flow.vtt",
    title: "מתכנון לביצוע — משימות",
  },
  budget: {
    src: "/videos/event-management/budget-flow.webm",
    poster: "/videos/event-management/budget-flow-poster.jpg",
    caption: "/videos/event-management/budget-flow.vtt",
    title: "ניהול תקציב ותשלומים",
  },
  day: {
    src: "/videos/event-management/event-day.webm",
    poster: "/videos/event-management/event-day-poster.jpg",
    caption: "/videos/event-management/event-day.vtt",
    title: "לוח זמנים ליום האירוע",
  },
};

const GALLERY_TABS = [
  {
    id: "dashboard",
    label: "דשבורד",
    image: PRODUCT.overview,
    alt: "דשבורד ניהול אירוע ב־Invistimo — תמונת מצב, תקציב ומשימות",
    text: "תמונת מצב אחת: פרטי האירוע, התראות, תקציב ומשימות פתוחות.",
    action: "לראות מה דורש טיפול עכשיו",
  },
  {
    id: "tasks",
    label: "משימות",
    image: PRODUCT.overview,
    alt: "רשימת משימות במערכת ניהול האירוע",
    text: "מוסיפים משימה, קובעים תאריך יעד ומעדכנים סטטוס עד להשלמה.",
    action: "לנהל רשימת משימות אחת",
  },
  {
    id: "suppliers",
    label: "ספקים",
    image: PRODUCT.suppliers,
    alt: "מסך ספקים ותקציב במערכת Invistimo",
    text: "ריכוז ספקים לפי קטגוריה, אנשי קשר, מקדמות, יתרות וקבצים.",
    action: "לרכז ספקים ותשלומים",
  },
  {
    id: "budget",
    label: "תקציב",
    image: PRODUCT.overview,
    alt: "כרטיסי תקציב ותשלומים בדשבורד האירוע",
    text: "תקציב מתוכנן מול התחייבויות, שולם בפועל ויתרה זמינה.",
    action: "לעקוב אחרי התקציב",
  },
  {
    id: "payments",
    label: "תשלומים",
    image: PRODUCT.suppliers,
    alt: "מעקב מקדמות ויתרות מול ספקים",
    text: "לכל ספק רואים מחיר כולל, מקדמה ויתרה — בלי אקסל מפוזר.",
    action: "לעדכן מקדמות ויתרות",
  },
  {
    id: "schedule",
    label: "לוח זמנים",
    image: PRODUCT.logistics,
    alt: "לוח זמנים ולוגיסטיקה ליום האירוע",
    text: "ציר זמן ליום האירוע לצד משימות לוגיסטיקה וסטטוסים.",
    action: "לבנות לו״ז ליום האירוע",
  },
  {
    id: "guests",
    label: "אורחים והושבה",
    image: PRODUCT.guests,
    alt: "רשימת מוזמנים ואישורי הגעה ב־Invistimo",
    text: "אישורי הגעה והושבה משתלבים בניהול — כשירותים נפרדים לפי החבילה.",
    action: "לחבר אורחים להושבה",
  },
];

const PATHS = [
  {
    title: "ניהול עצמאי",
    forWho: "למי שרוצה לנהל בעצמו עם כלים מסודרים",
    includes: [
      "מערכת משימות, ספקים, תקציב ולוח זמנים",
      "עבודה עצמאית מהמחשב או מהמובייל",
      "אפשרות להתנסות בדמו לפני הרכישה",
    ],
    excludes: [
      "ליווי מפיקה אינו כלול אוטומטית",
      "ניהול באולם ביום האירוע אינו כלול אוטומטית",
      "אישורי הגעה והושבה נמכרים כשירותים נפרדים לפי החבילה",
    ],
    extra: false,
    cta: { label: "התנסו במערכת", href: "/try/event-management" },
  },
  {
    title: "ניהול עצמאי עם ליווי מקצועי",
    forWho: "למי שמנהל במערכת ורוצה הכוונה מקצועית",
    includes: [
      "שימוש במערכת העצמאית",
      "ליווי מפיקה בהתאם להסכם ולהצעה הפעילה",
      "תיאום ציפיות על היקף הליווי לפני סגירה",
    ],
    excludes: [
      "התכולה המדויקת נקבעת רק בהצעה",
      "נוכחות באולם אינה מובטחת בכל מסלול ליווי",
    ],
    extra: true,
    cta: { label: "בדקו אפשרות לליווי", href: "#contact" },
  },
  {
    title: "ניהול בפועל ביום האירוע",
    forWho: "למי שרוצה גורם מקצועי שמתאם באולם",
    includes: [
      "שירות ניהול באולם ביום האירוע — בכפוף לזמינות",
      "תיאום לפי תחומי האחריות שסוכמו מראש",
      "שילוב עם המערכת לריכוז פרטים",
    ],
    excludes: [
      "אינו מחליף אוטומטית את מנהל האולם",
      "אין הבטחת זמינות בכל אזור או תאריך בלי בדיקה",
    ],
    extra: true,
    cta: { label: "בדקו זמינות", href: "#contact" },
  },
];

const START_STEPS = [
  "בוחרים את השירות והיקף הניהול",
  "נכנסים למערכת או מתנסים בדמו",
  "מגדירים פרטי אירוע בסיסיים",
  "מוסיפים משימות וספקים",
  "מתכננים תקציב ולוח זמנים",
  "ממשיכים לנהל עד יום האירוע",
];

const RSVP_DEMO_URL = "/try/dashboard";
const EVENT_MANAGEMENT_DEMO_URL = "/try/event-management";

export default function EventManagementPage() {
  const reduceMotion = useReducedMotion();
  const [galleryTab, setGalleryTab] = useState("dashboard");
  const [lightbox, setLightbox] = useState(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const activeGallery = useMemo(
    () => GALLERY_TABS.find((tab) => tab.id === galleryTab) || GALLERY_TABS[0],
    [galleryTab]
  );

  const scrollToId = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div dir="rtl" className={`${display.variable} overflow-hidden bg-[#FBF6EE] text-[#3F3025]`}>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_48%,#FBF6EE_100%)]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(201,164,92,0.18),transparent_42%),radial-gradient(circle_at_88%_18%,rgba(232,214,180,0.45),transparent_40%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-24 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-24 lg:pt-28">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className={`${display.className} text-4xl font-bold tracking-tight text-[#A67C3D] md:text-5xl`}>
              Invistimo
            </p>
            <h1
              className={`${display.className} mt-4 max-w-2xl text-[2rem] font-bold leading-[1.2] text-[#2C241C] md:text-[2.75rem]`}
            >
              ניהול האירוע שלכם. כל הפרטים במקום אחד.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#5C4A3A] md:text-lg">
              פלטפורמה לניהול האירוע — משימות, ספקים, תקציב, תשלומים ולוח זמנים, עם
              אפשרות להוסיף ליווי מקצועי וניהול ביום האירוע.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#contact"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[#2C241C] via-[#3F3025] to-[#35281F] px-8 py-3.5 text-base font-extrabold text-white shadow-[0_18px_40px_rgba(44,36,28,0.25)] transition hover:-translate-y-0.5"
              >
                לבדיקת התאמה
                <ArrowLeft size={18} aria-hidden />
              </a>
              <a
                href={EVENT_MANAGEMENT_DEMO_URL}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#C7A56B] bg-white/90 px-8 py-3.5 text-base font-extrabold text-[#2C241C] transition hover:bg-white"
              >
                התנסו במערכת
              </a>
              <button
                type="button"
                onClick={() => scrollToId("paths")}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#C7A56B] bg-white/90 px-8 py-3.5 text-base font-extrabold text-[#2C241C] transition hover:bg-white"
              >
                גלו את אפשרויות הניהול
              </button>
            </div>
            <p className="mt-4 text-sm text-[#7A6042]">
              התצוגות להמחשה מתוך מערכת Invistimo. ליווי וניהול באולם — רק אם סוכמו.
            </p>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-[#5C4A3A]">
              המחיר של ליווי ושל ניהול באולם נקבע בהצעה אחרי הפנייה. מחשבון חבילות אישורי ההגעה
              מציג מחיר של שירות אחר, ומערכת הניהול העצמאית מופיעה שם רק כתוספת לחבילה.
            </p>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: reduceMotion ? 0 : 0.08 }}
            className="relative"
          >
            <button
              type="button"
              onClick={() => setLightbox({ src: PRODUCT.overview, alt: "דשבורד ניהול האירוע" })}
              className="group relative block w-full overflow-hidden rounded-[1.75rem] border border-[#E6D2AA] bg-white p-2 text-right shadow-[0_28px_70px_rgba(44,36,28,0.14)]"
            >
              <div className="relative aspect-[16/11] overflow-hidden rounded-[1.25rem] bg-[#F8F2E8]">
                <Image
                  src={PRODUCT.hero}
                  alt="צילום מסך אמיתי של דשבורד ניהול האירוע ב־Invistimo"
                  fill
                  priority
                  className="object-cover object-top transition duration-500 group-hover:scale-[1.02]"
                  sizes="(max-width:1024px) 100vw, 560px"
                />
              </div>
              <span className="mt-3 flex items-center justify-between px-2 pb-1 text-sm font-bold text-[#5E4735]">
                דשבורד ניהול האירוע
                <span className="text-[#A67C3D]">הגדלה</span>
              </span>
            </button>
            {!reduceMotion ? (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -bottom-6 -left-4 hidden w-[42%] overflow-hidden rounded-2xl border border-[#E6D2AA] bg-white p-1.5 shadow-xl lg:block"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                  <Image src={PRODUCT.suppliers} alt="" fill className="object-cover object-top" sizes="220px" />
                </div>
              </motion.div>
            ) : null}
          </motion.div>
        </div>
      </section>

      {/* ZONE 1 — dashboard */}
      <ProductSection
        id="dashboard"
        eyebrow="תמונת מצב"
        title="כל האירוע במקום אחד"
        text="בדשבורד רואים מה צריך לעשות, מה הושלם, אילו ספקים דורשים טיפול, מה מצב התקציב ומה צפוי בהמשך — מתוך המערכת עצמה."
        image={PRODUCT.overview}
        alt="דשבורד הפקת אירוע עם תקציב, התראות ומשימות"
        onExpand={setLightbox}
        video={VIDEOS.overview}
        reduceMotion={reduceMotion}
      />

      {/* ZONE 2 — tasks */}
      <ProductSection
        id="tasks"
        eyebrow="משימות"
        title="ניהול משימות ברור עד ההשלמה"
        text="מוסיפים משימה, קובעים תאריך יעד, משנים סטטוס וסוגרים פריטים — כדי שהתכנון לא יישאר ברשימות מפוזרות."
        image={PRODUCT.overview}
        alt="רשימת משימות עם סטטוסים ותאריכי יעד במערכת"
        reverse
        onExpand={setLightbox}
        video={VIDEOS.tasks}
        reduceMotion={reduceMotion}
        bullets={["הוספת משימה", "תאריך יעד", "שינוי סטטוס", "סימון כבוצעה"]}
      />

      {/* ZONE 3 — suppliers */}
      <ProductSection
        id="suppliers"
        eyebrow="ספקים"
        title="כל הספקים, אנשי הקשר והתשלומים"
        text="רשימת ספקים לפי תחומים, פרטי התקשרות, סטטוס, הערות, מקדמות ויתרות — במקום אחד."
        image={PRODUCT.suppliers}
        alt="מסך ספקים עם מקדמות, יתרות וקבצים"
        onExpand={setLightbox}
        reduceMotion={reduceMotion}
        bullets={["רשימת ספקים", "סטטוס והערות", "מקדמה ויתרה", "קבצים וחוזים"]}
      />

      {/* ZONE 4 — budget */}
      <ProductSection
        id="budget"
        eyebrow="תקציב ותשלומים"
        title="תקציב מתוכנן מול ביצוע בפועל"
        text="עוקבים אחרי התחייבויות, שולם בפועל ויתרה זמינה. הדוגמה בתצוגה משתמשת בנתונים עקביים של אותו אירוע — לא בגרף שלא קיים במערכת."
        image={PRODUCT.overview}
        alt="כרטיסי תקציב: מתוכנן, התחייבויות, שולם ויתרה"
        reverse
        onExpand={setLightbox}
        video={VIDEOS.budget}
        reduceMotion={reduceMotion}
        bullets={["תקציב מתוכנן", "עלות בפועל / התחייבויות", "מקדמות", "יתרות ותשלומים צפויים"]}
      />

      {/* ZONE 5 — schedule */}
      <ProductSection
        id="schedule"
        eyebrow="יום האירוע"
        title="לוח זמנים שמחבר ספקים, אולם ורגעים"
        text="בונים ציר זמן: הגעת ספקים, סידור האולם, קבלת פנים, חופה, ארוחה וסיום — לצד משימות לוגיסטיקה."
        image={PRODUCT.logistics}
        alt="לוח זמנים ולוגיסטיקה ליום האירוע"
        onExpand={setLightbox}
        video={VIDEOS.day}
        reduceMotion={reduceMotion}
      />

      {/* ZONE 6 — guests */}
      <section id="guests" className="scroll-mt-28 bg-[#FFFDF8] px-4 py-20 md:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-black tracking-[0.14em] text-[#A67C3D]">אורחים</p>
            <h2 className={`${display.className} mt-3 text-3xl font-bold text-[#2C241C] md:text-4xl`}>
              אורחים, אישורי הגעה והושבה — באותה סביבה
            </h2>
            <p className="mt-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              רשימת מוזמנים, אישורי הגעה ומפת הושבה משתלבים בניהול האירוע, אך נמכרים כשירותים נפרדים
              לפי החבילה. אין להניח שהם כלולים אוטומטית ברכישת מערכת הניהול.
            </p>
            <ul className="mt-6 space-y-2 text-sm font-bold text-[#3F3025] md:text-base">
              {["רשימת אורחים", "מצב אישורי הגעה", "מפת הושבה", "מספרי שולחנות"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#A67C3D]" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/rsvp"
                className="inline-flex min-h-11 items-center rounded-full border border-[#DCC7A6] bg-white px-5 py-2.5 text-sm font-black text-[#5E4735]"
              >
                אישורי הגעה
              </Link>
              <Link
                href="/seating-explained"
                className="inline-flex min-h-11 items-center rounded-full border border-[#DCC7A6] bg-white px-5 py-2.5 text-sm font-black text-[#5E4735]"
              >
                סידורי הושבה
              </Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ShotCard
              src={PRODUCT.guests}
              alt="רשימת מוזמנים ואישורי הגעה"
              caption="רשימת אורחים"
              onExpand={setLightbox}
            />
            <ShotCard
              src={PRODUCT.seating}
              alt="מפת הושבה דיגיטלית"
              caption="מפת הושבה"
              onExpand={setLightbox}
            />
          </div>
        </div>
      </section>

      {/* ZONE 7 — paths */}
      <section id="paths" className="scroll-mt-28 bg-[#F8F2E8] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black tracking-[0.14em] text-[#A67C3D]">מסלולים</p>
          <h2 className={`${display.className} mt-3 text-3xl font-bold text-[#2C241C] md:text-4xl`}>
            שלושה מסלולי ניהול — בחרו מה מתאים
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A]">
            המערכת העצמאית היא הבסיס. ליווי מפיקה וניהול באולם הם שירותים נוספים — רק אם סוכמו.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {PATHS.map((path) => (
              <article
                key={path.title}
                className="flex h-full flex-col rounded-[1.75rem] border border-[#E6D2AA] bg-[#FFFDF8] p-6 shadow-[0_14px_36px_rgba(58,39,20,0.06)]"
              >
                {path.extra ? (
                  <p className="text-xs font-black tracking-wide text-[#A67C3D]">שירות נוסף</p>
                ) : (
                  <p className="text-xs font-black tracking-wide text-[#7A6042]">המערכת העצמאית</p>
                )}
                <h3 className={`${display.className} mt-2 text-2xl font-bold text-[#2C241C]`}>
                  {path.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#5C4A3A]">{path.forWho}</p>
                <p className="mt-5 text-sm font-black text-[#35281F]">מה כולל</p>
                <ul className="mt-2 space-y-2">
                  {path.includes.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-6 text-[#5C4A3A]">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#A67C3D]" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-sm font-black text-[#35281F]">מה אינו כלול אוטומטית</p>
                <ul className="mt-2 space-y-2">
                  {path.excludes.map((item) => (
                    <li key={item} className="text-sm leading-6 text-[#7A6042]">
                      • {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-6">
                  {path.cta.href.startsWith("#") ? (
                    <button
                      type="button"
                      onClick={() => scrollToId(path.cta.href.slice(1))}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#35281F] px-5 text-sm font-black text-white"
                    >
                      {path.cta.label}
                    </button>
                  ) : (
                    <a
                      href={path.cta.href}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#35281F] px-5 text-sm font-black text-white"
                    >
                      {path.cta.label}
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
          <p className="mt-8 text-sm leading-7 text-[#7A6042]">
            רוצים להבין את ההבדל בין מפיק למנהל אירוע?{" "}
            <Link
              href="/info/guides/event-management-vs-production"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              מדריך ניהול מול הפקה
            </Link>
          </p>
        </div>
      </section>

      {/* Interactive gallery */}
      <section id="gallery" className="scroll-mt-28 bg-[#FFFDF8] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black tracking-[0.14em] text-[#A67C3D]">מבפנים</p>
          <h2 className={`${display.className} mt-3 text-3xl font-bold text-[#2C241C] md:text-4xl`}>
            הכירו את המערכת מבפנים
          </h2>
          <div
            className="mt-8 flex gap-2 overflow-x-auto pb-2"
            role="tablist"
            aria-label="גלריית מסכי המערכת"
          >
            {GALLERY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={galleryTab === tab.id}
                onClick={() => setGalleryTab(tab.id)}
                className={[
                  "shrink-0 rounded-full px-4 py-2.5 text-sm font-black transition",
                  galleryTab === tab.id
                    ? "bg-[#35281F] text-white"
                    : "border border-[#E6D2AA] bg-white text-[#5E4735]",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <button
              type="button"
              onClick={() => setLightbox({ src: activeGallery.image, alt: activeGallery.alt })}
              className="overflow-hidden rounded-[1.5rem] border border-[#E6D2AA] bg-white p-2 text-right shadow-[0_16px_40px_rgba(58,39,20,0.08)]"
            >
              <div className="relative aspect-[16/11] overflow-hidden rounded-[1.1rem] bg-[#F8F2E8]">
                <Image
                  src={activeGallery.image}
                  alt={activeGallery.alt}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width:1024px) 100vw, 700px"
                />
              </div>
            </button>
            <div>
              <h3 className={`${display.className} text-2xl font-bold text-[#2C241C]`}>
                {activeGallery.label}
              </h3>
              <p className="mt-3 leading-8 text-[#5C4A3A]">{activeGallery.text}</p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#FFF1DA] px-4 py-2 text-sm font-black text-[#8A642E]">
                <Play size={14} aria-hidden />
                {activeGallery.action}
              </p>
              <a
                href={EVENT_MANAGEMENT_DEMO_URL}
                className="mt-8 inline-flex min-h-11 items-center gap-2 font-black text-[#35281F] underline-offset-4 hover:underline"
              >
                לפתוח את המסך בדמו
                <ChevronLeft size={16} aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ZONE 8 — how to start */}
      <section className="bg-[#FBF6EE] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-black tracking-[0.14em] text-[#A67C3D]">התחלה</p>
          <h2 className={`${display.className} mt-3 text-3xl font-bold text-[#2C241C] md:text-4xl`}>
            איך מתחילים?
          </h2>
          <ol className="mt-8 space-y-3">
            {START_STEPS.map((step, index) => (
              <li
                key={step}
                className="flex gap-4 rounded-2xl border border-[#E6D2AA] bg-white px-4 py-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF1DA] text-sm font-black text-[#8A642E]">
                  {index + 1}
                </span>
                <span className="pt-1.5 font-bold text-[#3F3025]">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#contact"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#35281F] px-8 text-base font-black text-white"
            >
              לבדיקת התאמה
            </a>
            <a
              href={EVENT_MANAGEMENT_DEMO_URL}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white px-8 text-base font-black text-[#5E4735]"
            >
              התנסו במערכת
            </a>
          </div>
        </div>
      </section>

      {/* Why / pillars short */}
      <section className="bg-[#FFFDF8] px-4 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className={`${display.className} text-3xl font-bold text-[#2C241C] md:text-4xl`}>
            למה לנהל את האירוע ב־Invistimo?
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: LayoutDashboard, title: "הכול במקום אחד", text: "משימות, ספקים, תקציב ולו״ז במערכת אחת." },
              { icon: ListChecks, title: "ניהול עצמאי", text: "עובדים בקצב שלכם, עם דמו להתנסות." },
              { icon: Wallet, title: "סדר בתקציב", text: "מעקב אחרי מקדמות, יתרות והתחייבויות." },
              { icon: MapPin, title: "ליווי לפי צורך", text: "אפשר להוסיף ליווי או ניהול באולם — רק אם סוכם." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="border-t-2 border-[#C7A56B] pt-5">
                  <Icon className="text-[#A67C3D]" size={24} aria-hidden />
                  <h3 className="mt-3 text-lg font-black text-[#35281F]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ContactForm
        title="רוצים לבדוק התאמה למסלול שלכם?"
        lede="השאירו פרטים לבדיקת מערכת עצמאית, ליווי או ניהול ביום האירוע. ההצעה נסגרת מול הצוות. המחיר במחשבון חבילות אישורי ההגעה אינו המחיר של השירות הזה."
      />

      {lightbox ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="הגדלת צילום מסך"
        >
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute left-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[#D8C6A0] bg-white"
              aria-label="סגירה"
            >
              <X size={20} />
            </button>
            <Image
              src={lightbox.src}
              alt={lightbox.alt}
              width={1600}
              height={1000}
              className="h-auto w-full rounded-xl"
            />
          </div>
        </div>
      ) : null}

      {isDemoModalOpen ? (
        <DemoChoiceModal
          onClose={() => setIsDemoModalOpen(false)}
          onRsvp={() => {
            window.location.href = RSVP_DEMO_URL;
          }}
          onEvent={() => {
            window.location.href = EVENT_MANAGEMENT_DEMO_URL;
          }}
        />
      ) : null}
    </div>
  );
}

function ProductSection({
  id,
  eyebrow,
  title,
  text,
  image,
  alt,
  reverse,
  bullets,
  video,
  onExpand,
  reduceMotion,
}) {
  return (
    <section
      id={id}
      className={[
        "scroll-mt-28 px-4 py-20 md:px-8",
        reverse ? "bg-[#FFFDF8]" : "bg-[#FBF6EE]",
      ].join(" ")}
    >
      <div
        className={[
          "mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2",
          reverse ? "lg:[&>*:first-child]:order-2" : "",
        ].join(" ")}
      >
        <div>
          <p className="text-sm font-black tracking-[0.14em] text-[#A67C3D]">{eyebrow}</p>
          <h2 className={`${display.className} mt-3 text-3xl font-bold text-[#2C241C] md:text-4xl`}>
            {title}
          </h2>
          <p className="mt-4 text-base leading-8 text-[#5C4A3A] md:text-lg">{text}</p>
          {bullets?.length ? (
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {bullets.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm font-bold text-[#3F3025]">
                  <CheckCircle2 size={16} className="text-[#A67C3D]" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="space-y-4">
          <ShotCard src={image} alt={alt} onExpand={onExpand} />
          {video ? <ProductVideo video={video} reduceMotion={reduceMotion} /> : null}
        </div>
      </div>
    </section>
  );
}

function ShotCard({ src, alt, caption, onExpand }) {
  return (
    <button
      type="button"
      onClick={() => onExpand?.({ src, alt })}
      className="w-full overflow-hidden rounded-[1.5rem] border border-[#E6D2AA] bg-white p-2 text-right shadow-[0_16px_40px_rgba(58,39,20,0.08)]"
    >
      <div className="relative aspect-[16/11] overflow-hidden rounded-[1.1rem] bg-[#F8F2E8]">
        <Image src={src} alt={alt} fill className="object-cover object-top" sizes="(max-width:1024px) 100vw, 560px" />
      </div>
      {caption ? (
        <span className="mt-2 block px-1 pb-1 text-sm font-bold text-[#5E4735]">{caption}</span>
      ) : null}
    </button>
  );
}

function ProductVideo({ video, reduceMotion }) {
  return (
    <figure className="overflow-hidden rounded-[1.5rem] border border-[#E6D2AA] bg-[#1c1612]">
      <video
        className="aspect-video h-auto w-full"
        controls
        playsInline
        preload="none"
        poster={video.poster}
        muted={false}
      >
        <source src={video.src} type="video/webm" />
        <track kind="captions" srcLang="he" label="עברית" src={video.caption} default />
      </video>
      <figcaption className="border-t border-white/10 px-4 py-3 text-sm text-[#E8DCC8]">
        {video.title}
        {reduceMotion ? " · ניתן להפעיל ידנית" : ""}
      </figcaption>
    </figure>
  );
}

function DemoChoiceModal({ onClose, onRsvp, onEvent }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-[2rem] border border-[#E2D0AA] bg-[#FFFDF8] p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className={`${display.className} text-2xl font-bold text-[#2C241C]`}>איזה דמו תרצו?</h2>
          <button type="button" onClick={onClose} aria-label="סגירה" className="rounded-full border border-[#D8C6A0] p-2">
            <X size={18} />
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={onEvent}
            className="rounded-2xl border border-[#E6D2AA] bg-white p-5 text-right transition hover:border-[#C7A56B]"
          >
            <LayoutDashboard className="text-[#A67C3D]" />
            <p className="mt-3 font-black text-[#2C241C]">ניהול האירוע</p>
            <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">משימות, ספקים, תקציב ולו״ז</p>
          </button>
          <button
            type="button"
            onClick={onRsvp}
            className="rounded-2xl border border-[#E6D2AA] bg-white p-5 text-right transition hover:border-[#C7A56B]"
          >
            <Users className="text-[#A67C3D]" />
            <p className="mt-3 font-black text-[#2C241C]">אישורי הגעה והושבה</p>
            <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">רשימת אורחים ומפת שולחנות</p>
          </button>
        </div>
      </div>
    </div>
  );
}
