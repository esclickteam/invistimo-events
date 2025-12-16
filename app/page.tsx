"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  PhoneOff,
  Sparkles,
  LayoutDashboard,
  Users,
  Armchair,
  MessageCircle,
  Star,
} from "lucide-react";

/* אנימציה אחידה */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export default function HomePage() {
  return (
    <div className="space-y-0 overflow-hidden">

      {/* ================= HERO ================= */}
      <section className="bg-[#f7f3ee]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 1 }}
          className="max-w-6xl mx-auto px-6 pt-32 pb-40 text-center space-y-10"
        >
          <h1 className="text-5xl md:text-7xl font-bold text-[#5c4632] leading-tight">
            האירוע שלכם,
            <br />
            <span className="text-[#b08a5a]">כמו שהעולם עובד היום</span>
          </h1>

          <p className="text-xl md:text-2xl text-[#7b6754] max-w-3xl mx-auto">
            Invistimo היא מערכת לניהול אירועים בצורה חכמה:
            הזמנות דיגיטליות, אישורי הגעה והושבה —
            בלי טלפונים, בלי בלגן, ובלי לבזבז אנרגיה.
          </p>

          <Link
            href="/packages"
            className="inline-block px-14 py-4 rounded-full text-lg font-bold bg-[#5c4632] text-white hover:opacity-90 transition"
          >
            לצפייה בחבילות
          </Link>
        </motion.div>
      </section>

      {/* ================= PROBLEM ================= */}
      <section className="bg-[#efe7dd]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto px-6 py-32 space-y-12 text-center"
        >
          <h2 className="text-4xl font-bold text-[#5c4632]">
            ניהול אירוע לא אמור להרגיש כמו עבודה במשרה מלאה
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              "רשימות אורחים שמתפזרות בין הודעות",
              "אישורי הגעה שלא מעודכנים",
              "טלפונים, חזרות, ורדיפה אחרי אנשים",
            ].map((text) => (
              <div
                key={text}
                className="bg-white p-8 rounded-2xl shadow border border-[#eadfce]"
              >
                <p className="text-lg text-[#6a5440]">{text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ================= SOLUTION ================= */}
      <section className="bg-[#e7d9ca]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto px-6 py-32 space-y-16 text-center"
        >
          <h2 className="text-4xl font-bold text-[#5c4632]">
            Invistimo עושה סדר – מההזמנה ועד האירוע
          </h2>

          <div className="grid md:grid-cols-4 gap-10">
            <Feature icon={<LayoutDashboard />} text="דשבורד אחד ברור" />
            <Feature icon={<Users />} text="ניהול אורחים חכם" />
            <Feature icon={<MessageCircle />} text="אישורי הגעה דיגיטליים" />
            <Feature icon={<Armchair />} text="סידורי הושבה מתקדמים" />
          </div>
        </motion.div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="bg-[#f3eee7]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto px-6 py-32 text-center space-y-16"
        >
          <h2 className="text-4xl font-bold text-[#5c4632]">
            איך זה עובד?
          </h2>

          <div className="grid md:grid-cols-3 gap-10">
            <Step number="1" text="יוצרים הזמנה דיגיטלית" />
            <Step number="2" text="שולחים קישור לאורחים" />
            <Step number="3" text="הכול מתעדכן אוטומטית" />
          </div>
        </motion.div>
      </section>

      {/* ================= NO PHONE CALLS ================= */}
      <section className="bg-[#e8dfd4]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto px-6 py-32 text-center space-y-12"
        >
          <PhoneOff className="w-14 h-14 mx-auto text-[#b08a5a]" />

          <h2 className="text-4xl font-bold text-[#5c4632]">
            למה אנחנו לא עושים סבבי טלפונים?
          </h2>

          <p className="text-xl text-[#7b6754] max-w-3xl mx-auto">
            כי זה בזבוז כסף, זמן ואנרגיה.
            היום מי שרוצה להגיע – מאשר בלחיצה.
            אין טעם להציק לאורחים, ואין סיבה שתשלמו על זה.
          </p>
        </motion.div>
      </section>

      {/* ================= SEATING ================= */}
      <section className="bg-[#f7f3ee]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto px-6 py-32 text-center space-y-14"
        >
          <h2 className="text-4xl font-bold text-[#5c4632]">
            סידורי הושבה בלי כאבי ראש
          </h2>

          <p className="text-xl text-[#7b6754] max-w-3xl mx-auto">
            גרירה חופשית של שולחנות, הצמדת אורחים,
            ושינויים גם ברגע האחרון – בלי למחוק הכול מחדש.
          </p>
        </motion.div>
      </section>

      {/* ================= WHO ITS FOR ================= */}
      <section className="bg-[#efe7dd]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto px-6 py-32 text-center space-y-16"
        >
          <h2 className="text-4xl font-bold text-[#5c4632]">
            למי זה מתאים?
          </h2>

          <div className="grid md:grid-cols-4 gap-8">
            {["חתונות", "בר / בת מצווה", "אירועים פרטיים", "אירועים עסקיים"].map(
              (t) => (
                <div
                  key={t}
                  className="bg-white p-8 rounded-2xl shadow border border-[#eadfce]"
                >
                  <p className="text-lg font-semibold text-[#6a5440]">{t}</p>
                </div>
              )
            )}
          </div>
        </motion.div>
      </section>

      {/* ================= CTA ================= */}
      <section className="bg-[#e7d9ca]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto px-6 py-32 text-center space-y-10"
        >
          <h2 className="text-4xl font-bold text-[#5c4632]">
            מוכנים לנהל אירוע חכם ורגוע?
          </h2>

          <Link
            href="/packages"
            className="inline-block px-16 py-5 rounded-full text-lg font-bold bg-[#5c4632] text-white hover:opacity-90 transition"
          >
            לצפייה בחבילות
          </Link>

          <p className="text-[#7b6754] text-sm">
            תשלום חד־פעמי · בלי מנויים · בלי אותיות קטנות
          </p>
        </motion.div>
      </section>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow border border-[#eadfce] space-y-4">
      <div className="text-[#b08a5a]">{icon}</div>
      <p className="text-[#6a5440] font-semibold">{text}</p>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="bg-white p-10 rounded-2xl shadow border border-[#eadfce] space-y-4">
      <div className="text-4xl font-bold text-[#b08a5a]">{number}</div>
      <p className="text-lg text-[#6a5440]">{text}</p>
    </div>
  );
}
