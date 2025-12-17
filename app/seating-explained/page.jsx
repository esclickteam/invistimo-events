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
      {/* רקע עדין קבוע */}
      <div className="pointer-events-none absolute inset-0 bg-[#fbf7f2]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('/noise.png')] opacity-[0.35]" />

      {/* ======== בלוק פתיח ======== */}
      <Section>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fade}
          transition={fast}
          className="pt-28 md:pt-32 pb-16 md:pb-20 text-center"
        >
          <div className="flex justify-center mb-6">
            <Pill>סידורי הושבה • פרימיום • בזמן אמת</Pill>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-[#4a2e15]">
            סידור הושבה שמרגיש כמו אולם אמיתי
          </h1>

          <p className="mt-6 text-lg md:text-xl text-[#4a413a] max-w-3xl mx-auto leading-relaxed">
            עורך סידורי ההושבה של Invistimo מאפשר לכם לבנות מפת אולם אמיתית,
            לשבץ אורחים בגרירה פשוטה ולשלוח הודעות עם מספר השולחן שלהם — הכול
            בזמן אמת.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#1d3f78] text-white font-semibold shadow-[0_12px_30px_rgba(29,63,120,0.25)] hover:bg-[#162c5a] transition"
            >
              התחילו לבנות הושבה
            </Link>

            <a
              href="#seat-block-2"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-[#cbb59d] text-[#4a413a] font-semibold bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat hover:bg-[#efe6db] transition"
            >
              לראות איך זה עובד
            </a>
          </div>
        </motion.div>
      </Section>

      {/* ======== בלוק 2 – הוספת שולחן + סקיצה ======== */}
      <Section>
        <motion.div
          id="seat-block-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fade}
          transition={fast}
          className="rounded-[32px] border border-[#e2d6c8] bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat shadow-[0_20px_70px_rgba(0,0,0,0.08)] p-8 md:p-12 my-20"
        >
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="text-right">
              <Pill>בלוק 1 • הקמת אולם</Pill>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#4a2e15] mt-4">
                מתחילים נכון: שולחנות + סקיצה אמיתית של האולם
              </h2>
              <p className="mt-5 text-lg text-[#4a413a] leading-relaxed">
                מעלים את הסקיצה מהאולם, מוסיפים מעליה שולחנות ואלמנטים —
                ויוצרים מפת הושבה שמרגישה אמיתית, מדויקת ונוחה לשינויים.
              </p>
            </div>
            <MediaFrame>
              <img
                src="/sit1.png"
                alt="הוספת שולחן וסקיצת אולם"
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            </MediaFrame>
          </div>
        </motion.div>
      </Section>

      {/* ======== בלוק 3 – וידאו שיבוץ אורחים ======== */}
      <Section>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fade}
          transition={fast}
          className="rounded-[32px] border border-[#e2d6c8] bg-white shadow-[0_20px_70px_rgba(0,0,0,0.08)] p-8 md:p-12 my-20"
        >
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
              <Pill>בלוק 2 • שיבוץ בזמן אמת</Pill>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#4a2e15] mt-4">
                גוררים אורח — מושיבים. הכל מתעדכן מיד.
              </h2>
              <p className="mt-5 text-lg text-[#4a413a] leading-relaxed">
                גוררים את האורח מהתפריט הצדדי אל השולחן הרצוי, או משייכים ישירות
                מתוך השולחן עצמו. כל שינוי נשמר ומסתנכרן בזמן אמת.
              </p>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* ======== בלוק 4 – דשבורד ======== */}
      <Section>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fade}
          transition={fast}
          className="rounded-[32px] border border-[#e2d6c8] bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat shadow-[0_20px_70px_rgba(0,0,0,0.08)] p-8 md:p-12 my-20"
        >
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="text-right">
              <Pill>בלוק 3 • שליטה מהדשבורד</Pill>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#4a2e15] mt-4">
                “הושבה אישית” – מיקום מדויק בלחיצה אחת
              </h2>
              <p className="mt-5 text-lg text-[#4a413a] leading-relaxed">
                מהדשבורד ניתן לנהל הושבה של כל אורח. בלחיצה על “הושבה אישית”
                תראו בדיוק איפה הוא יושב ותוכלו להזיז אותו במהירות.
              </p>
            </div>
            <MediaFrame>
              <img
                src="/sit3.png"
                alt="הושבה אישית מדשבורד"
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            </MediaFrame>
          </div>
        </motion.div>
      </Section>

      {/* ======== בלוק 5 – וידאו הודעות ======== */}
      <Section>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fade}
          transition={fast}
          className="rounded-[32px] border border-[#e2d6c8] bg-white shadow-[0_20px_70px_rgba(0,0,0,0.08)] p-8 md:p-12 my-20"
        >
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
              <Pill>בלוק 4 • הודעות לאורחים</Pill>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#4a2e15] mt-4">
                שולחים הודעה עם מספר השולחן שלהם – ישירות מהמערכת.
              </h2>
              <p className="mt-5 text-lg text-[#4a413a] leading-relaxed">
                אחרי שכל ההושבה מסודרת, שלחו הודעה אישית לכל אורח עם מספר
                השולחן שלו. הכל אוטומטי, מסודר ומרגיש פרימיום.
              </p>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* ======== בלוק סיום ======== */}
      <Section>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fade}
          transition={fast}
          className="mb-24 md:mb-28 rounded-[32px] border border-[#e2d6c8] bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat shadow-[0_20px_70px_rgba(0,0,0,0.08)] p-10 md:p-14 text-center"
        >
          <h3 className="text-3xl md:text-4xl font-extrabold text-[#4a2e15]">
            רוצים את זה גם באירוע שלכם?
          </h3>
          <p className="mt-4 text-lg text-[#4a413a] max-w-2xl mx-auto leading-relaxed">
            תכנון אולם, שיבוץ בזמן אמת, שליטה מלאה מהדשבורד והודעות חכמות לאורחים —
            הכל במערכת אחת שמרגישה מושלמת.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-10 py-4 rounded-full bg-[#1d3f78] text-white font-semibold text-lg shadow-[0_12px_30px_rgba(29,63,120,0.25)] hover:bg-[#162c5a] transition"
            >
              התחילו לבנות הושבה
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-10 py-4 rounded-full border border-[#cbb59d] text-[#4a413a] font-semibold text-lg bg-transparent hover:bg-[#efe6db] transition"
            >
              לראות חבילות
            </Link>
          </div>
        </motion.div>
      </Section>
    </div>
  );
}
