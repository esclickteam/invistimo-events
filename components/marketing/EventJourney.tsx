import Link from "next/link";

export type JourneyStage = {
  id: string;
  label: string;
  title: string;
  text: string;
  href?: string;
  /** What package/addon typically unlocks this — factual, not “included for all”. */
  availability: string;
};

export const DEFAULT_EVENT_JOURNEY: JourneyStage[] = [
  {
    id: "save-the-date",
    label: "שלב א׳",
    title: "Save the Date",
    text: "הודעת וואטסאפ מוקדמת שמודיעה שהתאריך נשמר — בלי לדרוש מהאורח לאשר הגעה כשהוא עדיין לא יודע.",
    href: "/rsvp/save-the-date",
    availability: "כשהאפשרות פתוחה בחשבון",
  },
  {
    id: "invitation",
    label: "שלב ב׳",
    title: "הזמנה דיגיטלית",
    text: "שולחים הזמנה מעוצבת עם פרטי האירוע בקישור אישי — לפני שמתחילים לאסוף תשובות.",
    href: "/invitations/chatuna",
    availability: "כלול בבסיס חבילת ההודעות",
  },
  {
    id: "wedding-website",
    label: "שלב ג׳",
    title: "אתר חתונה אישי",
    text: "אתר מעוצב עם סיפור, גלריה, לו״ז, מיקום ואישור הגעה — חוויית אורח אחת במקום קבצים מפוזרים.",
    href: "/wedding-website",
    availability: "לפי הרשאת אתר חתונה / חוויית אורח אישית בחשבון",
  },
  {
    id: "rsvp",
    label: "שלב ד׳",
    title: "אישורי הגעה",
    text: "רק כשהאירוע מתקרב — בדרך כלל סביב שבועיים לפני — מתחילים סבבי אישור ואוספים תשובות במערכת.",
    href: "/rsvp",
    availability: "שני סבבי וואטסאפ בחבילת ההודעות",
  },
  {
    id: "guests-seating",
    label: "שלב ה׳",
    title: "מוזמנים והושבה",
    text: "מעקב אחרי מי ענה, כמה מגיעים, והערות — ואז שיבוץ שולחנות לפי סקיצת האולם אם נרכשה תוספת הושבה.",
    href: "/seating-explained",
    availability: "רשימה במערכת; הושבה כתוספת במחשבון",
  },
  {
    id: "event-day",
    label: "שלב ו׳",
    title: "יום האירוע",
    text: "כניסת אורחים וכלים תפעוליים לפי מה שנרכש — כולל מערכת ניהול אירוע או ליווי באולם אם סוכם.",
    href: "/event-management",
    availability: "לפי חבילה / תוספת ניהול אירוע",
  },
  {
    id: "thanks",
    label: "שלב ז׳",
    title: "הודעת תודה",
    text: "אחרי האירוע נשלחת הודעת תודה ב־SMS כחלק מחבילת ההודעות — לא כשירות נפרד שצריך להמציא.",
    href: "/rsvp/thank-you-messages",
    availability: "כלול בחבילת ההודעות",
  },
];

type Props = {
  stages?: JourneyStage[];
  heading?: string;
  lede?: string;
  /** Highlight one stage id (e.g. current page focus). */
  activeId?: string;
  compact?: boolean;
};

/**
 * Full event journey — marketing narrative that Invistimo is more than RSVP.
 * Availability notes keep package honesty.
 */
export default function EventJourney({
  stages = DEFAULT_EVENT_JOURNEY,
  heading = "המסע המלא של ניהול האירוע",
  lede = "אין צורך ללחוץ על האורחים לאשר הגעה חודשים מראש. אפשר לשלוח Save the Date והזמנה מוקדם, לתת להם זמן להתארגן, ורק כשהאירוע מתקרב להתחיל לאסוף תשובות.",
  activeId,
  compact = false,
}: Props) {
  return (
    <section
      aria-labelledby="event-journey-heading"
      className={`relative overflow-hidden ${compact ? "py-10" : "py-14 md:py-20"}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#FFFFFF_0%,#F2F4F7_45%,#F3E6D4_100%)]" aria-hidden />
      <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-[#D8B77C]/20 blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <div className={`max-w-3xl ${compact ? "" : "md:max-w-4xl"}`}>
          <p className="text-sm font-bold tracking-[0.18em] text-[#0F766E]">מסע האירוע</p>
          <h2 id="event-journey-heading" className="mt-3 text-3xl font-black leading-tight text-[#0B0E13] md:text-4xl">
            {heading}
          </h2>
          <p className="mt-4 text-base leading-8 text-[#3D4754] md:text-lg">{lede}</p>
        </div>

        <ol className="mt-10 space-y-0 md:mt-12">
          {stages.map((stage, index) => {
            const active = activeId === stage.id;
            const body = (
              <div
                className={`group relative grid gap-3 border-r-2 pr-5 md:grid-cols-[7rem_1fr_auto] md:gap-6 md:border-r-0 md:pr-0 ${
                  index < stages.length - 1 ? "pb-8 md:pb-10" : "pb-2"
                } ${active ? "border-[#0F766E]" : "border-[#D5DBE3]/80"}`}
              >
                <div className="absolute -right-[9px] top-1 h-4 w-4 rounded-full border-2 border-[#0F766E] bg-[#FFFFFF] md:hidden" aria-hidden />
                <div className="text-sm font-black text-[#0F766E]">{stage.label}</div>
                <div>
                  <h3 className={`text-xl font-black ${active ? "text-[#0B5A54]" : "text-[#0B0E13]"}`}>
                    {stage.title}
                  </h3>
                  <p className="mt-2 max-w-2xl leading-7 text-[#3D4754]">{stage.text}</p>
                  <p className="mt-2 text-sm font-semibold text-[#6B7583]">זמינות: {stage.availability}</p>
                </div>
                {stage.href ? (
                  <span className="self-start text-sm font-black text-[#0F766E] underline-offset-4 group-hover:underline">
                    למידע ←
                  </span>
                ) : null}
              </div>
            );

            return (
              <li key={stage.id} className="relative">
                {index < stages.length - 1 ? (
                  <span
                    className="pointer-events-none absolute right-[6px] top-5 hidden h-[calc(100%-0.5rem)] w-px bg-[#D5DBE3] md:right-auto md:left-[3.2rem] md:block"
                    aria-hidden
                  />
                ) : null}
                {stage.href ? (
                  <Link href={stage.href} className="block rounded-2xl outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0F766E]">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
