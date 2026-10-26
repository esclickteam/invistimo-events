"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

type Stage = "std" | "invite" | "rsvp";
type StyleId = "champagne" | "espresso" | "ivory";

const STYLES: { id: StyleId; label: string; bg: string; accent: string; text: string }[] = [
  { id: "champagne", label: "שמפניה", bg: "#F7EBD9", accent: "#C9A45C", text: "#3A2B22" },
  { id: "espresso", label: "אספרסו", bg: "#2C241C", accent: "#E8C988", text: "#FFF8EF" },
  { id: "ivory", label: "שנהב", bg: "#FFFDF8", accent: "#8A642E", text: "#2C241C" },
];

const STAGES: { id: Stage; label: string; when: string }[] = [
  { id: "std", label: "Save the Date", when: "שלב מוקדם" },
  { id: "invite", label: "הזמנה מלאה", when: "פרטים סגורים" },
  { id: "rsvp", label: "אישור הגעה", when: "סבבי אישור" },
];

function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div className="overflow-hidden rounded-[2rem] border-[10px] border-[#1C1612] bg-[#0B141A] shadow-[0_28px_60px_rgba(40,28,18,0.22)]">
        <div className="flex items-center gap-2 bg-[#075E54] px-3 py-2.5 text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold">
            I
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">Invistimo</p>
            <p className="text-[10px] text-white/70">הדגמה · לא נשלחת באמת</p>
          </div>
        </div>
        <div className="bg-[#0B141A] px-2.5 py-3">{children}</div>
      </div>
    </div>
  );
}

