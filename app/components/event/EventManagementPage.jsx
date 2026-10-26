"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Frank_Ruhl_Libre } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Sparkles,
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

const RSVP_DEMO_URL = "/try/dashboard";
const EVENT_MANAGEMENT_DEMO_URL = "/try/event-management";

const IMG = {
  heroAtmosphere: "/images/rsvp/guides/wedding-planning/hero-reception.jpg",
  dashboardGuests: "/images/rsvp/chatuna/dashboard-guests.jpg",
  dashboardSeating: "/images/rsvp/chatuna/dashboard-seating.jpg",
  sitOverview: "/sit1.png",
  photographer: "/images/rsvp/guides/wedding-vendors/photographer.jpg",
  handshake: "/images/rsvp/guides/wedding-vendors/handshake.jpg",
  contract: "/images/rsvp/guides/wedding-vendors/contract.jpg",
  meeting: "/images/rsvp/guides/wedding-vendors/meeting.jpg",
  hallTables: "/images/rsvp/guides/wedding-planning/hall-tables.jpg",
  toast: "/images/rsvp/guides/wedding-planning/toast.jpg",
  phoneRsvp: "/images/rsvp/chatuna/phone-rsvp-form.jpg",
  phoneInvite: "/images/rsvp/chatuna/phone-invite.jpg",
};

const PILLARS = [
  {
    title: "מערכת לניהול אירוע",
    text: "משימות, ספקים, תקציב, תשלומים ולוח זמנים במקום אחד — למי שמנהל בעצמו או רוצה בסיס מסודר לפני ליווי.",
    icon: LayoutDashboard,
  },
  {
    title: "ליווי מקצועי",
    text: "הכוונה וליווי בהתאם למסלול השירות שמוצג בהצעה הפעילה — בלי להמציא חבילות או הכללות שלא סוכמו.",
    icon: ClipboardList,
  },
  {
    title: "מנהלי אירועים בשטח",
    text: "אפשרות לשירות ניהול ביום האירוע באמצעות מנהל מקצועי שעובד עם Invistimo — לפי אזור, תאריך וזמינות.",
    icon: MapPin,
  },
];

const NETWORK_STEPS = [
  {
    title: "משאירים פרטים",
    text: "מציינים אזור, תאריך משוער, סוג אירוע והיקף השירות שמעניין אתכם.",
  },
  {
    title: "בודקים התאמה",
    text: "בודקים מול הזמינות בפועל — אין הבטחה מראש למנהל בכל עיר או בכל תאריך.",
  },
  {
    title: "מבהירים מסלול",
    text: "מבהירים אם מדובר במערכת עצמאית, בליווי, בניהול יום־האירוע, או בשילוב — לפי מה שמתאים לכם.",
  },
  {
    title: "מקבלים הצעה",
    text: "כשיש התאמה, מקבלים הצעת מחיר ותנאי שירות לפי ההיקף שנבדק — בלי מחירים גנריים בעמוד.",
  },
  {
    title: "מתחברים לעבודה",
    text: "נכנסים למערכת, ומתואמים מול המנהל או הליווי כשסוכמו — הכול במקום אחד ככל שהמסלול מאפשר.",
  },
];

const PATHS = [
  {
    id: "self",
    title: "ניהול עצמאי עם המערכת",
    subtitle: "אתם מנהלים — המערכת מסדרת",
    image: IMG.dashboardGuests,
    imageAlt: "צילום מסך של לוח הבקרה לניהול מוזמנים ב־Invistimo",
    points: [
      "משימות, ספקים, תקציב, תשלומים ולו״ז במערכת ניהול האירוע",
      "גישה לדמו מלא של ניהול האירוע ב־/try/event-management",
      "אישורי הגעה, הושבה ו־LIVE הם שירותים נפרדים כשנמכרים בנפרד",
    ],
  },
  {
    id: "guidance",
    title: "ליווי מקצועי",
    subtitle: "הכוונה לפי ההצעה הפעילה",
    image: IMG.meeting,
    imageAlt: "פגישת תיאום מקצועית לקראת אירוע",
    points: [
      "ליווי והכוונה בהתאם למה שמופיע בהצעה שתקבלו — לא ממציאים הכללות בעמוד",
      "שילוב עם המערכת הדיגיטלית כדי שתהיה תמונה אחת של התכנון",
      "מתאים למי שרוצה יד מקצועית בתכנון בלי בהכרח נוכחות מלאה באולם",
    ],
  },
  {
    id: "dayof",
    title: "מנהל אירוע ביום האירוע",
    subtitle: "תיאום בשטח — לפי זמינות ותנאים",
    image: IMG.hallTables,
    imageAlt: "אולם אירועים מוכן לקבלת אורחים",
    points: [
      "ייתכן שיכלול תיאום ספקים ביום האירוע, מעקב לו״ז ונוכחות באולם — לפי ההסכם",
      "ההיקף המדויק נקבע רק אחרי בדיקת זמינות ותנאי השירות",
      "לא מחליף אוטומטית את מנהל האולם; משלימים או מתאמים לפי הצורך",
    ],
  },
];

