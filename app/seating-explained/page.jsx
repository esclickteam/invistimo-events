"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0 },
};

const transition = { duration: 0.65, ease: "easeOut" };

function Section({ children, className = "" }) {
  return (
    <section className={`w-full max-w-6xl mx-auto px-6 md:px-10 ${className}`}>
      {children}
    </section>
  );
}

function Pill({ children }) {
  return (
    <span
      className="
        inline-flex items-center gap-2
        px-4 py-2 rounded-full
        border border-[#e2d6c8]
        bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat
        text-[#4a413a] text-sm font-medium
      "
    >
      {children}
    </span>
  );
}

function MediaFrame({ children }) {
  return (
    <div
      className="
        rounded-3xl overflow-hidden
        border border-[#e2d6c8]
        bg-white
        shadow-[0_18px_60px_rgba(0,0,0,0.10)]
      "
    >
      {children}
    </div>
  );
}

function Block({ id, tone = "champagne", children }) {
  const base =
    "rounded-[32px] border border-[#e2d6c8] shadow-[0_20px_70px_rgba(0,0,0,0.08)] p-8 md:p-12";

  const champagne = "bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat";
  const white = "bg-white";

  return (
    <motion.div
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px" }}
      variants={fadeUp}
      transition={transition}
      className={`${base} ${tone === "white" ? white : champagne}`}
    >
      {children}
    </motion.div>
  );
}

export default function SeatingExplainedPage() {
  return (
    <div dir="rtl" className="relative overflow-hidden">
      {/* רקע כללי עדין כמו באתר */}
      <div className="pointer-events-none absolute inset-0 bg-[#fbf7f2]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('/noise.png')] opacity-[0.25]" />

      {/* ===================== BLOCK 1: HERO (פתיח מכירתי) ===================== */}
      <Section className="pt-28 md:pt-32 pb-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={transition}
          className="text-center"
        >
          <div className="flex justify-center mb-6">
            <Pill>סידורי הושבה • פרימיום • בזמן אמת</Pill>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-[#4a2e15]">
            סידור הושבה שמרגיש כמו אולם אמיתי
          </h1>

          <p className="mt-6 text-lg md:text-xl text-[#4a413a] max-w-3xl mx-auto leading-relaxed">
            בונים מפה מדויקת, משבצים אורחים בגרירה פשוטה, מנהלים הכל מהדשבורד —
            ובסוף שולחים הודעה לאורחים עם מספר השולחן שלהם. נקי, מדויק, ווואו.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/pricing"
              className="
                inline-flex items-center justify-center
                px-9 py-3.5 rounded-full
                bg-[#1d3f78] text-white font-semibold
                shadow-[0_12px_30px_rgba(29,63,120,0.25)]
                hover:bg-[#162c5a] transition
              "
            >
              התחילו לבנות הושבה
            </Link>

            <a
              href="#seat-block-2"
              className="
                inline-flex items-center justify-center
                px-9 py-3.5 rounded-full
                border border-[#cbb59d]
                text-[#4a413a] font-semibold
                bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat
                hover:bg-[#efe6db] transition
              "
            >
              לראות איך זה עובד
            </a>
          </div>
        </motion.div>
      </Section>

      {/* ===================== BLOCK 2: sit1 (הוספת שולחן + סקיצה) ===================== */}
      <Section className="py-10 md:py-12">
        <Block id="seat-block-2" tone="champagne">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="text-right">
              <div className="mb-4">
                <Pill>בניית אולם מדויקת</Pill>
              </div>

              <h2 className="text-3xl md:text-4xl font-extrabold text-[#4a2e15]">
                מעלים סקיצה מהאולם — ובונים עליה הושבה מושלמת
              </h2>

              <p className="mt-5 text-lg text-[#4a413a] leading-relaxed">
                יש לכם סקיצה שקיבלתם מהאולם? מעלים אותה כרקע ומניחים מעליה שולחנות ואלמנטים.
                זה נותן תכנון “אחד על אחד” עם השטח — ומקפיץ את הסדר והמקצועיות.
              </p>

              <div className="mt-7 space-y-3 text-[#4a413a]">
                <div className="flex gap-3 justify-end">
                  <span className="font-semibold">•</span>
                  <span>בחירת סוג שולחן + מספר כסאות — בשניות</span>
                </div>
                <div className="flex gap-3 justify-end">
                  <span className="font-semibold">•</span>
                  <span>גרירה ומיקום טבעיים על המפה</span>
                </div>
                <div className="flex gap-3 justify-end">
                  <span className="font-semibold">•</span>
                  <span>נוח לשינויים לאורך הדרך</span>
                </div>
              </div>
            </div>

            <MediaFrame>
              <img
                src="/sit1.png"
                alt="הוספת שולחן ובניית מפת אולם"
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            </MediaFrame>
          </div>
        </Block>
      </Section>

      {/* ===================== BLOCK 3: sit2 (שיבוץ בזמן אמת - וידאו) ===================== */}
      <Section className="py-10 md:py-12">
        <Block tone="white">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <MediaFrame>
              <video
                src="/videos/sit2.mp4"
                controls
                playsInline
                preload="metadata"
                className="w-full h-auto aspect-video object-cover"
              />
            </MediaFrame>

            <div className="text-right">
              <div className="mb-4">
                <Pill>שיבוץ חכם בזמן אמת</Pill>
              </div>

              <h2 className="text-3xl md:text-4xl font-extrabold text-[#4a2e15]">
                גוררים אורח לשולחן — והכל מסתנכרן אוטומטית
              </h2>

              <p className="mt-5 text-lg text-[#4a413a] leading-relaxed">
                מתוך תפריט האורחים בצד, <strong>גוררים את האורח לשולחן הרצוי</strong>.
                אפשר גם לשבץ דרך השולחן עצמו. וכל שינוי מתעדכן בזמן אמת —
                גם ליד שם האורח בתפריט הצד וגם בדשבורד.
              </p>

              <div className="mt-7 space-y-3 text-[#4a413a]">
                <div className="flex gap-3 justify-end">
                  <span className="font-semibold">•</span>
                  <span>אין כפילויות, אין בלבול, הכל ברור</span>
                </div>
                <div className="flex gap-3 justify-end">
                  <span className="font-semibold">•</span>
                  <span>מהיר בטירוף גם באירועים גדולים</span>
                </div>
                <div className="flex gap-3 justify-end">
                  <span className="font-semibold">•</span>
                  <span>נבנה כדי לעבוד חלק — כמו מוצר פרימיום</span>
                </div>
              </div>
            </div>
          </div>
        </Block>
      </Section>

      {/* ===================== BLOCK 4: sit3 (דשבורד - תמונה) ===================== */}
      <Section className="py-10 md:py-12">
        <Block tone="champagne">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="text-right">
              <div className="mb-4">
                <Pill>שליטה מהדשבורד</Pill>
              </div>

              <h2 className="text-3xl md:text-4xl font-extrabold text-[#4a2e15]">
                “הושבה אישית” לכל אורח — למצוא, לסמן, ולשנות בשנייה
              </h2>

              <p className="mt-5 text-lg text-[#4a413a] leading-relaxed">
                בדשבורד יש לכל אורח כפתור <strong>הושבה אישית</strong> —
                בלחיצה אחת המערכת מסמנת את השולחן והמיקום שלו, ומאפשרת לעדכן במהירות.
                מושלם לשינויים של הרגע האחרון בלי לשבור את כל ההושבה.
              </p>

              <div className="mt-7 space-y-3 text-[#4a413a]">
                <div className="flex gap-3 justify-end">
                  <span className="font-semibold">•</span>
                  <span>סימון מיקום ברור ומיידי</span>
                </div>
                <div className="flex gap-3 justify-end">
                  <span className="font-semibold">•</span>
                  <span>עדכון מהיר בלי לחפש “איפה הוא?”</span>
                </div>
              </div>
            </div>

            <MediaFrame>
              <img
                src="/sit3.png"
                alt="הושבה אישית מהדשבורד"
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            </MediaFrame>
          </div>
        </Block>
      </Section>

      {/* ===================== BLOCK 5: sit4 (וידאו הודעות) ===================== */}
      <Section className="py-10 md:py-12">
        <Block tone="white">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <MediaFrame>
              <video
                src="/videos/sit4.mp4"
                controls
                playsInline
                preload="metadata"
                className="w-full h-auto aspect-video object-cover"
              />
            </MediaFrame>

            <div className="text-right">
              <div className="mb-4">
                <Pill>הודעה לאורחים</Pill>
              </div>

              <h2 className="text-3xl md:text-4xl font-extrabold text-[#4a2e15]">
                מסיימים הושבה — ושולחים הודעות עם מספר השולחן
              </h2>

              <p className="mt-5 text-lg text-[#4a413a] leading-relaxed">
                אחרי שההושבה מסודרת, שולחים לאורחים הודעה שמציגה את מספר השולחן שלהם.
                זה חוסך המון שאלות ביום האירוע ומרים את החוויה לרמה מקצועית.
              </p>

              <div className="mt-7 space-y-3 text-[#4a413a]">
                <div className="flex gap-3 justify-end">
                  <span className="font-semibold">•</span>
                  <span>שליחה ישירות מתוך המערכת</span>
                </div>
                <div className="flex gap-3 justify-end">
                  <span className="font-semibold">•</span>
                  <span>כל אורח מקבל את המידע שלו — מסודר וברור</span>
                </div>
              </div>
            </div>
          </div>
        </Block>
      </Section>

      {/* ===================== BLOCK 6: CTA ===================== */}
      <Section className="pt-10 pb-24 md:pb-28">
        <Block tone="champagne">
          <div className="text-center">
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#4a2e15]">
              מוכנים להושבה שמרגישה פרימיום?
            </h3>
            <p className="mt-4 text-lg text-[#4a413a] max-w-2xl mx-auto leading-relaxed">
              אם חשוב לכם סדר, דיוק וחוויה חלקה — זו המערכת שתעשה לכם שקט.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/pricing"
                className="
                  inline-flex items-center justify-center
                  px-10 py-4 rounded-full
                  bg-[#1d3f78] text-white font-semibold text-lg
                  shadow-[0_12px_30px_rgba(29,63,120,0.25)]
                  hover:bg-[#162c5a] transition
                "
              >
                התחילו לבנות הושבה
              </Link>

              <Link
                href="/pricing"
                className="
                  inline-flex items-center justify-center
                  px-10 py-4 rounded-full
                  border border-[#cbb59d]
                  text-[#4a413a] font-semibold text-lg
                  bg-transparent
                  hover:bg-[#efe6db] transition
                "
              >
                לראות חבילות
              </Link>
            </div>
          </div>
        </Block>
      </Section>
    </div>
  );
}
