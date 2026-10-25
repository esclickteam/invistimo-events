"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { SAVE_THE_DATE_FAQS } from "./guideFaqs";

const PATH = "/rsvp/save-the-date";

/** Matches dashboard / home local preview for save_the_date_image_he (title + date vars). */
const STD_PREVIEW_MESSAGE = `Save The Date
מיה ואלון

אנחנו מתרגשים להזמין אתכם לשריין את התאריך
24.06.2027

פרטים נוספים יישלחו בקרוב 🤍`;

const STD_IMAGE = "/marketing/invites/invite-save-the-date-maya-itai.webp";
const STD_VIDEO = "/marketing/videos/home-save-the-date.webm";
const STD_POSTER = "/marketing/videos/home-save-the-date-poster.jpg";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

function Eyebrow({ children, onDark }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <p className={`text-sm font-black tracking-[0.14em] ${onDark ? "text-[#E8C988]" : "text-[#7A5530]"}`}>
      {children}
    </p>
  );
}

function WhatsappPhone() {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="overflow-hidden rounded-[2rem] border-[10px] border-[#1C1612] bg-[#0B141A] shadow-[0_30px_70px_rgba(40,28,18,0.28)]">
        <div className="flex items-center gap-2 bg-[#075E54] px-3 py-2.5 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-bold">I</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">Invistimo</p>
            <p className="text-[10px] text-white/75">הודעת WhatsApp · דמו</p>
          </div>
        </div>
        <div className="space-y-2 bg-[#0B141A] px-2.5 py-3">
          <div className="overflow-hidden rounded-2xl rounded-tr-sm bg-[#1F2C34] text-[#E9EDEF]">
            <div className="relative aspect-[3/4] w-full bg-[#2A211A]">
              <Image
                src={STD_IMAGE}
                alt="כרטיס Save the Date מעוצב לדוגמה — מיה ואלון"
                fill
                className="object-cover"
                sizes="280px"
                priority
              />
            </div>
            <pre className="whitespace-pre-wrap px-3 py-2.5 font-sans text-[12px] leading-5">{STD_PREVIEW_MESSAGE}</pre>
            <p className="px-3 pb-2 text-[10px] text-white/45">10:12 ✓✓</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-[#7A6042]">
        המחשה לפי תצוגת המוצר · תבנית מדיה save_the_date_image_he · נתוני דמו
      </p>
    </div>
  );
}

const WHY_ITEMS = [
  {
    title: "נותנים לאורחים זמן להיערך",
    text: "לאנשים יש עבודה, משפחה, חופשות ואירועים אחרים. הודעה מוקדמת מאפשרת לקחת את התאריך בחשבון עוד לפני ההזמנה המלאה.",
  },
  {
    title: "מתחילים את ההתרגשות מוקדם יותר",
    text: "Save the Date הוא לא רק מידע על תאריך — זו הזדמנות ראשונה לבשר באופן חגיגי ולשתף בעיצוב שבחרתם.",
  },
  {
    title: "נותנים מקום לאנשים החשובים לכם",
    text: "כשאורח מקבל הודעה אישית הוא יודע שלא מדובר רק בפרסום כללי. חשבתם עליו ורציתם שיידע על התאריך.",
  },
  {
    title: "מצמצמים התנגשויות ביומן",
    text: "הודעה מוקדמת עשויה לעזור להימנע מקביעת תוכניות אחרות לאותו יום — בלי להבטיח מניעת ביטולים או הגעה.",
  },
  {
    title: "מאפשרים לאורחים רחוקים להתארגן",
    text: "מי שצריך לנסוע, לקחת חופש או לארגן לינה יכול להפיק תועלת מהודעה מוקדמת.",
  },
] as const;

