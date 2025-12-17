"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fade = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0 },
};

const fast = { duration: 0.65, ease: "easeOut" };

function Section({ children }) {
  return (
    <section className="w-full max-w-6xl mx-auto px-6 md:px-10">
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

export default function SeatingExplainedPage() {
  return (
    <div className="relative overflow-hidden">
      {/* רקע עדין כמו באתר */}
      <div className="pointer-events-none absolute inset-0 bg-[#fbf7f2]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('/noise.png')] opacity-[0.35]" />

      {/* ===================== BLOCK 1: HERO ===================== */}
      <Section>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fade}
          transition={fast}
          className="pt-28 md:pt-32 pb-16 md:pb-20"
        >
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Pill>סידורי הושבה • פרימיום • בזמן אמת</Pill>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-[#4a2e15]">
              סידור הושבה שמרגיש כמו אולם אמיתי
            </h1>

            <p className="mt-6 text-lg md:text-xl text-[#4a413a] max-w-3xl mx-auto leading-relaxed">
              בונים מפת אולם, משבצים אורחים בגרירה פשוטה, מנהלים הכל מהדשבורד —
              ובסוף שולחים הודעה לאורחים עם מספר השולחן שלהם. נקי, מדויק, וממש קל.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/pricing"
                className="
                  inline-flex items-center justify-center
                  px-8 py-3 rounded-full
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
                  px-8 py-3 rounded-full
                  border border-[#cbb59d]
                  text-[#4a413a] font-semibold
                  bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat
                  hover:bg-[#efe6db] transition
                "
              >
                לראות איך זה עובד
              </a>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* ===================== BLOCK 2: sit1 (הוספת שולחן + סקיצה) ===================== */}
      <div className="py-16 md:py-20">
        <Section>
          <motion.div
            id="seat-block-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-10% 0px" }}
            variants={fade}
            transition={fast}
            className="
              rounded-[32px]
              border border-[#e2d6c8]
              bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat
              shadow-[0_20px_70px_rgba(0,0,0,0.08)]
              p-8 md:p-12
            "
          >
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="text-right">
                <div className="mb-4">
                  <Pill>בלוק 1 • הקמת אולם</Pill>
                </div>

                <h2 className="text-3xl md:text-4xl font-extrabold text-[#4a2e15]">
                  מתחילים נכון: שולחנות + סקיצת אולם אמיתית
                </h2>

                <p className="mt-5 text-lg text-[#4a413a] leading-relaxed">
                  קיבלתם סקיצה מהאולם? מעלים אותה כרקע — ומניחים מעליה שולחנות ואלמנטים.
                  ככה אתם לא “מנחשים” — אתם בונים תכנון שמרגיש אחד-לאחד עם השטח.
                </p>

                <div className="mt-6 space-y-3 text-[#4a413a]">
                  <div className="flex gap-3 justify-end">
                    <span className="font-semibold">•</span>
                    <span>הוספת שולחן תוך שניות (עגול / מרובע / אבירים)</span>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <span className="font-semibold">•</span>
                    <span>בוחרים מספר כסאות — וממשיכים לעבוד</span>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <span className="font-semibold">•</span>
                    <span>בונים מפה מסודרת ונוחה לשינויים</span>
                  </div>
                </div>
              </div>

              <MediaFrame>
                <img
                  src="/sit1.png"
                  alt="הוספת שולחן + בניית מפת אולם"
                  className="w-full h-auto object-contain"
                  loading="lazy"
                />
              </MediaFrame>
            </div>
          </motion.div>
        </Section>
      </div>

      {/* ===================== BLOCK 3: sit2 (וידאו שיבוץ בזמן אמת) ===================== */}
      <div className="py-16 md:py-20">
        <Section>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-10% 0px" }}
            variants={fade}
            transition={fast}
            className="
              rounded-[32px]
              border border-[#e2d6c8]
              bg-white
              shadow-[0_20px_70px_rgba(0,0,0,0.08)]
              p-8 md:p-12
            "
          >
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <MediaFrame>
                <video
                  src="/video/sit2.mp4"
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-auto object-contain"
                />
              </MediaFrame>

              <div className="text-right">
                <div className="mb-4">
                  <Pill>בלוק 2 • שיבוץ בזמן אמת</Pill>
                </div>

                <h2 className="text-3xl md:text-4xl font-extrabold text-[#4a2e15]">
                  גוררים אורח — ומושיבים. פשוט.
                </h2>

                <p className="mt-5 text-lg text-[#4a413a] leading-relaxed">
                  מתוך תפריט האורחים בצד, <strong>גוררים את האורח לשולחן הרצוי</strong>.
                  אפשר גם לשבץ דרך השולחן עצמו. וכל שינוי מתעדכן מיד.
                </p>

                <div className="mt-6 space-y-3 text-[#4a413a]">
                  <div className="flex gap-3 justify-end">
                    <span className="font-semibold">•</span>
                    <span>עדכון בזמן אמת גם ברשימת האורחים וגם בדשבורד</span>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <span className="font-semibold">•</span>
                    <span>עובדים מהר, בלי בלבול, בלי “מי יושב איפה?”</span>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <span className="font-semibold">•</span>
                    <span>מושלם לשינויים במהלך הדרך</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </Section>
      </div>

      {/* ===================== BLOCK 4: sit3 (תמונה דשבורד) ===================== */}
      <div className="py-16 md:py-20">
        <Section>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-10% 0px" }}
            variants={fade}
            transition={fast}
            className="
              rounded-[32px]
              border border-[#e2d6c8]
              bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat
              shadow-[0_20px_70px_rgba(0,0,0,0.08)]
              p-8 md:p-12
            "
          >
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="text-right">
                <div className="mb-4">
                  <Pill>בלוק 3 • שליטה מהדשבורד</Pill>
                </div>

                <h2 className="text-3xl md:text-4xl font-extrabold text-[#4a2e15]">
                  “הושבה אישית” — למצוא אורח תוך שנייה
                </h2>

                <p className="mt-5 text-lg text-[#4a413a] leading-relaxed">
                  מהדשבורד אפשר לנהל הושבה של אורח ספציפי.
                  לחיצה על <strong>כפתור הושבה אישית</strong> מסמנת את המיקום שלו והשולחן —
                  ומאפשרת לתקן/להעביר במהירות כשצריך.
                </p>

                <div className="mt-6 space-y-3 text-[#4a413a]">
                  <div className="flex gap-3 justify-end">
                    <span className="font-semibold">•</span>
                    <span>סימון ברור של מיקום ושולחן</span>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <span className="font-semibold">•</span>
                    <span>מעולה לשינויים של הרגע האחרון</span>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <span className="font-semibold">•</span>
                    <span>הכל נשאר מסונכרן מול ההושבה</span>
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
          </motion.div>
        </Section>
      </div>

      {/* ===================== BLOCK 5: sit4 (וידאו הודעות) ===================== */}
      <div className="py-16 md:py-20">
        <Section>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-10% 0px" }}
            variants={fade}
            transition={fast}
            className="
              rounded-[32px]
              border border-[#e2d6c8]
              bg-white
              shadow-[0_20px_70px_rgba(0,0,0,0.08)]
              p-8 md:p-12
            "
          >
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <MediaFrame>
                <video
                  src="/video/sit4.mp4"
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-auto object-contain"
                />
              </MediaFrame>

              <div className="text-right">
                <div className="mb-4">
                  <Pill>בלוק 4 • הודעות לאורחים</Pill>
                </div>

                <h2 className="text-3xl md:text-4xl font-extrabold text-[#4a2e15]">
                  בסוף? שולחים הודעה עם מספר שולחן. וזהו.
                </h2>

                <p className="mt-5 text-lg text-[#4a413a] leading-relaxed">
                  אחרי שההושבה מסודרת — שולחים לאורחים הודעה עם מספר השולחן שלהם
                  ישירות מתוך המערכת. זה מפחית שאלות, עושה סדר, ונראה מקצועי.
                </p>

                <div className="mt-6 space-y-3 text-[#4a413a]">
                  <div className="flex gap-3 justify-end">
                    <span className="font-semibold">•</span>
                    <span>שליחה מהירה אחרי ההושבה</span>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <span className="font-semibold">•</span>
                    <span>כל אורח מקבל את המידע הרלוונטי אליו</span>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <span className="font-semibold">•</span>
                    <span>חוויה חלקה ומרשימה</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </Section>
      </div>

      {/* ===================== BLOCK 6: CTA ===================== */}
      <Section>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10% 0px" }}
          variants={fade}
          transition={fast}
          className="
            mb-24 md:mb-28
            rounded-[32px]
            border border-[#e2d6c8]
            bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat
            shadow-[0_20px_70px_rgba(0,0,0,0.08)]
            p-10 md:p-14
            text-center
          "
        >
          <h3 className="text-3xl md:text-4xl font-extrabold text-[#4a2e15]">
            רוצים את זה אצלכם באירוע?
          </h3>
          <p className="mt-4 text-lg text-[#4a413a] max-w-2xl mx-auto leading-relaxed">
            תכנון אולם + שיבוץ בזמן אמת + ניהול מהדשבורד + הודעות לאורחים —
            הכל בתוך מערכת אחת שמרגישה פרימיום.
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
        </motion.div>
      </Section>
    </div>
  );
}
