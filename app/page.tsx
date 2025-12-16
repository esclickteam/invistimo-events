"use client";

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
  ArrowLeft,
  ShieldCheck,
  Zap,
} from "lucide-react";

const PRICING_URL = "https://www.invistimo.com/pricing";

/* אנימציה אחידה */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

/* ✅ transition חוקי */
const sectionTransition = { duration: 0.75 };

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* רקע כללי עדין */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-b from-[#f7f3ee] via-[#efe7dd] to-[#e7d9ca]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12] bg-[url('/noise.png')]" />

      {/* ================= HERO ================= */}
      <section className="relative">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full bg-[#d1bba3]/35 blur-[90px]" />
        <div className="pointer-events-none absolute top-40 right-[-120px] h-[420px] w-[420px] rounded-full bg-[#b79d85]/25 blur-[110px]" />

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 1 }}
          className="max-w-6xl mx-auto px-6 pt-28 md:pt-36 pb-24 text-center space-y-10"
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Badge icon={<Zap className="w-4 h-4" />} text="הקמה תוך דקות" />
            <Badge
              icon={<ShieldCheck className="w-4 h-4" />}
              text="בלי מנוי · בלי אותיות קטנות"
            />
            <Badge
              icon={<Star className="w-4 h-4" />}
              text="נראה יוקרתי, מרגיש מקצועי"
            />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-[#5c4632] leading-tight">
            האירוע שלכם,
            <br />
            <span className="text-[#b08a5a]">מסודר. רגוע. חכם.</span>
          </h1>

          <p className="text-lg md:text-2xl text-[#7b6754] max-w-3xl mx-auto leading-relaxed">
            <strong>Invistimo</strong> היא הדרך המודרנית לנהל אירוע:
            הזמנה דיגיטלית יוקרתית, אישורי הגעה, הושבה וניהול אורחים — הכל במקום אחד.
          </p>

          <div className="flex justify-center gap-4 flex-wrap pt-2">
            <a
              href={PRICING_URL}
              className="inline-flex items-center gap-2 px-14 py-4 rounded-full text-lg font-bold bg-[#5c4632] text-white hover:opacity-90 transition"
            >
              לצפייה בחבילות
              <ArrowLeft className="w-5 h-5" />
            </a>

            <a
              href="#why"
              className="inline-flex items-center px-14 py-4 rounded-full text-lg font-semibold border-2 border-[#c7a17a] text-[#6a5440] hover:bg-[#c7a17a]/10 transition"
            >
              למה זה עובד כל כך טוב?
            </a>
          </div>

          <p className="text-[#7b6754] text-sm md:text-base">
            פחות לחץ · פחות רדיפות · יותר שליטה
          </p>
        </motion.div>
      </section>

      {/* ================= PROBLEM ================= */}
      <section className="bg-[#efe7dd]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={sectionTransition}
          className="max-w-5xl mx-auto px-6 py-28 text-center space-y-12"
        >
          <h2 className="text-4xl font-bold text-[#5c4632]">
            ניהול אירוע לא אמור להרגיש כמו משרה מלאה
          </h2>

          <div className="grid md:grid-cols-3 gap-8 text-right">
            {[
              "רשימות אורחים שמתפזרות בין הודעות וקבצים",
              "אישורי הגעה שלא מעודכנים בזמן אמת",
              "טלפונים, חזרות והצקות — ואז שוב הכל משתנה",
            ].map((text) => (
              <Card key={text}>
                <p className="text-lg text-[#6a5440]">{text}</p>
              </Card>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ================= SOLUTION ================= */}
      <section className="bg-[#e7d9ca]" id="why">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={sectionTransition}
          className="max-w-6xl mx-auto px-6 py-28 text-center space-y-16"
        >
          <h2 className="text-4xl font-bold text-[#5c4632]">
            Invistimo עושה סדר — מההזמנה ועד האירוע
          </h2>

          <div className="grid md:grid-cols-4 gap-10">
            <Feature icon={<LayoutDashboard />} title="דשבורד אחד ברור" text="כל הנתונים מול העיניים, בלי בלגן." />
            <Feature icon={<Users />} title="אורחים בשליטה" text="ניהול רשימה, סטטוסים ועדכונים." />
            <Feature icon={<MessageCircle />} title="אישורי הגעה דיגיטליים" text="האורח מאשר בלחיצה — ואתם רואים מיד." />
            <Feature icon={<Armchair />} title="הושבה חכמה" text="סידור שולחנות בלי למחוק ולהתחיל מחדש." />
          </div>

          <a
            href={PRICING_URL}
            className="inline-flex items-center gap-2 px-12 py-4 rounded-full bg-white text-[#6a5440] font-bold border border-[#eadfce] shadow hover:shadow-md transition"
          >
            לראות חבילות ותמחור
            <ArrowLeft className="w-5 h-5" />
          </a>
        </motion.div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="bg-[#e8dfd4]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={sectionTransition}
          className="max-w-5xl mx-auto px-6 py-28 text-center space-y-10"
        >
          <h2 className="text-4xl font-bold text-[#5c4632]">
            מוכנים לאירוע רגוע באמת?
          </h2>

          <a
            href={PRICING_URL}
            className="inline-flex items-center gap-2 px-16 py-5 rounded-full text-lg font-bold bg-[#5c4632] text-white hover:opacity-90 transition"
          >
            אני רוצה לראות חבילות
            <ArrowLeft className="w-5 h-5" />
          </a>
        </motion.div>
      </section>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur border border-[#eadfce] px-4 py-2 text-sm text-[#6a5440] shadow-sm">
      <span className="text-[#b08a5a]">{icon}</span>
      <span className="font-semibold">{text}</span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow border border-[#eadfce]">
      {children}
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow border border-[#eadfce] text-right space-y-4">
      <div className="text-[#b08a5a]">{icon}</div>
      <div className="text-[#5c4632] font-bold text-lg">{title}</div>
      <div className="text-[#7b6754]">{text}</div>
    </div>
  );
}
