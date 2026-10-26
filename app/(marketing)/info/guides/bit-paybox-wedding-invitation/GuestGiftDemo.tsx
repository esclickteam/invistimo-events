"use client";

import { useState } from "react";

type Mode = "both" | "bit" | "paybox";

const DEMO_BIT = "0501234567";
const DEMO_PAYBOX = "https://paybox.example/demo-wedding-link";

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}

export default function GuestGiftDemo() {
  const [mode, setMode] = useState<Mode>("both");
  const [panel, setPanel] = useState<"home" | "paybox" | "bit">("home");
  const [copied, setCopied] = useState(false);

  const showBit = mode === "both" || mode === "bit";
  const showPaybox = mode === "both" || mode === "paybox";

  async function onCopyBit() {
    const ok = await copyText(DEMO_BIT);
    if (!ok) return;
    setCopied(true);
    setPanel("bit");
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
      <div>
        <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">הדגמה אינטראקטיבית</p>
        <h3 className="mt-2 text-2xl font-black text-[#2C241C] md:text-3xl">
          כך האורחים שלכם רואים את אפשרויות המתנה
        </h3>
        <p className="mt-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
          בחרו אילו אמצעים להציג. ההדגמה משתמשת בנתונים פיקטיביים בלבד — בלי תשלום אמיתי ובלי חיבור
          לחשבון שלכם.
        </p>
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="בחירת אמצעים בהדגמה">
          {(
            [
              { id: "both" as const, label: "bit ו־PayBox" },
              { id: "bit" as const, label: "רק bit" },
              { id: "paybox" as const, label: "רק PayBox" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setMode(opt.id);
                setPanel("home");
              }}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                mode === opt.id
                  ? "border-[#3A2B22] bg-[#3A2B22] text-white"
                  : "border-[#DCC7A6] bg-white text-[#5E4735] hover:bg-[#FFF8EA]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <ul className="mt-6 space-y-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
          <li>• PayBox — פותח קישור חיצוני (בהדגמה: מסך הסבר בלבד).</li>
          <li>• bit — מעתיק מספר דוגמה ללוח.</li>
          <li>• אין הודעת «התשלום התקבל» ואין סליקה של Invistimo.</li>
        </ul>
      </div>

      <div className="mx-auto w-full max-w-[300px]">
        <div className="overflow-hidden rounded-[2rem] border-[10px] border-[#1C1612] bg-[#1C1612] shadow-[0_28px_60px_rgba(40,28,16,0.28)]">
          <div className="relative min-h-[480px] bg-[#FFFDF8] px-4 pb-5 pt-3 text-[#3A2A1F]">
            <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-[#D9CBB5]" aria-hidden />

            {panel === "home" ? (
              <div>
                <p className="text-center text-lg font-black text-[#2C241C]">החתונה של נועה ויואב</p>
                <p className="mt-1 text-center text-xs font-semibold text-[#9B8D7D]">
                  תצוגת דמו · נתונים לדוגמה
                </p>
                <div className="mt-5 rounded-2xl border border-[#EADDC8] bg-white px-3 py-3 text-sm leading-6 text-[#5C4A3A]">
                  <p className="font-bold text-[#2C241C]">פרטי האירוע</p>
                  <p className="mt-1">יום חמישי · 19:30 · אולם הדגמה</p>
                </div>
                <p className="mt-5 text-center text-sm font-black text-[#2C241C]">
                  רוצים לשמח גם במתנה?
                </p>
                <div className="mt-3 space-y-2.5">
                  {showPaybox ? (
                    <button
                      type="button"
                      onClick={() => setPanel("paybox")}
                      className="w-full rounded-2xl border border-[#E6D2AA] bg-white px-4 py-3 text-sm font-black text-[#5A4634] transition hover:bg-[#FFF8EA]"
                    >
                      מתנה ב־PayBox
                    </button>
                  ) : null}
                  {showBit ? (
                    <button
                      type="button"
                      onClick={() => void onCopyBit()}
                      className="w-full rounded-2xl border border-[#E6D2AA] bg-white px-4 py-3 text-sm font-black text-[#5A4634] transition hover:bg-[#FFF8EA]"
                    >
                      מתנה ב־Bit
                    </button>
                  ) : null}
                  {!showBit && !showPaybox ? (
                    <p className="rounded-2xl border border-dashed border-[#E6D2AA] px-3 py-4 text-center text-sm text-[#7A6042]">
                      אין אמצעי מתנה פעיל בהדגמה זו
                    </p>
                  ) : null}
                </div>
                <p className="mt-5 text-center text-xs leading-5 text-[#9B8D7D]">
                  אישור ההגעה נשאר זמין בנפרד — המתנה אינה תנאי להשתתפות.
                </p>
              </div>
            ) : null}

            {panel === "paybox" ? (
              <div>
                <button
                  type="button"
                  onClick={() => setPanel("home")}
                  className="text-sm font-bold text-[#8A642E]"
                >
                  ← חזרה להזמנה
                </button>
                <p className="mt-4 text-lg font-black text-[#2C241C]">מעבר ל־PayBox</p>
                <p className="mt-3 text-sm leading-7 text-[#5C4A3A]">
                  באפליקציה האמיתית האורח ייפתח בחלון חיצוני לקישור שהגדרתם. כאן מוצג הסבר בלבד —
                  בלי תשלום.
                </p>
                <p className="mt-4 break-all rounded-2xl border border-[#EADDC8] bg-[#FBF6EE] px-3 py-3 text-left text-xs font-semibold text-[#5C4A3A]" dir="ltr">
                  {DEMO_PAYBOX}
                </p>
                <p className="mt-4 text-xs leading-6 text-[#7A6042]">
                  לחיצה על הקישור אינה מאשרת שההעברה הושלמה.
                </p>
              </div>
            ) : null}

            {panel === "bit" ? (
              <div>
                <button
                  type="button"
                  onClick={() => setPanel("home")}
                  className="text-sm font-bold text-[#8A642E]"
                >
                  ← חזרה להזמנה
                </button>
                <p className="mt-4 text-lg font-black text-[#2C241C]">מספר bit להעתקה</p>
                <p className="mt-3 text-sm leading-7 text-[#5C4A3A]">
                  המספר הועתק ללוח (דמו). האורח מדביק אותו באפליקציית bit ומשלים את ההעברה שם.
                </p>
                <p
                  className="mt-4 rounded-2xl border border-[#EADDC8] bg-[#FBF6EE] px-3 py-3 text-center text-lg font-black tracking-wide text-[#2C241C]"
                  dir="ltr"
                >
                  {DEMO_BIT}
                </p>
                {copied ? (
                  <p className="mt-3 text-center text-sm font-bold text-[#2F5A38]" role="status">
                    המספר הועתק ✓
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-center text-xs font-semibold text-[#7A6042]">
          הדגמה ויזואלית · לא מחוברת לאירוע אמיתי
        </p>
      </div>
    </div>
  );
}
