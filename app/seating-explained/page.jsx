"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1];

// אנימציה “פרימיום”: כניסה עדינה + בלי להיעלם
const reveal = {
  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const t = { duration: 0.8, ease };

// ---------- UI helpers ----------
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
        inline-flex items-center justify-center
        px-4 py-2 rounded-full
        border border-[#e2d6c8]
        bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat
        text-[#4a413a] text-sm font-semibold
        shadow-[0_10px_30px_rgba(0,0,0,0.06)]
      "
    >
      {children}
    </span>
  );
}

function CardShell({ tone = "champagne", children }) {
  // רק צבעי אתר: שמפניה + לבן
  const base =
    "rounded-[36px] border border-[#e2d6c8] overflow-hidden shadow-[0_26px_90px_rgba(0,0,0,0.10)]";
  const champagne = "bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat";
  const white = "bg-white";
  return <div className={`${base} ${tone === "white" ? white : champagne}`}>{children}</div>;
}

function MediaWrap({ children }) {
  return (
    <div className="rounded-[28px] overflow-hidden border border-[#e2d6c8] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.10)]">
      {children}
    </div>
  );
}

// מדיה “גדולה” שלא נראית קטנה
function BigMedia({ mode = "cover", children }) {
  // mode: "cover" (לסרטון הדגמה) או "contain" (כדי לא לחתוך כלל)
  return (
    <div className="mx-auto w-full max-w-5xl">
      <MediaWrap>
        <div className="w-full">
          <div className="h-[520px] md:h-[720px] w-full">
            <div className={`w-full h-full ${mode === "contain" ? "bg-white" : ""}`}>{children}</div>
          </div>
        </div>
      </MediaWrap>
    </div>
  );
}

function TwoCol({ reverse = false, left, right }) {
  return (
    <div className={`grid lg:grid-cols-2 gap-10 lg:gap-14 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function Headline({ pill, title, desc }) {
  return (
    <div className="text-right">
      <div className="mb-4">{pill}</div>
      <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#4a2e15] leading-[1.1]">
        {title}
      </h2>
      <p className="mt-5 text-lg md:text-xl text-[#4a413a] leading-relaxed">{desc}</p>
    </div>
  );
}

function Bullets({ items }) {
  return (
    <div className="mt-7 space-y-3 text-[#4a413a]">
      {items.map((x, i) => (
        <div key={i} className="flex gap-3 justify-end">
          <span className="font-bold">•</span>
          <span className="text-[16px] md:text-[17px]">{x}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Page ----------
export default function SeatingExplainedPage() {
  return (
    <div dir="rtl" className="relative overflow-hidden">
      {/* רקע “פרימיום” עדין */}
      <div className="pointer-events-none absolute inset-0 bg-[#fbf7f2]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('/noise.png')] opacity-[0.25]" />
      {/* הילה עדינה (לא צבע חדש — רק לבן שקוף) */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full bg-white/50 blur-3xl" />

      {/* ===================== HERO ===================== */}
      <Section className="pt-28 md:pt-32 pb-14">
        <motion.div initial="hidden" animate="show" variants={reveal} transition={t} className="text-center">
          <div className="flex justify-center mb-6">
            <Pill>סידורי הושבה • פרימיום • בזמן אמת</Pill>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-[#4a2e15]">
            סידור הושבה שמרגיש כמו אולם אמיתי
          </h1>

          <p className="mt-6 text-lg md:text-xl text-[#4a413a] max-w-3xl mx-auto leading-relaxed">
            תכנון מדויק, שיבוץ מהיר בגרירה, שליטה חכמה מהדשבורד — והודעות לאורחים עם מספר שולחן.
            הכל נראה יוקרתי. הכל עובד חלק.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/pricing"
              className="
                inline-flex items-center justify-center
                px-10 py-4 rounded-full
                bg-[#1d3f78] text-white font-semibold text-lg
                shadow-[0_12px_34px_rgba(29,63,120,0.28)]
                hover:bg-[#162c5a] transition
              "
            >
              התחילו לבנות הושבה
            </Link>

            <a
              href="#seat-block-2"
              className="
                inline-flex items-center justify-center
                px-10 py-4 rounded-full
                border border-[#cbb59d]
                text-[#4a413a] font-semibold text-lg
                bg-[#f5eee7] bg-[url('/noise.png')] bg-repeat
                hover:bg-[#efe6db] transition
              "
            >
              לראות איך זה נראה
            </a>
          </div>
        </motion.div>
      </Section>

      {/* ===================== BLOCK 2: sit1 ===================== */}
      <Section className="py-10 md:py-12" id="seat-block-2">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={reveal} transition={t}>
          <CardShell tone="champagne">
            <div className="p-8 md:p-12">
              <TwoCol
                left={
                  <>
                    <Headline
                      pill={<Pill>בלוק 2 • סקיצת אולם + שולחנות</Pill>}
                      title="מעלים סקיצה מהאולם — ובונים עליה הושבה מושלמת"
                      desc="קיבלתם סקיצה מהאולם? מעלים אותה כרקע, ומניחים מעליה שולחנות ואלמנטים. זה נותן תכנון “אחד על אחד” עם השטח — ונראה כמו הפקה אמיתית."
                    />
                    <Bullets
                      items={[
                        "הוספת שולחנות תוך שניות (עגול / מרובע / אבירים)",
                        "מיקום מדויק על גבי הסקיצה — בלי לנחש",
                        "נוח לשינויים לאורך הדרך, גם ברגע האחרון",
                      ]}
                    />
                  </>
                }
                right={
                  <BigMedia mode="contain">
                    <img
                      src="/sit1.png"
                      alt="הוספת שולחן ובניית מפת אולם"
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </BigMedia>
                }
              />
            </div>
          </CardShell>
        </motion.div>
      </Section>

      {/* ===================== BLOCK 3: sit2 video ===================== */}
      <Section className="py-10 md:py-12">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={reveal} transition={t}>
          <CardShell tone="white">
            <div className="p-8 md:p-12">
              <TwoCol
                reverse
                left={
                  <>
                    <Headline
                      pill={<Pill>בלוק 3 • שיבוץ בזמן אמת</Pill>}
                      title="גוררים אורח לשולחן — והכל מסתנכרן אוטומטית"
                      desc="מתוך תפריט האורחים בצד גוררים את האורח לשולחן הרצוי (או משבצים דרך השולחן). כל שינוי מתעדכן מיד גם בתפריט הצד וגם בדשבורד."
                    />
                    <Bullets
                      items={[
                        "שיבוץ מהיר בלי בלגן ובלי “מי יושב איפה?”",
                        "עדכון בזמן אמת לכל מקום במערכת",
                        "עובד חלק גם באירועים גדולים",
                      ]}
                    />
                  </>
                }
                right={
                  <BigMedia mode="cover">
                    <video
                      src="/videos/sit2.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  </BigMedia>
                }
              />
            </div>
          </CardShell>
        </motion.div>
      </Section>

      {/* ===================== BLOCK 4: sit3 image ===================== */}
      <Section className="py-10 md:py-12">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={reveal} transition={t}>
          <CardShell tone="champagne">
            <div className="p-8 md:p-12">
              <TwoCol
                left={
                  <>
                    <Headline
                      pill={<Pill>בלוק 4 • הושבה אישית בדשבורד</Pill>}
                      title="למצוא אורח בשנייה — ולשנות בלי לשבור את ההושבה"
                      desc='מהדשבורד לכל אורח יש כפתור “הושבה אישית”. בלחיצה אחת המערכת מסמנת את השולחן והמיקום שלו, ומאפשרת תיקון מהיר ומדויק.'
                    />
                    <Bullets
                      items={[
                        "סימון ברור של מיקום ושולחן",
                        "מעולה לשינויים של הרגע האחרון",
                        "הכל נשאר מסונכרן מול ההושבה",
                      ]}
                    />
                  </>
                }
                right={
                  <BigMedia mode="contain">
                    <img
                      src="/sit3.png"
                      alt="הושבה אישית מהדשבורד"
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </BigMedia>
                }
              />
            </div>
          </CardShell>
        </motion.div>
      </Section>

      {/* ===================== BLOCK 5: sit4 video (לא נחתך) ===================== */}
      <Section className="py-10 md:py-12">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={reveal} transition={t}>
          <CardShell tone="white">
            <div className="p-8 md:p-12">
              <TwoCol
                reverse
                left={
                  <>
                    <Headline
                      pill={<Pill>בלוק 5 • שליחת הודעות לאורחים</Pill>}
                      title="מסיימים הושבה — ושולחים הודעות עם מספר השולחן"
                      desc="אחרי שההושבה מסודרת, שולחים לכל אורח הודעה עם מספר השולחן שלו. זה מצמצם שאלות ביום האירוע ומרגיש הכי מקצועי שיש."
                    />
                    <Bullets
                      items={[
                        "שליחה ישירות מתוך המערכת",
                        "כל אורח מקבל את המידע הרלוונטי אליו",
                        "חוויה נקייה, פרימיום ומרשימה",
                      ]}
                    />
                  </>
                }
                right={
                  // כאן בכוונה CONTAIN כדי שלא ייחתך (אמרת שהאחרון נחתך)
                  <BigMedia mode="contain">
                    <video
                      src="/videos/sit4.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain bg-white"
                    />
                  </BigMedia>
                }
              />
            </div>
          </CardShell>
        </motion.div>
      </Section>

      {/* ===================== CTA ===================== */}
      <Section className="pt-10 pb-24 md:pb-28">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} variants={reveal} transition={t}>
          <CardShell tone="champagne">
            <div className="p-10 md:p-14 text-center">
              <div className="flex justify-center mb-4">
                <Pill>קריאה לפעולה</Pill>
              </div>

              <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#4a2e15]">
                מוכנים להושבה שמרגישה פרימיום?
              </h3>

              <p className="mt-5 text-lg md:text-xl text-[#4a413a] max-w-2xl mx-auto leading-relaxed">
                אם חשוב לכם סדר, דיוק וחוויה חלקה — זה בדיוק המקום להתחיל.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/pricing"
                  className="
                    inline-flex items-center justify-center
                    px-10 py-4 rounded-full
                    bg-[#1d3f78] text-white font-semibold text-lg
                    shadow-[0_12px_34px_rgba(29,63,120,0.28)]
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
          </CardShell>
        </motion.div>
      </Section>
    </div>
  );
}