const COMPARISON_ROWS = [
  {
    feature: "למי מתאים",
    self: "למי שמעדיף לנהל בעצמו עם כלים מסודרים",
    guidance: "למי שרוצה הכוונה מקצועית בתכנון",
    dayof: "למי שרוצה מנהל מקצועי ביום האירוע",
  },
  {
    feature: "מה מקבלים",
    self: "גישה למערכת ניהול האירוע",
    guidance: "ליווי לפי ההצעה הפעילה + שימוש במערכת",
    dayof: "שירות ניהול בשטח לפי ההסכם + מערכת",
  },
  {
    feature: "מי מבצע",
    self: "אתם (בעלי האירוע / המשפחה)",
    guidance: "אתם עם ליווי מקצועי",
    dayof: "מנהל אירוע שעובד עם Invistimo, לפי זמינות",
  },
  {
    feature: "מתי מתחיל",
    self: "מיד עם הכניסה למערכת",
    guidance: "לפי לוח הזמנים שסוכם בהצעה",
    dayof: "לרוב קרוב ליום האירוע + תיאום מקדים לפי ההסכם",
  },
  {
    feature: "נוכחות באולם",
    self: "לא כלולה כשירות חיצוני",
    guidance: "לא בהכרח — תלוי בהצעה",
    dayof: "כן, כשסוכם בהסכם השירות",
  },
  {
    feature: "שירותים משלימים",
    self: "RSVP / הושבה / LIVE כתוספות נפרדות כשנמכרות בנפרד",
    guidance: "אותן תוספות לפי הצורך וההצעה",
    dayof: "אותן תוספות; אלכוהול ומתנות קיימים בדמו המוצר",
  },
  {
    feature: "איך מקבלים הצעת מחיר",
    self: "דרך הדמו / יצירת קשר לפי הצורך",
    guidance: "בדיקת התאמה בטופס למטה",
    dayof: "בדיקת זמינות והתאמה בטופס — בלי מחיר גנרי בעמוד",
  },
];

const GALLERY = [
  {
    title: "לוח בקרה",
    see: "תמונת מצב של האירוע והמודולים העיקריים",
    problem: "מידע מפוזר בין הודעות, אקסל וספקים",
    do: "לנווט בין תכנון, ספקים, לו״ז ומודולים נוספים",
    path: "כלול במערכת ניהול האירוע",
    image: IMG.sitOverview,
    alt: "מסך סקירה של מערכת ניהול האירוע",
  },
  {
    title: "משימות",
    see: "רשימת משימות עם סטטוסים ותזכורות תכנון",
    problem: "משימות שנשכחות בין ספקים ותאריכים",
    do: "לסמן, לחלק ולעקוב אחרי מה שנותר לסגור",
    path: "כלול במערכת ניהול האירוע",
    image: null,
    alt: "",
  },
  {
    title: "ספקים",
    see: "כרטיסי ספקים, אנשי קשר והערות",
    problem: "פרטי ספקים מפוזרים בשיחות ובוואטסאפ",
    do: "לרכז אנשי קשר, סטטוסים ותיאומים",
    path: "כלול במערכת ניהול האירוע",
    image: IMG.handshake,
    alt: "לחיצת יד המייצגת תיאום מול ספקים",
  },
  {
    title: "תקציב",
    see: "פירוט סעיפי תקציב מול מה שתוכנן",
    problem: "קשה לדעת מה כבר הוקצה ומה נשאר",
    do: "לעדכן סעיפים ולראות תמונה כוללת",
    path: "כלול במערכת ניהול האירוע",
    image: IMG.contract,
    alt: "מסמך חוזה המייצג ניהול תקציב והתחייבויות",
  },
  {
    title: "תשלומים",
    see: "מעקב תשלומים לספקים ולסעיפים",
    problem: "מקדמות ותשלומים אחרונים מתערבבים",
    do: "לרשום מה שולם ומה ממתין",
    path: "כלול במערכת ניהול האירוע",
    image: null,
    alt: "",
  },
  {
    title: "לוח זמנים",
    see: "לו״ז ליום האירוע ולנקודות ציון בתכנון",
    problem: "חוסר תיאום בין ספקים לרגעי מפתח",
    do: "לבנות סדר פעולות ולשתף אותו",
    path: "כלול במערכת ניהול האירוע",
    image: IMG.toast,
    alt: "רגע חגיגי המייצג תיאום לוח זמנים לאירוע",
  },
  {
    title: "רשימת מוזמנים",
    see: "רשימת אורחים מעודכנת במערכת",
    problem: "גרסאות שונות של הרשימה אצל בני המשפחה",
    do: "לנהל רשומות, קבוצות ועדכונים",
    path: "במערכת RSVP / דשבורד המוזמנים",
    image: IMG.dashboardGuests,
    alt: "צילום מסך של רשימת מוזמנים ב־Invistimo",
  },
  {
    title: "אישורי הגעה (RSVP)",
    see: "שליחת הזמנות ומעקב אחרי תשובות",
    problem: "רדיפה ידנית אחרי אורחים",
    do: "לשלוח, לעקוב ולעדכן סטטוסים",
    path: "תוספת נפרדת כשנמכרת בנפרד",
    image: IMG.phoneRsvp,
    alt: "טופס אישור הגעה בטלפון",
  },
  {
    title: "הושבה",
    see: "מפת שולחנות ושיבוץ אורחים",
    problem: "שיבוץ ידני שמתעדכן באיחור",
    do: "לשבץ, לעדכן ולשתף מספרי שולחן",
    path: "תוספת נפרדת; LIVE כשנרכש",
    image: IMG.dashboardSeating,
    alt: "צילום מסך של מפת הושבה ב־Invistimo",
  },
];