const STORY_COMPARE = [
  ["מי שנחשף לפרסום יכול לראות אותו", "נשלחת לנמענים שנבחרו"],
  ["תלוי בשימוש ברשת החברתית", "מגיעה דרך ערוץ תקשורת אישי"],
  ["פרסום כללי", "פנייה אישית"],
  ["לא בהכרח מגיע לכל המוזמנים", "ניתן לנהל שליחה לפי רשימת מוזמנים"],
  ["מתאים לשיתוף ההתרגשות", "מתאים לעדכון אישי של האורחים"],
] as const;

const TIMELINE = [
  { when: "כ־4 חודשים לפני", title: "Save the Date", text: "מבשרים על התאריך ומאפשרים לשריין אותו." },
  { when: "כ־5 שבועות לפני", title: "הזמנה רשמית", text: "שולחים את פרטי האירוע המלאים." },
  { when: "כ־14–18 ימים לפני", title: "סבב אישורים ראשון", text: "מתחילים לאסוף תשובות מהאורחים." },
  { when: "עד מסירת מספרים לאולם", title: "המשך סבבים", text: "לפי החבילה ולפי לוח הזמנים." },
  { when: "לקראת האירוע", title: "תזכורת", text: "מזכירים פרטים בהתאם לשירות שנבחר." },
  { when: "לאחר האירוע", title: "הודעת תודה", text: "אם השירות כלול או נרכש." },
] as const;

const STD_VS_INVITE = [
  ["נשלח מוקדם יותר", "נשלחת קרוב יותר לאירוע"],
  ["נועד לשריין את התאריך", "כוללת פרטים מלאים"],
  ["יכול לכלול שמות ותאריך", "כוללת אולם, כתובת ושעות"],
  ["אינו מחייב איסוף אישורים", "יכולה להשתלב בתהליך האישורים"],
  ["מבשר על האירוע", "מזמין באופן רשמי"],
] as const;

const MISTAKES = [
  ["לשלוח לפני שהתאריך סגור", "אם יש סיכוי ממשי לשינוי — עדיף להמתין."],
  ["להסתפק בסטורי", "לא כל המוזמנים יראו אותו. הודעה אישית משלימה את התמונה."],
  ["לשלוח למי שעדיין לא בטוחים שיוזמנו", "הודעה מוקדמת יוצרת ציפייה להזמנה רשמית."],
  ["להעמיס את כל הפרטים", "Save the Date אמור להיות קליל. הפרטים המלאים שייכים להזמנה."],
  ["לבלבל עם אישור הגעה", "זה שלב אחר — שמירת תאריך, לא איסוף תשובות."],
] as const;

