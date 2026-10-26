"use client";

import { useEffect, useMemo, useState } from "react";
import { DEMO_GIFTS } from "../content";

type Method = "menu" | "credit" | "paybox" | "bit";

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through
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

function MethodButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-sm font-black transition ${
        selected
          ? "border-[#C9A45C] bg-[#FBF6EE] text-[#2C241C] shadow-[0_0_0_2px_rgba(201,164,92,0.35)]"
          : "border-[#E6D2AA] bg-white text-[#5A4634] hover:bg-[#FFFDF8]"
      }`}
    >
      {label}
    </button>
  );
}

export default function GiftOptionsDemo() {
  const [view, setView] = useState<Method>("menu");
  const [copied, setCopied] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const payboxUrl = DEMO_GIFTS.payboxUrl;
  const bitPhone = DEMO_GIFTS.bitPhone;

  useEffect(() => {
    let cancelled = false;
    async function buildQr() {
      try {
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(payboxUrl, {
          margin: 1,
          width: 180,
          color: { dark: "#2C241C", light: "#FFFDF8" },
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setQrDataUrl("");
      }
    }
    void buildQr();
    return () => {
      cancelled = true;
    };
  }, [payboxUrl]);

  const toast = useMemo(() => {
    if (!copied) return null;
    if (copied === "bit") return "מספר ה־bit הועתק (דמו)";
    if (copied === "paybox") return "קישור PayBox הועתק (דמו)";
    return "הועתק";
  }, [copied]);

  async function handleCopy(kind: "bit" | "paybox", value: string) {
    const ok = await copyText(value);
    if (!ok) return;
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 2200);
  }

  return (
    <div className="mx-auto w-[min(100%,300px)]" dir="rtl">
      <div className="overflow-hidden rounded-[2rem] border-[10px] border-[#1C1612] bg-[#1C1612] shadow-[0_28px_60px_rgba(40,28,16,0.28)]">
        <div className="relative min-h-[520px] bg-[#FFFDF8] px-4 pb-5 pt-3 text-[#3A2A1F]">
          <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-[#D9CBB5]" aria-hidden />

          {view === "menu" ? (
            <div className="flex h-full flex-col">
              <p className="text-center text-lg font-black leading-7 text-[#2C241C]">
                רוצים לשמח אותנו במתנה?
              </p>
              <p className="mt-2 text-center text-sm leading-6 text-[#6B5B4A]">
                בחרו את הדרך שנוחה לכם. תודה שאתם חלק מהשמחה שלנו.
              </p>
              <p className="mt-3 text-center text-[11px] font-semibold text-[#9B8D7D]">
                תצוגת דמו · נתונים לדוגמה בלבד
              </p>

              <div className="mt-5 space-y-3">
                <MethodButton label="כרטיס אשראי" onClick={() => setView("credit")} />
                <MethodButton label="PayBox" onClick={() => setView("paybox")} />
                <MethodButton label="bit" onClick={() => setView("bit")} />
              </div>

              <p className="mt-5 text-center text-xs leading-5 text-[#8A7A68]">
                מוצגות רק אפשרויות שהוגדרו: אשראי, PayBox או מספר bit להעתקה.
              </p>

              <a
                href="#rsvp-integration"
                className="mt-auto pt-6 text-center text-sm font-bold text-[#8A642E] underline-offset-2 hover:underline"
              >
                חזרה לאישור הגעה
              </a>
            </div>
          ) : null}

          {view === "credit" ? (
            <div>
              <button
                type="button"
                onClick={() => setView("menu")}
                className="mb-3 text-sm font-bold text-[#8A642E]"
              >
                ← חזרה
              </button>
              <h3 className="text-base font-black">מתנה בכרטיס אשראי</h3>
              <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">
                בדמו זה הכפתור מדמה מעבר לעמוד הספק החיצוני. בתשלום אמיתי האורח
                משלם אצל RSVP — לא בתוך Invistimo.
              </p>
              <a
                href={DEMO_GIFTS.creditUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex w-full items-center justify-center rounded-2xl bg-[#2C241C] px-4 py-3 text-sm font-black text-white"
              >
                המשך לתשלום (דמו)
              </a>
              <p className="mt-3 text-xs leading-5 text-[#8A7A68]">
                לא מוצגת הודעת «התשלום התקבל» אחרי לחיצה על קישור חיצוני.
              </p>
            </div>
          ) : null}

          {view === "paybox" ? (
            <div>
              <button
                type="button"
                onClick={() => setView("menu")}
                className="mb-3 text-sm font-bold text-[#8A642E]"
              >
                ← חזרה
              </button>
              <h3 className="text-base font-black">מתנה ב־PayBox</h3>
              <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">
                נפתח קישור PayBox חיצוני שבעלי האירוע הזינו. Invistimo רק מציגה
                את הקישור.
              </p>
              <div className="mt-4 space-y-3">
                <a
                  href={payboxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-2xl bg-[#2C241C] px-4 py-3 text-sm font-black text-white"
                >
                  פתיחת PayBox (דמו)
                </a>
                <button
                  type="button"
                  onClick={() => void handleCopy("paybox", payboxUrl)}
                  className="w-full rounded-2xl border border-[#E6D2AA] bg-white px-4 py-3 text-sm font-black text-[#5A4634]"
                >
                  העתקת קישור
                </button>
              </div>
              {qrDataUrl ? (
                <div className="mt-4 flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="קוד QR לדמו של קישור PayBox"
                    className="h-[140px] w-[140px] rounded-xl border border-[#E6D2AA] bg-white p-2"
                  />
                  <p className="mt-2 text-center text-[11px] text-[#8A7A68]">
                    QR של קישור הדמו בלבד
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {view === "bit" ? (
            <div>
              <button
                type="button"
                onClick={() => setView("menu")}
                className="mb-3 text-sm font-bold text-[#8A642E]"
              >
                ← חזרה
              </button>
              <h3 className="text-base font-black">מתנה ב־bit</h3>
              <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">
                מעתיקים את מספר הטלפון ומבצעים העברה באפליקציית bit. אין פתיחה
                אוטומטית של מסך העברה.
              </p>
              <div className="mt-4 rounded-2xl border border-[#E6D2AA] bg-[#FBF6EE] px-4 py-3 text-center">
                <p className="text-xs font-semibold text-[#8A7A68]">מספר דמו</p>
                <p className="mt-1 font-mono text-lg font-black tracking-wide" dir="ltr">
                  {bitPhone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCopy("bit", bitPhone)}
                className="mt-4 w-full rounded-2xl bg-[#2C241C] px-4 py-3 text-sm font-black text-white"
              >
                העתקת מספר bit
              </button>
              <p className="mt-3 text-xs leading-5 text-[#8A7A68]">
                לא נוצר קישור bit אוטומטי ממספר הטלפון.
              </p>
            </div>
          ) : null}

          {toast ? (
            <p
              role="status"
              className="absolute inset-x-4 bottom-4 rounded-xl bg-[#2C241C] px-3 py-2 text-center text-xs font-bold text-[#F7EDDF]"
            >
              {toast}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
