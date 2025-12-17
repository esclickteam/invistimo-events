"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0 },
};

const transition = { duration: 0.7, ease: "easeOut" };

function Section({ children, className = "" }) {
  return (
    <section className={`w-full max-w-6xl mx-auto px-6 md:px-10 ${className}`}>
      {children}
    </section>
  );
}

export default function SeatingExplainedPage() {
  return (
    <div dir="rtl" className="relative overflow-hidden">
      {/* רקע */}
      <div className="absolute inset-0 bg-[#fbf7f2] bg-[url('/noise.png')] bg-repeat opacity-[0.5]" />

      {/* בלוק פתיח */}
      <Section className="relative pt-28 md:pt-32 pb-10 text-center">
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={transition}
        >
          <h1 className="text-5xl md:text-6xl font-extrabold text-[#4a2e15] mb-4">
            סידורי הושבה חכמים לאירועים
          </h1>
          <p className="text-lg md:text-xl text-[#4a413a] max-w-3xl mx-auto leading-relaxed">
            עיצוב מפת אולם אמיתית, שיבוץ אורחים בגרירה, שליטה מלאה מהדשבורד —
            ושליחת הודעות עם מספר שולחן בלחיצה אחת.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/pricing"
              className="bg-[#1d3f78] text-white px-10 py-4 rounded-full text-lg font-semibold shadow hover:bg-[#162c5a] transition"
            >
              התחילו לבנות הושבה
            </Link>
            <a
              href="#block1"
              className="border border-[#cbb59d] px-10 py-4 rounded-full text-lg text-[#4a413a] bg-[#f5eee7] hover:bg-[#efe6db] transition"
            >
              לראות איך זה עובד
            </a>
          </div>
        </motion.div>
      </Section>

      {/* בלוק 1 – הוספת שולחן */}
      <Section id="block1" className="relative py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          transition={transition}
          className="rounded-[32px] border border-[#e2d6c8] bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat shadow p-10"
        >
          <h2 className="text-4xl font-bold text-[#4a2e15] text-center mb-6">
            מעלים סקיצה אמיתית של האולם ובונים עליה הושבה מושלמת
          </h2>
          <p className="text-lg text-[#4a413a] text-center max-w-3xl mx-auto mb-10">
            מוסיפים שולחנות, במה ואלמנטים על מפת האולם שלכם — ומקבלים תכנון מדויק
            אחד לאחד עם החלל האמיתי.
          </p>
          <div className="rounded-3xl overflow-hidden border border-[#e2d6c8] shadow mx-auto max-w-5xl">
            <img
              src="/sit1.png"
              alt="מפת שולחנות באולם"
              className="w-full h-[650px] object-contain"
            />
          </div>
        </motion.div>
      </Section>

      {/* בלוק 2 – וידאו שיבוץ */}
      <Section className="relative py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          transition={transition}
          className="rounded-[32px] border border-[#e2d6c8] bg-white shadow p-10"
        >
          <h2 className="text-4xl font-bold text-[#4a2e15] text-center mb-6">
            גוררים אורח לשולחן – וכל שינוי מתעדכן בזמן אמת
          </h2>
          <p className="text-lg text-[#4a413a] text-center max-w-3xl mx-auto mb-10">
            מתוך רשימת האורחים גוררים את השם אל השולחן הרצוי – וכל שינוי מסתנכרן
            מיד גם בדשבורד וגם בתפריט הצד.
          </p>
          <div className="rounded-3xl overflow-hidden border border-[#e2d6c8] shadow mx-auto max-w-5xl">
            <video
              src="/videos/sit2.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="w-full h-[650px] object-cover"
            />
          </div>
        </motion.div>
      </Section>

      {/* בלוק 3 – דשבורד */}
      <Section className="relative py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          transition={transition}
          className="rounded-[32px] border border-[#e2d6c8] bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat shadow p-10"
        >
          <h2 className="text-4xl font-bold text-[#4a2e15] text-center mb-6">
            “הושבה אישית” מדשבורד – שינוי מהיר לכל אורח
          </h2>
          <p className="text-lg text-[#4a413a] text-center max-w-3xl mx-auto mb-10">
            בדשבורד ניתן לראות בכל רגע היכן יושב כל אורח, ולעדכן את המיקום שלו
            בלחיצה אחת בלבד – מושלם לשינויים של הרגע האחרון.
          </p>
          <div className="rounded-3xl overflow-hidden border border-[#e2d6c8] shadow mx-auto max-w-5xl">
            <img
              src="/sit3.png"
              alt="דשבורד הושבה אישית"
              className="w-full h-[650px] object-contain"
            />
          </div>
        </motion.div>
      </Section>

      {/* בלוק 4 – וידאו הודעות */}
      <Section className="relative py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          transition={transition}
          className="rounded-[32px] border border-[#e2d6c8] bg-white shadow p-10"
        >
          <h2 className="text-4xl font-bold text-[#4a2e15] text-center mb-6">
            שליחת הודעות לאורחים עם מספר השולחן
          </h2>
          <p className="text-lg text-[#4a413a] text-center max-w-3xl mx-auto mb-10">
            אחרי שההושבה מסודרת, שולחים לאורחים הודעה חכמה שמציגה את מספר
            השולחן שלהם – ישירות מהמערכת.
          </p>
          <div className="rounded-3xl overflow-hidden border border-[#e2d6c8] shadow mx-auto max-w-5xl">
            <video
              src="/videos/sit4.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="w-full h-[650px] object-cover"
            />
          </div>
        </motion.div>
      </Section>

      {/* CTA */}
      <Section className="relative py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          transition={transition}
          className="rounded-[32px] border border-[#e2d6c8] bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat shadow p-12 text-center"
        >
          <h3 className="text-4xl font-bold text-[#4a2e15] mb-4">
            מוכנים להושבה שמרגישה פרימיום?
          </h3>
          <p className="text-lg text-[#4a413a] mb-8 max-w-2xl mx-auto">
            תכנון אולם, שיבוץ בזמן אמת, ניהול דשבורד והודעות חכמות — הכל במערכת
            אחת.
          </p>
          <Link
            href="/pricing"
            className="bg-[#1d3f78] text-white px-10 py-4 rounded-full text-lg font-semibold shadow hover:bg-[#162c5a] transition"
          >
            התחילו לבנות הושבה
          </Link>
        </motion.div>
      </Section>
    </div>
  );
}