function CardFace({
  style,
  stage,
}: {
  style: (typeof STYLES)[number];
  stage: Stage;
}) {
  return (
    <div
      className="rounded-2xl px-4 py-5 text-center"
      style={{ background: style.bg, color: style.text }}
    >
      <p className="text-[10px] font-bold tracking-[0.2em]" style={{ color: style.accent }}>
        {stage === "std" ? "SAVE THE DATE" : stage === "invite" ? "INVITATION" : "RSVP"}
      </p>
      <p className="mt-3 font-black" style={{ fontSize: stage === "std" ? "1.35rem" : "1.2rem" }}>
        מיה ואלון
      </p>
      {stage === "std" ? (
        <>
          <p className="mt-2 text-sm opacity-90">מתחתנים!</p>
          <p className="mt-4 text-2xl font-black" style={{ color: style.accent }}>
            17.06.2027
          </p>
          <p className="mt-3 text-xs leading-5 opacity-80">נשמח שתשמרו את התאריך · פרטים בקרוב</p>
        </>
      ) : null}
      {stage === "invite" ? (
        <>
          <p className="mt-2 text-xs leading-5 opacity-90">שמחים להזמינכם ליום נישואינו</p>
          <p className="mt-3 text-sm font-bold">יום חמישי, 17 ביוני 2027</p>
          <p className="mt-2 text-xs opacity-85">קבלת פנים 19:00 · חופה 20:00</p>
          <p className="mt-2 text-xs font-semibold">אולם הגפן, תל אביב</p>
        </>
      ) : null}
      {stage === "rsvp" ? (
        <>
          <p className="mt-3 text-xs leading-5 opacity-90">הקישור האישי פתוח לאישור הגעה</p>
          <div className="mt-4 space-y-2">
            <span
              className="block rounded-full px-3 py-2 text-xs font-bold"
              style={{ background: style.accent, color: style.id === "espresso" ? "#2C241C" : "#FFFDF8" }}
            >
              מאשרים הגעה
            </span>
            <span className="block rounded-full border px-3 py-2 text-xs font-bold opacity-80">
              כמה מגיעים?
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function JourneyDemo() {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>("std");
  const [styleId, setStyleId] = useState<StyleId>("champagne");
  const style = STYLES.find((s) => s.id === styleId) || STYLES[0];

  const reset = () => {
    setStage("std");
    setStyleId("champagne");
  };

  return (
    <div className="rounded-[28px] border border-[#E6D2AA] bg-gradient-to-l from-[#FFF8EA] via-[#FFFDF8] to-[#F7EBD9] p-5 shadow-[0_18px_44px_rgba(58,39,20,0.08)] md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">שתי הזמנות, מסלול אחד</p>
          <h3 className="mt-2 text-2xl font-black text-[#2C241C] md:text-3xl">עברו בין השלבים</h3>
          <p className="mt-2 max-w-xl text-sm leading-7 text-[#5C4A3A]">
            לחצו על שלב בציר הזמן כדי לראות איך נראית הודעה מוקדמת, הזמנה מלאה ואישור הגעה — בלי שליחה אמיתית.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735] print:hidden"
        >
          איפוס
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="שלבי המסלול">
        {STAGES.map((s) => {
          const active = stage === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStage(s.id)}
              className={`rounded-full px-4 py-2.5 text-sm font-black transition ${
                active
                  ? "bg-[#2C241C] text-[#FFF8EF] shadow-[0_10px_24px_rgba(44,36,28,0.2)]"
                  : "border border-[#E6D2AA] bg-white text-[#5E4735] hover:bg-[#FFF8EA]"
              }`}
            >
              <span className="block">{s.label}</span>
              <span className={`block text-[10px] font-semibold ${active ? "text-[#E8C988]" : "text-[#A77A38]"}`}>
                {s.when}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 print:hidden" aria-label="סגנון הזמנה">
        {STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStyleId(s.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              styleId === s.id
                ? "border-[#8A642E] bg-[#FFF8EA] text-[#5E4735]"
                : "border-[#E6D2AA] bg-white/80 text-[#7A6042]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <PhoneShell>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${stage}-${styleId}`}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              className="overflow-hidden rounded-2xl rounded-tr-sm bg-[#1F2C34]"
            >
              {stage === "std" || stage === "invite" ? (
                <>
                  <div className="relative aspect-[3/4] w-full">
                    <Image
                      src={
                        stage === "std"
                          ? "/marketing/invites/invite-save-the-date-maya-itai.webp"
                          : "/marketing/invites/invite-wedding-mia-alon.webp"
                      }
                      alt={
                        stage === "std"
                          ? "כרטיס Save the Date לדוגמה — מיה ואלון"
                          : "הזמנה לחתונה לדוגמה — מיה ואלון"
                      }
                      fill
                      className="object-cover"
                      sizes="260px"
                    />
                  </div>
                  <pre className="whitespace-pre-wrap px-3 py-2.5 font-sans text-[12px] leading-5 text-[#E9EDEF]">
                    {stage === "std"
                      ? `Save The Date\nמיה ואלון\n\nאנחנו מתרגשים להזמין אתכם לשריין את התאריך\n17.06.2027\n\nפרטים נוספים יישלחו בקרוב 🤍`
                      : `מיה ואלון\nשמחים להזמינכם לחתונה\n17.06.2027\nקבלת פנים 19:00 · חופה 20:00\nאולם הגפן, תל אביב`}
                  </pre>
                </>
              ) : (
                <div className="p-2">
                  <CardFace style={style} stage="rsvp" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </PhoneShell>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E6D2AA] bg-white/90 p-5">
            <h4 className="text-lg font-black text-[#2C241C]">
              {stage === "std"
                ? "שלב ראשון — שמירת התאריך"
                : stage === "invite"
                  ? "שלב שני — ההזמנה המלאה"
                  : "שלב שלישי — אישור הגעה"}
            </h4>
            <p className="mt-3 text-sm leading-7 text-[#5C4A3A]">
              {stage === "std"
                ? "הודעה קצרה עם שמות ותאריך. ב־Invistimo נשלחת פעם אחת ב־WhatsApp עם תמונה, ואינה אוספת אישורי הגעה."
                : stage === "invite"
                  ? "כאן מופיעים האולם, השעות ומידע נוסף. מהקישור האישי האורחים רואים את פרטי האירוע."
                  : "בסבבי אישורי ההגעה — בהתאם לחבילה — האורחים מעדכנים אם יגיעו וכמה אנשים צפויים."}
            </p>
          </div>
          <ol className="grid gap-2 sm:grid-cols-3">
            {STAGES.map((s, i) => (
              <li
                key={s.id}
                className={`rounded-2xl border px-3 py-3 text-center text-xs font-bold ${
                  stage === s.id
                    ? "border-[#C9A45C] bg-[#FFF8EA] text-[#2C241C]"
                    : "border-[#EADDC8] bg-white/70 text-[#7A6042]"
                }`}
              >
                <span className="block text-[10px] text-[#A77A38]">{String(i + 1).padStart(2, "0")}</span>
                {s.label}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