export default function SaveTheDateMarketingPage() {
  const reduce = useReducedMotion();

  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      {/* HERO */}
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_10%,rgba(201,164,92,0.22),transparent_40%),radial-gradient(circle_at_90%_0%,rgba(58,43,34,0.08),transparent_36%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_48%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-6 md:gap-12 md:px-8 md:pb-16 md:pt-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <nav aria-label="מיקום בעמוד" className="mb-4 text-sm font-semibold text-[#7A6042]">
              <Link href="/" className="hover:text-[#8A642E]">
                ראשי
              </Link>
              <span className="px-1.5 text-[#C7A56B]">/</span>
              <Link href="/rsvp" className="hover:text-[#8A642E]">
                אישורי הגעה
              </Link>
              <span className="px-1.5 text-[#C7A56B]">/</span>
              <span>Save the Date</span>
            </nav>
            <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">Save the Date · Invistimo</p>
            <h1 className="mt-3 max-w-2xl text-[1.85rem] font-black leading-[1.15] tracking-[-0.03em] text-[#2C241C] md:text-[2.55rem]">
              Save the Date לחתונה — כי יש תאריכים שפשוט חייבים לשמור
            </h1>
            <p className="mt-5 max-w-xl text-xl font-bold leading-9 text-[#5E4735]">
              עוד לפני ההזמנה הרשמית, תנו לאנשים שאתם אוהבים להיות חלק מההתרגשות.
            </p>
            <div className="mt-5 max-w-xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                יש רגע שבו התאריך כבר נקבע, האולם נסגר, ואתם פשוט רוצים שכולם ידעו: אנחנו מתחתנים!
              </p>
              <p>
                Save the Date הוא הדרך שלכם לבשר לאנשים הקרובים על התאריך המיוחד, מספיק זמן מראש כדי שיוכלו
                לשריין אותו ביומן — בהודעה אישית ב־WhatsApp, עם תמונת Save the Date מעוצבת.
              </p>
              <p className="font-semibold text-[#5E4735]">כי ההתרגשות מתחילה הרבה לפני שמגיעים לאולם.</p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink href="/contact" className={ctaPrimary} location={`hero_contact:${PATH}`}>
                רוצים לשלוח Save the Date?
              </TrackedCtaLink>
              <a href="#whatsapp-look" className={ctaSecondary}>
                כך ההודעה נראית ב־WhatsApp
              </a>
            </div>
          </div>
          <div className="relative">
            {!reduce ? (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
              >
                <WhatsappPhone />
              </motion.div>
            ) : (
              <WhatsappPhone />
            )}
          </div>
        </div>
      </header>

      {/* WHAT IS IT */}
      <section aria-labelledby="what-is" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>הבשורה הראשונה</Eyebrow>
          <h2 id="what-is" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            קודם שומרים את התאריך. אחר כך שולחים את ההזמנה.
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              Save the Date, או בעברית «שמרו את התאריך», הוא הודעה מוקדמת שנשלחת לאורחים לפני ההזמנה הרשמית
              לחתונה. המטרה פשוטה: להודיע שהאירוע מתקרב ולאפשר לשריין את היום ביומן.
            </p>
            <p>
              בשלב הזה לא חייבים שכל הפרטים יהיו מוכנים. בדרך כלל מספיקים שמות בני הזוג, תאריך החתונה ולעיתים גם
              אזור האירוע. ההזמנה הרשמית — עם שעות, כתובת ויתר הפרטים — תגיע בהמשך.
            </p>
            <p className="rounded-[20px] border border-[#E6D2AA] bg-[#FBF6EE] px-5 py-4 font-semibold text-[#5E4735]">
              Save the Date אינו אישור הגעה. הוא גם לא מחליף את ההזמנה הרשמית. הוא הרגע שבו מתחילים לשתף את
              האנשים החשובים לכם בשמחה.
            </p>
          </div>
        </div>
      </section>

      {/* WHY SEND */}
      <section aria-labelledby="why-send" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>למה בכלל</Eyebrow>
          <h2 id="why-send" className="mt-3 max-w-3xl text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            למה לא פשוט לחכות להזמנה הרשמית?
          </h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {WHY_ITEMS.map((item, i) => (
              <li
                key={item.title}
                className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] px-5 py-6 shadow-[0_12px_32px_rgba(44,36,28,0.04)]"
              >
                {!reduce ? (
                  <motion.span
                    className="text-sm font-bold tracking-[0.2em] text-[#C9A45C]"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </motion.span>
                ) : (
                  <span className="text-sm font-bold tracking-[0.2em] text-[#C9A45C]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
                <h3 className="mt-2 text-xl font-black text-[#2C241C]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#5C4A3A]">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* STORY VS PERSONAL */}
      <section aria-labelledby="story-vs" className="bg-[#1C1612] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow onDark>סטורי מול הודעה אישית</Eyebrow>
          <h2 id="story-vs" className="mt-3 max-w-3xl text-3xl font-black leading-tight text-[#FFF8EF] md:text-4xl">
            סטורי מספר לעולם. הודעה אישית מספרת לאנשים שלכם.
          </h2>
          <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-[#D8CBB8] md:text-lg">
            <p>
              הרבה זוגות מפרסמים Save the Date באינסטגרם או בסטורי — וזה מקסים. אבל פרסום ברשתות אינו תחליף
              לשליחה אישית לאנשים שאתם באמת רוצים להזמין.
            </p>
            <p>
              לא כל האורחים משתמשים באינסטגרם. לא כולם רואים כל סטורי. ויש הבדל בתחושה: סטורי הוא הודעה כללית;
              הודעה אישית אומרת שהמידע נשלח אליהם במיוחד.
            </p>
            <p className="rounded-[20px] border border-[#C9A962]/35 bg-white/5 px-5 py-4 text-lg font-black text-[#FFF8EF]">
              Save the Date אישי הוא לא רק דרך להודיע על תאריך. הוא גם דרך לומר: אתם חלק מהיום שלנו.
            </p>
          </div>
          <div className="mt-10 overflow-x-auto rounded-[24px] border border-white/10 bg-white/5">
            <table className="min-w-[560px] w-full text-right text-sm md:min-w-0 md:text-base">
              <thead>
                <tr className="border-b border-white/10 text-[#E8C988]">
                  <th className="px-4 py-3 font-bold">פרסום בסטורי</th>
                  <th className="px-4 py-3 font-bold">הודעה אישית ב־WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {STORY_COMPARE.map(([a, b]) => (
                  <tr key={a} className="border-t border-white/10">
                    <td className="px-4 py-3 text-[#D8CBB8]">{a}</td>
                    <td className="px-4 py-3 text-[#FFF8EF]">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-[#B8A890]">
            לא צריך לבחור בין השניים. אפשר לפרסם סטורי יפה, ובמקביל לשלוח Save the Date אישי לאורחים. מסירת
            WhatsApp כפופה לתנאי הפלטפורמה ולמצב מספר הטלפון — אין הבטחה שמסירה או קריאה תמיד יתרחשו.
          </p>
        </div>
      </section>

      {/* WHATSAPP LOOK */}
      <section id="whatsapp-look" aria-labelledby="wa-look" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <Eyebrow>איך זה נראה</Eyebrow>
            <h2 id="wa-look" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              כך ההתרגשות מגיעה ישר לטלפון
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                ב־Invistimo נשלחת תבנית WhatsApp מאושרת מסוג מדיה — עם תמונת Save the Date בכותרת, ועם משתנים
                לכותרת האירוע ולתאריך.
              </p>
              <p>
                התמונה מועלית למערכת כחלק מהגדרת ה־Save the Date. השליחה מתבצעת מרשימת המוזמנים, פעם אחת, ואינה
                אוספת אישורי הגעה.
              </p>
              <ul className="space-y-2 text-sm font-bold text-[#5E4735] md:text-base">
                <li>· תמונת כותרת מעוצבת בהודעה עצמה</li>
                <li>· כותרת Save the Date + תאריך</li>
                <li>· שליחה חד־פעמית לפי רשימת מוזמנים</li>
                <li>· נפרד מסבבי אישורי ההגעה</li>
              </ul>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 sm:items-end">
            <WhatsappPhone />
            <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FBF6EE] shadow-[0_20px_50px_rgba(58,39,20,0.1)]">
              <Image
                src={STD_IMAGE}
                alt="תקריב כרטיס Save the Date מעוצב — מיה ואלון, נתוני דמו"
                width={864}
                height={1152}
                className="h-auto w-full object-cover"
                sizes="(max-width:768px) 100vw, 280px"
              />
              <figcaption className="px-4 py-3 text-center text-xs font-semibold text-[#7A6042]">
                תקריב עיצוב · נתוני דמו
              </figcaption>
            </figure>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-6xl overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#1C1612]">
          <video
            className="aspect-video h-auto w-full object-cover"
            src={STD_VIDEO}
            poster={STD_POSTER}
            controls
            playsInline
            preload="metadata"
          >
            סרטון הדגמת Save the Date
          </video>
          <p className="px-4 py-3 text-center text-sm text-[#D8CBB8]">
            סרטון הדגמה מהמותג — כך נראית חוויית Save the Date בטלפון
          </p>
        </div>
      </section>

      {/* WHEN TO SEND */}
      <section aria-labelledby="when" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>תזמון</Eyebrow>
          <h2 id="when" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            מתי שולחים Save the Date לחתונה?
          </h2>
          <p className="mt-6 text-base leading-8 text-[#5C4A3A] md:text-lg">
            ברוב החתונות כדאי לשקול שליחה כמה חודשים לפני האירוע, אחרי שהתאריך ומקום האירוע נקבעו בוודאות גבוהה.
            הזמנים שלהלן הם המלצות תכנון — לא חוקים.
          </p>
          <div className="mt-8 grid gap-4">
            {[
              ["כ־3–5 חודשים לפני", "טווח שימושי לחתונות רבות, במיוחד כשרוב האורחים בארץ."],
              ["כ־6–9 חודשים מראש", "כשיש אורחים מחו״ל שצריכים טיסות, מלונות או חופשה — ולעיתים מוקדם יותר."],
              [
                "התראה קצרה",
                "אפשר לשלוח גם בפרק זמן קצר יותר, אך כדאי לשקול אם כבר עדיף לשלוח הזמנה רשמית.",
              ],
            ].map(([title, text]) => (
              <div key={title} className="rounded-[20px] border border-[#E6D2AA] bg-white px-5 py-4">
                <h3 className="text-lg font-black text-[#2C241C]">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A3A] md:text-base">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 rounded-[18px] border border-[#E2B8B8]/60 bg-[#FBF0F0] px-4 py-3 text-sm leading-7 text-[#7A3535]">
            לא לשלוח Save the Date כשהתאריך עדיין לא סגור. אם יש סיכוי ממשי לשינוי — עדיף להמתין.
          </p>
          <p className="mt-6">
            <Link
              href="/info/guides/when-to-send-rsvp"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              מדריך מלא לתזמון Save the Date, הזמנה ואישורי הגעה
            </Link>
          </p>
        </div>
      </section>

      {/* TIMELINE */}
      <section aria-labelledby="timeline" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>ציר זמן</Eyebrow>
          <h2 id="timeline" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            מה־Save the Date ועד ליום החתונה
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#7A6042]">
            כל שלב כפוף לחבילה, לתנאים ולזמינות השירות.
          </p>
          <ol className="mt-10 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {TIMELINE.map((step, i) => (
              <li key={step.title} className="relative rounded-[22px] border border-[#E6D2AA] bg-[#FBF6EE] p-4">
                <p className="text-xs font-bold tracking-[0.16em] text-[#A77A38]">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-2 text-xs font-semibold text-[#7A6042]">{step.when}</p>
                <h3 className="mt-1 text-base font-black text-[#2C241C]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* VS INVITATION */}
      <section aria-labelledby="vs-invite" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>הבדלים</Eyebrow>
          <h2 id="vs-invite" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            Save the Date הוא הבשורה. ההזמנה היא כל הפרטים.
          </h2>
          <div className="mt-8 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-white">
            <table className="min-w-[560px] w-full text-right text-sm md:min-w-0 md:text-base">
              <thead className="bg-[#1C1612] text-[#F7F1E8]">
                <tr>
                  <th className="px-4 py-3 font-bold">Save the Date</th>
                  <th className="px-4 py-3 font-bold">הזמנה דיגיטלית</th>
                </tr>
              </thead>
              <tbody>
                {STD_VS_INVITE.map(([a, b]) => (
                  <tr key={a} className="border-t border-[#EADDC8]">
                    <td className="px-4 py-3 text-[#5C4A3A]">{a}</td>
                    <td className="px-4 py-3 text-[#5C4A3A]">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 max-w-3xl text-base leading-8 text-[#5C4A3A]">
            גם{" "}
            <Link href="/rsvp/chatuna" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              אישורי ההגעה
            </Link>{" "}
            הם שלב נפרד — אחרי ההזמנה.{" "}
            <Link
              href="/invitations/chatuna"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              לעמוד ההזמנות הדיגיטליות לחתונה
            </Link>
            {" · "}
            <Link
              href="/info/guides/save-the-date-vs-invitation"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              מדריך ההבדל בין Save the Date להזמנה
            </Link>
          </p>
        </div>
      </section>

      {/* WHY INVISTIMO */}
      <section aria-labelledby="why-inv" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>דרך Invistimo</Eyebrow>
          <h2 id="why-inv" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            הודעה אישית לכל אורח, כחלק מתהליך מסודר
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              במקום להעתיק הודעות ידנית ולנסות לזכור למי כבר שלחתם, אפשר לנהל את שליחת ה־Save the Date דרך{" "}
              <Link href="/info/guides/guest-list" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                רשימת המוזמנים
              </Link>
              .
            </p>
            <p>
              כך ההודעה המוקדמת משתלבת בתהליך — לצד ההזמנה הרשמית,{" "}
              <Link href="/rsvp" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                אישורי ההגעה
              </Link>{" "}
              והמשך ניהול האירוע.
            </p>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              "שימוש ברשימת המוזמנים",
              "שליחת Save the Date ב־WhatsApp עם תמונה",
              "שליחה חד־פעמית לפי הגדרות השירות",
              "הפרדה מסבבי אישורי ההגעה",
              "המשך עבודה עם אותה רשימה",
              "אפשרות לניהול שלבי האירוע ב־Invistimo",
            ].map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-[#E6D2AA] bg-[#FBF6EE] px-4 py-3 text-sm font-bold text-[#5E4735]"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* WHO / MUST */}
      <section aria-labelledby="who" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>למי שולחים</Eyebrow>
            <h2 id="who" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              למי כדאי לשלוח Save the Date?
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-[#5C4A3A]">
              <p>
                מומלץ לשלוח לאנשים שאתם מתכוונים להזמין לאירוע — לא לכל אנשי הקשר בטלפון. הודעה מוקדמת עלולה
                ליצור ציפייה להזמנה רשמית.
              </p>
              <p>למי שעדיין לא בטוחים שתזמינו — עדיף להמתין. יש הבדל בין שיתוף ציבורי ברשתות לבין פנייה אישית.</p>
            </div>
          </div>
          <div>
            <Eyebrow>חובה?</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              האם כל חתונה צריכה Save the Date?
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-[#5C4A3A]">
              <p>
                לא חובה. אם החתונה בהתראה קצרה או שההזמנה כבר מוכנה — ייתכן שעדיף לשלוח אותה ישירות. כשהאירוע
                מתוכנן חודשים מראש, Save the Date יכול להיות דרך נעימה להתחיל את התקשורת עם האורחים.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" aria-labelledby="price" className="bg-[#1C1612] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow onDark>מחיר</Eyebrow>
          <h2 id="price" className="mt-3 text-3xl font-black text-[#FFF8EF] md:text-4xl">
            כמה עולה לשלוח Save the Date לאורחים?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#D8CBB8]">
            לפי מחירון התוספות Pre‑RSVP במערכת (ברירת מחדל להצעות מכירה):
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[22px] border border-[#C9A962]/35 bg-white/5 px-5 py-6">
              <p className="text-sm font-bold text-[#E8C988]">Save the Date בלבד</p>
              <p className="mt-2 text-3xl font-black text-[#FFF8EF]">150 ₪</p>
            </div>
            <div className="rounded-[22px] border border-[#C9A962]/35 bg-white/5 px-5 py-6">
              <p className="text-sm font-bold text-[#E8C988]">Save the Date + הזמנה מוקדמת</p>
              <p className="mt-2 text-3xl font-black text-[#FFF8EF]">230 ₪</p>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-[#B8A890]">
            המחירים הם מחיר בסיס להצעה; הזמינות והסכום הסופי תלויים בחשבון ובהטבות הפעילות. Save the Date אינו
            מופיע כשורה קבועה בחבילת ההודעות הבסיסית במחשבון.
          </p>
          <p className="mx-auto mt-4 max-w-2xl rounded-[18px] border border-[#C9A962]/30 bg-white/5 px-4 py-3 text-base font-bold text-[#FFF8EF]">
            שליחת Save the Date היא פעולה נפרדת מסבבי אישורי ההגעה ואינה מנצלת סבב אישורי הגעה.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCtaLink href="/pricing" className={ctaPrimary} location={`price_pricing:${PATH}`}>
              לצפייה במחיר ובאפשרויות השליחה
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-base font-black text-[#FFF8EF] transition hover:bg-white/10"
              location={`price_contact:${PATH}`}
            >
              לדבר על פתיחת השירות
            </TrackedCtaLink>
          </div>
          <p className="mt-4 text-sm text-[#B8A890]">
            <Link
              href="/info/guides/cost-rsvp-wedding"
              className="underline-offset-4 hover:underline"
            >
              איך מחושב מחיר אישורי הגעה לפי רשומות
            </Link>
          </p>
        </div>
      </section>

      {/* MISTAKES */}
      <section aria-labelledby="mistakes" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>טעויות נפוצות</Eyebrow>
          <h2 id="mistakes" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            5 טעויות שכדאי להימנע מהן
          </h2>
          <ol className="mt-8 space-y-4">
            {MISTAKES.map(([title, text], i) => (
              <li key={title} className="rounded-[20px] border border-[#E6D2AA] bg-[#FBF6EE] px-5 py-4">
                <h3 className="text-lg font-black text-[#2C241C]">
                  {i + 1}. {title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A3A] md:text-base">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שאלות נפוצות</Eyebrow>
          <h2 id="faq" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            שאלות על Save the Date לחתונה
          </h2>
          <div className="mt-10 space-y-3">
            {SAVE_THE_DATE_FAQS.map((item) => (
              <details
                key={item.q}
                className="group rounded-[22px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-4 open:bg-white"
              >
                <summary className="cursor-pointer list-none text-base font-black text-[#2C241C] marker:content-none">
                  <span className="flex items-start justify-between gap-4">
                    {item.q}
                    <span className="text-[#C9A45C] transition group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1C1612] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black text-[#FFF8EF] md:text-4xl">מוכנים לבשר על התאריך?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#D8CBB8]">
            שלחו Save the Date אישי ב־WhatsApp — עם תמונה מעוצבת — ואחר כך המשיכו להזמנה ולאישורי הגעה באותה
            רשימת מוזמנים.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCtaLink href="/contact" className={ctaPrimary} location={`footer_contact:${PATH}`}>
              רוצים לשלוח Save the Date?
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/rsvp/whatsapp"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-base font-black text-[#FFF8EF] transition hover:bg-white/10"
              location={`footer_wa:${PATH}`}
            >
              אישורי הגעה ב־WhatsApp
            </TrackedCtaLink>
          </div>
          <nav aria-label="קישורים קשורים" className="mt-12 flex flex-wrap justify-center gap-3 text-sm">
            {[
              { href: "/rsvp", label: "אישורי הגעה" },
              { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
              { href: "/invitations/chatuna", label: "הזמנות דיגיטליות" },
              { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים" },
              { href: "/info/guides/guest-list", label: "רשימת מוזמנים" },
              { href: "/info/guides/cost-rsvp-wedding", label: "תמחור רשומות" },
              { href: "/info/guides/save-the-date-vs-invitation", label: "STD מול הזמנה" },
              { href: "/pricing", label: "חבילות" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full border border-[#C9A962]/30 px-4 py-2 text-[#E8D1A5] transition hover:bg-white/5"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </article>
  );
}