const TIMELINE = [
  {
    stage: "לפני תחילת האירוע",
    text: "וידוא לו״ז, אנשי קשר של ספקים, נקודות תיאום מול האולם ומוכנות לרשימת האורחים.",
  },
  {
    stage: "הקמות",
    text: "תיאום הגעת ספקים, בדיקת עמדות וסידורים — לפי מה שסוכם במסלול.",
  },
  {
    stage: "קבלת פנים",
    text: "מעקב אחרי זרימת האורחים ותיאום מול צוות האולם / צוות ההושבה כשיש.",
  },
  {
    stage: "לקראת חופה",
    text: "וידוא שספקים ומשפחה מסונכרנים לרגע המרכזי.",
  },
  {
    stage: "במהלך",
    text: "מעקב אחרי נקודות ציון בלו״ז וטיפול בשינויים של הרגע האחרון.",
  },
  {
    stage: "בסיום",
    text: "סגירת תיאומים אחרונים מול ספקים והעברת סיכום לבעלי האירוע — לפי ההסכם.",
  },
];

const RSVP_STEPS = [
  "בונים רשימת מוזמנים במערכת",
  "שולחים הזמנה דיגיטלית / קישור אישי",
  "אוספים אישורי הגעה ומעדכנים סטטוסים",
  "מעדכנים מנות / הערות מול האולם לפי הצורך",
  "משבצים הושבה על בסיס מאשרי ההגעה",
  "משחררים מספרי שולחן לאורחים כשמוכן",
  "ביום האירוע — LIVE לניהול הגעה בפועל, כשהמודול נרכש",
];

const REGIONS = [
  "צפון",
  "חיפה והקריות",
  "שרון",
  "מרכז",
  "ירושלים והסביבה",
  "דרום",
];

const WHY_POINTS = [
  {
    title: "מערכת אחת לתכנון",
    text: "משימות, ספקים, תקציב, תשלומים ולו״ז — במקום אחד, כולל מודולים לדמו כמו אלכוהול ומתנות.",
  },
  {
    title: "חיבור ל־RSVP ולהושבה",
    text: "כשרוכשים את התוספות, רשימת המוזמנים, האישורים וההושבה מתחברים לאותו עולם מוצר.",
  },
  {
    title: "אנשי מקצוע לפי זמינות",
    text: "אפשר לבדוק ליווי או מנהל בשטח דרך הרשת של Invistimo — בלי הבטחת כיסוי ארצי מראש.",
  },
  {
    title: "שקיפות במסלולים",
    text: "עצמאי, ליווי או יום־האירוע — בוחרים לפי הצורך, וההיקף המדויק נקבע בהצעה.",
  },
];

export default function EventManagementPage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [regionHint, setRegionHint] = useState(null);
  const reduceMotion = useReducedMotion();

  const scrollToId = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goToDemo = (url) => {
    window.location.href = url;
  };

  const preferRegion = (region) => {
    setRegionHint(region);
    scrollToId("contact");
  };

  const fade = {
    hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div
      dir="rtl"
      className={`${display.variable} -mt-[64px] w-full overflow-x-hidden bg-[#FBF6EE] text-right text-[#3F3025]`}
    >
      {/* 1. HERO */}
      <section className="relative isolate min-h-[min(92vh,900px)] overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src={IMG.heroAtmosphere}
            alt="קבלת פנים חגיגית באולם אירועים"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#FFFDF8]/96 via-[#FBF6EE]/88 to-[#35281F]/45" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(199,165,107,0.28),transparent_42%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#FBF6EE] to-transparent" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-[110px] md:px-8 md:pb-24 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            variants={fade}
            transition={{ duration: 0.55 }}
          >
            <p
              className={`${display.className} text-3xl font-bold tracking-tight text-[#A67C3D] md:text-5xl`}
            >
              Invistimo
            </p>
            <h1
              className={`${display.className} mt-4 max-w-3xl text-[1.85rem] font-bold leading-[1.25] text-[#2C241C] md:text-[2.65rem]`}
            >
              ניהול אירועים מקצועי — מערכת חכמה ומנהלי אירועים ברחבי הארץ
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-[#35281F] md:text-xl md:leading-9">
              מתכננים בעצמכם או נעזרים במנהל אירוע מקצועי. עם Invistimo הכול מתחבר.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#5C4A3A] md:text-[17px]">
              מערכת דיגיטלית לניהול משימות, ספקים, תקציב, תשלומים ולוח זמנים — ולצדה אפשרות
              לבדוק ליווי מקצועי ומנהלי אירועים שעובדים עם Invistimo בישראל, בהתאם לאזור,
              לתאריך ולזמינות. אין הבטחת כיסוי בכל עיר בלי בדיקה.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => scrollToId("paths")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[#2C241C] via-[#3F3025] to-[#35281F] px-7 py-3.5 text-base font-extrabold text-white shadow-[0_18px_40px_rgba(44,36,28,0.28)] transition hover:-translate-y-0.5"
              >
                גלו את מסלולי ניהול האירוע
                <ArrowDown size={18} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(true)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#C7A56B] bg-[#FFFDF8]/92 px-7 py-3.5 text-base font-extrabold text-[#2C241C] shadow-[0_12px_28px_rgba(166,124,61,0.12)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
              >
                נסו את המערכת
                <ArrowLeft size={18} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => scrollToId("contact")}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#D8C6A0] bg-transparent px-7 py-3.5 text-base font-extrabold text-[#35281F] transition hover:bg-[#FFFDF8]/70"
              >
                בדקו אפשרות למנהל אירוע
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.12 }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <div className="relative overflow-hidden rounded-[1.75rem] border border-[#E6D2AA]/80 bg-[#FFFDF8]/80 p-2 shadow-[0_30px_80px_rgba(44,36,28,0.22)] backdrop-blur">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.35rem]">
                <Image
                  src={IMG.dashboardGuests}
                  alt="צילום מסך ממוצר Invistimo — ניהול מוזמנים"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 90vw, 420px"
                  priority
                />
              </div>
              <p className="px-3 py-3 text-center text-sm font-semibold text-[#5C4A3A]">
                תמונת מוצר אמיתית מהמערכת — לא רק אווירה
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. PILLARS */}
      <section className="border-y border-[#E8D9C0] bg-[#FFFDF8] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black tracking-[0.16em] text-[#A67C3D]">שלושה עמודי תווך</p>
          <h2
            className={`${display.className} mt-3 max-w-4xl text-3xl font-bold leading-tight text-[#2C241C] md:text-4xl`}
          >
            מערכת דיגיטלית מתקדמת. מנהלי אירועים מקצועיים. פתרון שמתאים לכם.
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article key={pillar.title} className="border-t-2 border-[#C7A56B] pt-6">
                  <div className="mb-4 text-[#A67C3D]">
                    <Icon size={28} aria-hidden />
                  </div>
                  <h3 className={`${display.className} text-2xl font-bold text-[#35281F]`}>
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-8 text-[#5C4A3A]">{pillar.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. NETWORK PROCESS */}
      <section className="bg-[#F8F2E8] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black tracking-[0.16em] text-[#A67C3D]">רשת מקצועית</p>
          <h2
            className={`${display.className} mt-3 max-w-3xl text-3xl font-bold text-[#2C241C] md:text-4xl`}
          >
            מנהלי אירועים מקצועיים ברחבי ישראל
          </h2>
          <p className="mt-4 max-w-3xl text-[17px] leading-8 text-[#5C4A3A]">
            Invistimo עובדת עם מנהלי אירועים מקצועיים בארץ. הזמינות תלויה באזור ובתאריך — לכן
            בודקים התאמה לפני שסוגרים. בעמוד זה אין שמות מנהלים, תמונות אנשים או הבטחת כיסוי
            לכל עיר.
          </p>

          <ol className="mt-12 space-y-0 border-r-2 border-[#C7A56B]/70 pr-6 md:pr-10">
            {NETWORK_STEPS.map((step, index) => (
              <li key={step.title} className="relative pb-10 last:pb-0">
                <span
                  className="absolute -right-[1.9rem] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#35281F] text-sm font-black text-[#FBF6EE] md:-right-[2.4rem]"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <h3 className={`${display.className} text-xl font-bold text-[#35281F] md:text-2xl`}>
                  {step.title}
                </h3>
                <p className="mt-2 max-w-2xl leading-8 text-[#5C4A3A]">{step.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10">
            <button
              type="button"
              onClick={() => scrollToId("contact")}
              className="inline-flex items-center gap-2 text-base font-extrabold text-[#A67C3D] underline decoration-[#C7A56B]/60 underline-offset-4 transition hover:text-[#B8892D]"
            >
              בדקו זמינות באזור שלכם
              <ArrowLeft size={16} aria-hidden />
            </button>
          </div>
        </div>
      </section>

      {/* 4. PATHS */}
      <section id="paths" className="scroll-mt-28 bg-[#FFFDF8] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black tracking-[0.16em] text-[#A67C3D]">מסלולים</p>
          <h2
            className={`${display.className} mt-3 text-3xl font-bold text-[#2C241C] md:text-4xl`}
          >
            שלוש דרכים לנהל את האירוע
          </h2>
          <p className="mt-4 max-w-3xl text-[17px] leading-8 text-[#5C4A3A]">
            אפשר להתחיל במערכת בלבד, להוסיף ליווי, או לבדוק מנהל ליום האירוע. המחירים וההיקף
            המדויקים מופיעים רק בהצעה אחרי בדיקה — לא בעמוד השיווקי.
          </p>

          <div className="mt-14 space-y-16">
            {PATHS.map((path, index) => (
              <article
                key={path.id}
                className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-12 ${
                  index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div className="relative aspect-[5/3] overflow-hidden rounded-[1.5rem] border border-[#E6D2AA] bg-[#F8F2E8]">
                  <Image
                    src={path.image}
                    alt={path.imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                <div>
                  <p className="text-sm font-black text-[#A67C3D]">מסלול {index + 1}</p>
                  <h3 className={`${display.className} mt-2 text-2xl font-bold text-[#2C241C] md:text-3xl`}>
                    {path.title}
                  </h3>
                  <p className="mt-2 font-bold text-[#3F3025]">{path.subtitle}</p>
                  <ul className="mt-5 space-y-3">
                    {path.points.map((point) => (
                      <li key={point} className="flex items-start gap-3">
                        <CheckCircle2
                          size={18}
                          className="mt-1 shrink-0 text-[#A67C3D]"
                          aria-hidden
                        />
                        <span className="leading-7 text-[#5C4A3A]">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 overflow-x-auto rounded-[1.5rem] border border-[#E6D2AA] bg-white">
            <table className="min-w-[860px] w-full border-collapse text-right">
              <caption className="border-b border-[#E6D2AA] bg-[#FBF6EE] px-5 py-4 text-right text-base font-bold text-[#2C241C]">
                השוואת מסלולים — בלי מחירים; הפרטים הסופיים בהצעה אחרי בדיקת התאמה
              </caption>
              <thead>
                <tr className="bg-[#FFFDF8] text-sm text-[#35281F]">
                  <th scope="col" className="px-4 py-4 font-black">
                    קריטריון
                  </th>
                  <th scope="col" className="px-4 py-4 font-black">
                    עצמאי
                  </th>
                  <th scope="col" className="px-4 py-4 font-black">
                    ליווי
                  </th>
                  <th scope="col" className="px-4 py-4 font-black">
                    מנהל ביום האירוע
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature} className="border-t border-[#EFE2CF] text-sm leading-7">
                    <th
                      scope="row"
                      className="bg-[#FFFDF8] px-4 py-4 align-top font-extrabold text-[#2C241C]"
                    >
                      {row.feature}
                    </th>
                    <td className="px-4 py-4 align-top text-[#5C4A3A]">{row.self}</td>
                    <td className="px-4 py-4 align-top text-[#5C4A3A]">{row.guidance}</td>
                    <td className="px-4 py-4 align-top text-[#5C4A3A]">{row.dayof}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5. PRODUCT GALLERY */}
      <section className="bg-[#F8F2E8] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black tracking-[0.16em] text-[#A67C3D]">המערכת</p>
          <h2
            className={`${display.className} mt-3 max-w-3xl text-3xl font-bold text-[#2C241C] md:text-4xl`}
          >
            כל פרטי האירוע שלכם, במקום אחד
          </h2>
          <p className="mt-4 max-w-3xl text-[17px] leading-8 text-[#5C4A3A]">
            תשעה אזורים מרכזיים במערכת ובמוצרים המשלימים. אישורי הגעה, הושבה ו־LIVE הם תוספות
            כשנמכרים בנפרד. מודולי אלכוהול ומתנות קיימים בדמו ניהול האירוע.
          </p>

          <div className="mt-12 space-y-8">
            {GALLERY.map((item, index) => (
              <article
                key={item.title}
                className="grid gap-6 border-b border-[#E0D0B4] pb-8 last:border-b-0 md:grid-cols-[minmax(0,220px)_1fr] md:gap-10"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#E6D2AA] bg-[#FFFDF8]">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.alt}
                      fill
                      className="object-cover"
                      sizes="220px"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                      <Sparkles className="text-[#C7A56B]" size={28} aria-hidden />
                      <p className="text-sm font-bold text-[#5C4A3A]">
                        זמין בדמו ניהול האירוע
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-black tracking-[0.14em] text-[#A67C3D]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className={`${display.className} mt-1 text-2xl font-bold text-[#35281F]`}>
                    {item.title}
                  </h3>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-extrabold text-[#2C241C]">מה רואים</dt>
                      <dd className="mt-1 text-sm leading-7 text-[#5C4A3A]">{item.see}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-extrabold text-[#2C241C]">איזו בעיה זה פותר</dt>
                      <dd className="mt-1 text-sm leading-7 text-[#5C4A3A]">{item.problem}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-extrabold text-[#2C241C]">מה אפשר לעשות</dt>
                      <dd className="mt-1 text-sm leading-7 text-[#5C4A3A]">{item.do}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-extrabold text-[#2C241C]">באיזה מסלול</dt>
                      <dd className="mt-1 text-sm leading-7 text-[#5C4A3A]">{item.path}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsDemoModalOpen(true)}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#35281F] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#2C241C]"
            >
              פתיחת בחירת דמו
            </button>
            <Link
              href={EVENT_MANAGEMENT_DEMO_URL}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#C7A56B] bg-[#FFFDF8] px-6 py-3 text-sm font-extrabold text-[#2C241C] transition hover:bg-white"
            >
              לדמו ניהול האירוע
            </Link>
          </div>
        </div>
      </section>

      {/* 6. DAY TIMELINE */}
      <section className="bg-[#FFFDF8] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black tracking-[0.16em] text-[#A67C3D]">יום האירוע</p>
          <h2
            className={`${display.className} mt-3 max-w-4xl text-3xl font-bold text-[#2C241C] md:text-4xl`}
          >
            מההכנות ועד הריקוד האחרון — מי מתאם את הכול?
          </h2>
          <p className="mt-4 max-w-3xl text-[17px] leading-8 text-[#5C4A3A]">
            הקו הזמנים להלן הוא להמחשה בלבד. לא כל פעולה מופיעה בכל חבילה — ההיקף נקבע בהסכם
            אחרי בדיקת זמינות ותנאים.
          </p>

          <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {TIMELINE.map((item, index) => (
              <li
                key={item.stage}
                className="relative border-t border-[#C7A56B] bg-gradient-to-b from-[#FBF6EE] to-transparent pt-5"
              >
                <span className={`${display.className} text-4xl font-bold text-[#C7A56B]/70`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-lg font-black text-[#35281F]">{item.stage}</h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 7. VENUE VS EXTERNAL */}
      <section className="bg-[#F8F2E8] px-4 py-20 md:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-sm font-black tracking-[0.16em] text-[#A67C3D]">אולם מול חיצוני</p>
            <h2
              className={`${display.className} mt-3 text-3xl font-bold text-[#2C241C] md:text-4xl`}
            >
              יש מנהל אירוע באולם. למה בכלל לשקול מנהל חיצוני?
            </h2>
            <p className="mt-5 text-[17px] leading-8 text-[#5C4A3A]">
              מנהל האולם אחראי בדרך כלל על תפעול שירותי המקום. מנהל חיצוני עובד מטעמכם — למשל
              כשהצלם מתעכב, כשה־DJ מחכה להוראה, או כשיש שינוי בלו״ז שצריך לתאם מול כמה ספקים
              במקביל. לא תמיד צריך את שניהם; לפעמים מספיק מנהל האולם, ולפעמים ליווי חיצוני
              משלים את התמונה.
            </p>
            <p className="mt-4 text-[17px] leading-8 text-[#5C4A3A]">
              דוגמה: הצלם מתעכב ברחוב. מי מודיע לדי־ג׳יי ולצוות האולם על דחיית החופה, ומי
              מעדכן את המשפחה בלי שתרוצו בין אנשי קשר? מנהל חיצוני יכול להיות הגורם שמתאם
              מול כולם — כשזה חלק מההסכם שלכם.
            </p>
            <Link
              href="/info/guides/event-management-vs-production"
              className="mt-7 inline-flex items-center gap-2 text-base font-extrabold text-[#A67C3D] underline decoration-[#C7A56B]/70 underline-offset-4 transition hover:text-[#B8892D]"
            >
              למדריך: ניהול אירוע או הפקת אירוע — ההבדלים ומה לבדוק
              <ArrowLeft size={16} aria-hidden />
            </Link>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-[#E6D2AA]">
            <Image
              src={IMG.photographer}
              alt="צלם אירועים בעבודה — דוגמה לצורך בתיאום ספקים"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 45vw"
            />
          </div>
        </div>
      </section>

      {/* 8. THREE DEEP SECTIONS */}
      <section className="bg-[#FFFDF8] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-6xl space-y-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="mb-3 text-[#A67C3D]">
                <Wallet size={26} aria-hidden />
              </div>
              <h2 className={`${display.className} text-3xl font-bold text-[#2C241C] md:text-4xl`}>
                תקציב ותשלומים
              </h2>
              <p className="mt-4 text-[17px] leading-8 text-[#5C4A3A]">
                במקום לנהל מקדמות באקסל נפרד, רושמים במערכת מה תוקצב ומה שולם לכל ספק. דוגמה:
                אולם עם מקדמה ותשלום אחרון, צלם עם שני תשלומים, והובלת פרחים ביום האירוע —
                רואים מה פתוח לפני שסוגרים את החודש שלפני.
              </p>
            </div>
            <div className="relative aspect-[5/3] overflow-hidden rounded-[1.5rem] border border-[#E6D2AA]">
              <Image
                src={IMG.contract}
                alt="חוזה והתחייבויות כספיות סביב תכנון אירוע"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="relative order-2 aspect-[5/3] overflow-hidden rounded-[1.5rem] border border-[#E6D2AA] lg:order-1">
              <Image
                src={IMG.handshake}
                alt="תיאום מול ספק אירועים"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="order-1 lg:order-2">
              <div className="mb-3 text-[#A67C3D]">
                <Users size={26} aria-hidden />
              </div>
              <h2 className={`${display.className} text-3xl font-bold text-[#2C241C] md:text-4xl`}>
                ספקים
              </h2>
              <p className="mt-4 text-[17px] leading-8 text-[#5C4A3A]">
                כל ספק עם איש קשר, סטטוס והערות — כדי שלא תחפשו מספר של הדי־ג׳יי בשיחה ישנה.
                דוגמה: מעבירים למנהל ביום האירוע רשימה אחת עם שעות הגעה משוערות, במקום להעתיק
                משלושה וואטסאפים.
              </p>
            </div>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="mb-3 text-[#A67C3D]">
                <CalendarClock size={26} aria-hidden />
              </div>
              <h2 className={`${display.className} text-3xl font-bold text-[#2C241C] md:text-4xl`}>
                לו״ז
              </h2>
              <p className="mt-4 text-[17px] leading-8 text-[#5C4A3A]">
                בונים את סדר היום — מקבלת פנים עד סיום — ומשתפים אותו עם מי שצריך. דוגמה: דחיית
                חופה ב־20 דקות מתעדכנת בלו״ז, ואז ברור מתי נכנסים צילומי משפחה ומתי נפתחת
                הרחבה, בלי לנחש מול השעון.
              </p>
            </div>
            <div className="relative aspect-[5/3] overflow-hidden rounded-[1.5rem] border border-[#E6D2AA]">
              <Image
                src={IMG.toast}
                alt="רגע חגיגי המייצג תזמון מדויק ביום האירוע"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 9. RSVP + SEATING */}
      <section className="bg-[#F8F2E8] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm font-black tracking-[0.16em] text-[#A67C3D]">RSVP והושבה</p>
              <h2
                className={`${display.className} mt-3 text-3xl font-bold text-[#2C241C] md:text-4xl`}
              >
                מההזמנה הראשונה ועד שהאורח מגיע לאולם
              </h2>
              <p className="mt-4 text-[17px] leading-8 text-[#5C4A3A]">
                אישורי הגעה, הושבה ו־LIVE הם חלק ממוצר Invistimo — ולעיתים נמכרים כתוספות
                נפרדות ממסלול ניהול האירוע. LIVE לניהול הגעה בפועל זמין כשהמודול נרכש במסגרת
                החבילה שסוכמה.
              </p>
              <ol className="mt-8 space-y-4">
                {RSVP_STEPS.map((step, index) => (
                  <li key={step} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#35281F] text-sm font-black text-[#FBF6EE]">
                      {index + 1}
                    </span>
                    <span className="pt-1 font-semibold leading-7 text-[#3F3025]">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/try/dashboard"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#C7A56B] bg-[#FFFDF8] px-5 py-2.5 text-sm font-extrabold text-[#2C241C]"
                >
                  דמו RSVP והושבה
                </Link>
                <Link
                  href="/seating-explained"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-transparent px-5 py-2.5 text-sm font-extrabold text-[#A67C3D] underline underline-offset-4"
                >
                  הסבר על הושבה
                </Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[1.5rem] border border-[#E6D2AA] bg-white">
                <Image
                  src={IMG.phoneInvite}
                  alt="הזמנה דיגיטלית בטלפון"
                  fill
                  className="object-cover"
                  sizes="280px"
                />
              </div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-[#E6D2AA] sm:mt-10">
                <Image
                  src={IMG.dashboardSeating}
                  alt="מפת הושבה במערכת Invistimo"
                  fill
                  className="object-cover object-top"
                  sizes="320px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. REGIONS */}
      <section className="bg-[#FFFDF8] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black tracking-[0.16em] text-[#A67C3D]">אזורים</p>
          <h2
            className={`${display.className} mt-3 max-w-3xl text-3xl font-bold text-[#2C241C] md:text-4xl`}
          >
            מחפשים מנהל אירוע באזור שלכם?
          </h2>
          <p className="mt-4 max-w-3xl text-[17px] leading-8 text-[#5C4A3A]">
            בחרו אזור לבדיקת זמינות בלבד. זו לא הבטחת כיסוי, ואין דפי קידום נפרדים לכל עיר.
            אחרי הבחירה תועברו לטופס יצירת הקשר עם תזכורת לאזור המועדף.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {REGIONS.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => preferRegion(region)}
                className={[
                  "rounded-2xl border px-5 py-3 text-sm font-extrabold transition",
                  regionHint === region
                    ? "border-[#A67C3D] bg-[#35281F] text-[#FBF6EE]"
                    : "border-[#D8C6A0] bg-[#FBF6EE] text-[#35281F] hover:border-[#C7A56B] hover:bg-white",
                ].join(" ")}
              >
                {region}
              </button>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-[#7A6A58]">
            הזמינות משתנה לפי תאריך והיקף. נבדוק ונחזור אליכם עם מה שאפשר להציע בפועל.
          </p>
        </div>
      </section>

      {/* 11. CONTACT */}
      <div className="bg-[#F8F2E8]">
        {regionHint ? (
          <div className="mx-auto max-w-3xl px-4 pt-10 md:px-6">
            <p
              className="rounded-2xl border border-[#C7A56B] bg-[#FFFDF8] px-4 py-3 text-sm font-bold leading-7 text-[#3F3025]"
              role="status"
            >
              ביקשתם לבדוק זמינות באזור: {regionHint}. אנא בחרו את אותו אזור בשדה האזור בטופס
              למטה.
            </p>
          </div>
        ) : null}
        <ContactForm />
      </div>

      {/* 12. WHY INVISTIMO */}
      <section className="bg-[#FFFDF8] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black tracking-[0.16em] text-[#A67C3D]">למה Invistimo</p>
          <h2
            className={`${display.className} mt-3 max-w-4xl text-3xl font-bold text-[#2C241C] md:text-4xl`}
          >
            הטכנולוגיה שמסדרת את התכנון. אנשי המקצוע שעוזרים לנהל את האירוע.
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {WHY_POINTS.map((item) => (
              <article key={item.title} className="border-r-2 border-[#C7A56B] pr-5">
                <h3 className={`${display.className} text-xl font-bold text-[#35281F] md:text-2xl`}>
                  {item.title}
                </h3>
                <p className="mt-3 leading-8 text-[#5C4A3A]">{item.text}</p>
              </article>
            ))}
          </div>
          <div className="mt-12 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setIsDemoModalOpen(true)}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#35281F] px-7 py-3.5 text-base font-extrabold text-white transition hover:bg-[#2C241C]"
            >
              נסו את המערכת
            </button>
            <button
              type="button"
              onClick={() => scrollToId("contact")}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#C7A56B] bg-[#FBF6EE] px-7 py-3.5 text-base font-extrabold text-[#2C241C] transition hover:bg-white"
            >
              בדקו התאמה למנהל אירוע
            </button>
          </div>
        </div>
      </section>

      {isDemoModalOpen ? (
        <DemoChoiceModal
          onClose={() => setIsDemoModalOpen(false)}
          onRsvpDemo={() => goToDemo(RSVP_DEMO_URL)}
          onEventManagementDemo={() => goToDemo(EVENT_MANAGEMENT_DEMO_URL)}
        />
      ) : null}
    </div>
  );
}

function DemoChoiceModal({ onClose, onRsvpDemo, onEventManagementDemo }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-choice-title"
    >
      <div
        className="relative w-full max-w-5xl rounded-[2rem] border border-[#E6D2AA] bg-[#FFFDF8] p-6 shadow-2xl md:p-10"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-full border border-[#D8C6A0] bg-[#FFFDF8] text-[#2C241C] transition hover:bg-[#F8F2E8]"
          aria-label="סגירה"
        >
          <X size={24} />
        </button>

        <div className="mx-auto mb-8 max-w-3xl text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[#D8C6A0] bg-[#F8F2E8] px-4 py-2 text-sm font-black text-[#A67C3D]">
            <Sparkles size={16} aria-hidden />
            בחירת דמו
          </div>
          <h2
            id="demo-choice-title"
            className="text-3xl font-black text-[#2C241C] md:text-4xl"
          >
            איזה דמו תרצו לראות?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-8 text-[#5C4A3A]">
            אפשר לבחור בין מערכת אישורי הגעה והושבה לבין מערכת ניהול והפקת אירוע.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <DemoCard
            icon={<Users size={28} aria-hidden />}
            title="אישורי הגעה והושבה"
            text="דמו להזמנות, אישורי הגעה, מוזמנים, שולחנות וסידורי הושבה."
            buttonText="כניסה לדמו"
            variant="gold"
            onClick={onRsvpDemo}
          />
          <DemoCard
            icon={<LayoutDashboard size={28} aria-hidden />}
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
    <div className="rounded-[1.75rem] border border-[#E6D2AA] bg-[#FFFDF8] p-7 text-center shadow-[0_16px_40px_rgba(166,124,61,0.08)]">
      <div
        className={[
          "mx-auto mb-6 flex h-14 w-full items-center justify-center rounded-2xl border text-[#A67C3D]",
          isGold ? "border-[#D8C6A0] bg-[#EFE2CF]" : "border-[#D8C6A0] bg-[#F8F2E8]",
        ].join(" ")}
      >
        {icon}
      </div>
      <h3 className="text-xl font-black text-[#2C241C] md:text-2xl">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-base font-semibold leading-8 text-[#5C4A3A]">
        {text}
      </p>
      <button
        type="button"
        onClick={onClick}
        className={[
          "mt-7 inline-flex min-w-[160px] items-center justify-center rounded-2xl px-6 py-3 text-base font-black transition hover:-translate-y-0.5",
          isGold
            ? "bg-gradient-to-l from-[#B8892D] via-[#C7A56B] to-[#A67C3D] text-white shadow-lg shadow-[#B8892D]/20"
            : "border border-[#D8C6A0] bg-[#FFFDF8] text-[#2C241C] hover:bg-[#F8F2E8]",
        ].join(" ")}
      >
        {buttonText}
      </button>
    </div>
  );
}
