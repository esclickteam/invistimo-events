"use client";

import Link from "next/link";
import { useState } from "react";

export default function SupportBot({ onClose }) {
  const whatsappNumber = "972555039072";

  const [showLeadForm, setShowLeadForm] = useState(false);
  const [openingWhatsapp, setOpeningWhatsapp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState("");

  function cleanPhone(value) {
    return String(value || "").replace(/[^\d+]/g, "").trim();
  }

  function isValidIsraeliPhone(value) {
    const digits = cleanPhone(value).replace(/\D/g, "");

    return (
      /^05\d{8}$/.test(digits) ||
      /^9725\d{8}$/.test(digits) ||
      /^\+9725\d{8}$/.test(cleanPhone(value))
    );
  }

  function normalizePhoneForDisplay(value) {
    const digits = cleanPhone(value).replace(/\D/g, "");

    if (!digits) return "";

    if (digits.startsWith("972")) {
      return `0${digits.slice(3)}`;
    }

    return digits;
  }

  function buildWhatsappUrl() {
    const cleanDisplayPhone = normalizePhoneForDisplay(phone);

    const whatsappText = encodeURIComponent(
      [
        "היי, אשמח לקבל עזרה עם Invistimo ",
        "רוצה להבין איזו חבילה מתאימה לאירוע שלי.",
        fullName.trim() ? `שם: ${fullName.trim()}` : "",
        cleanDisplayPhone ? `טלפון: ${cleanDisplayPhone}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );

    return `https://wa.me/${whatsappNumber}?text=${whatsappText}`;
  }

  async function handleContinueToWhatsapp() {
    if (openingWhatsapp) return;

    const cleanName = String(fullName || "").trim();
    const cleanDisplayPhone = normalizePhoneForDisplay(phone);

    if (!cleanName) {
      setFormError("כדי שנוכל לחזור אליך, צריך לרשום שם מלא.");
      return;
    }

    if (!isValidIsraeliPhone(phone)) {
      setFormError("נא להזין מספר טלפון ישראלי תקין, לדוגמה 0541234567.");
      return;
    }

    const whatsappWindow = window.open("about:blank", "_blank");

    try {
      setOpeningWhatsapp(true);
      setFormError("");

      await fetch("/api/public/support-whatsapp-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          fullName: cleanName,
          phone: cleanDisplayPhone,
          source: "support_widget",
          leadSource: "website_support",
          leadProvider: "website",
          interestedService: "פנייה לנציג מהאתר",
          notes: "הלקוח מילא שם וטלפון בבוט התמיכה ולחץ מעבר לוואטסאפ עם נציג",
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      });

      const whatsappUrl = buildWhatsappUrl();

      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      } else {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      }

      if (typeof onClose === "function") {
        onClose();
      }
    } catch (error) {
      console.error("OPEN WHATSAPP SUPPORT LEAD ERROR:", error);

      const fallbackUrl = buildWhatsappUrl();

      if (whatsappWindow) {
        whatsappWindow.location.href = fallbackUrl;
      } else {
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      }

      if (typeof onClose === "function") {
        onClose();
      }
    } finally {
      setOpeningWhatsapp(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="
        fixed bottom-24 right-6 z-[9999]
        w-[calc(100vw-32px)] max-w-[390px]
      "
    >
      <div
        className="
          relative overflow-hidden
          rounded-[30px]
          border border-[#E4D0B6]
          bg-[#FFFDF9]/95
          shadow-[0_26px_80px_rgba(78,52,29,0.22)]
          backdrop-blur-xl
        "
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,#FFF4E2_0%,transparent_44%)]" />
        <div className="pointer-events-none absolute -top-20 -left-16 h-44 w-44 rounded-full bg-[#D8B16A]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 h-44 w-44 rounded-full bg-[#B8896B]/16 blur-3xl" />

        <div className="relative z-10 p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div
                className="
                  mb-3 flex h-12 w-12 items-center justify-center
                  rounded-full border border-[#D8B16A]/50
                  bg-[#FFF8EE]
                  text-xl shadow-sm
                "
              >
                💬
              </div>

              <h3 className="text-xl font-black text-[#3E2D20]">
                צריכים עזרה?
              </h3>

              <p className="mt-1 text-sm leading-6 text-[#7B6754]">
                אנחנו כאן כדי לעזור לכם עם הרשמה, חבילות, אישורי הגעה וניהול
                האירוע.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="סגירת חלון תמיכה"
              className="
                flex h-9 w-9 shrink-0 items-center justify-center
                rounded-full
                border border-[#E6D6C4]
                bg-white/80
                text-lg text-[#8B6A45]
                transition hover:bg-[#FFF3E3]
              "
            >
              ×
            </button>
          </div>

          <div
            className="
              mb-5 rounded-[22px]
              border border-[#E7D7C3]
              bg-white/70
              px-4 py-3
              text-center
              shadow-[0_10px_26px_rgba(91,64,35,0.06)]
            "
          >
            <p className="text-sm font-black text-[#5A3E25]">
              שעות פעילות נציגים
            </p>

            <p className="mt-1 text-sm text-[#7B6754]">
              ימים א׳–ה׳: 09:00–18:00
            </p>

            <p className="text-sm text-[#7B6754]">
              שישי וערבי חג: 09:00–12:00
            </p>
          </div>

          <div className="space-y-3">
            {!showLeadForm ? (
              <button
                type="button"
                onClick={() => {
                  setShowLeadForm(true);
                  setFormError("");
                }}
                className="
                  flex w-full items-center justify-center gap-2
                  rounded-[18px]
                  bg-gradient-to-l from-[#A86F2B] via-[#C68F46] to-[#D8A85F]
                  px-5 py-3.5
                  text-sm font-black text-white
                  shadow-[0_16px_32px_rgba(168,111,43,0.24)]
                  transition
                  hover:-translate-y-0.5
                  hover:shadow-[0_20px_38px_rgba(168,111,43,0.3)]
                "
              >
                <span>💬</span>
                מעבר לוואטסאפ עם נציג
              </button>
            ) : (
              <div
                className="
                  rounded-[22px]
                  border border-[#E7D7C3]
                  bg-white/80
                  p-3
                  shadow-[0_10px_24px_rgba(91,64,35,0.06)]
                "
              >
                <p className="mb-3 text-sm font-black text-[#5A3E25]">
                  השאירו פרטים ונעביר אתכם לנציג
                </p>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => {
                      setFullName(event.target.value);
                      setFormError("");
                    }}
                    placeholder="שם מלא"
                    className="
                      h-11 w-full rounded-[16px]
                      border border-[#E7D7C3]
                      bg-[#FFFDF9]
                      px-4
                      text-sm font-bold text-[#3E2D20]
                      outline-none
                      transition
                      placeholder:text-[#B79A7A]
                      focus:border-[#C68F46]
                      focus:bg-white
                    "
                  />

                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setFormError("");
                    }}
                    placeholder="טלפון"
                    inputMode="tel"
                    className="
                      h-11 w-full rounded-[16px]
                      border border-[#E7D7C3]
                      bg-[#FFFDF9]
                      px-4
                      text-sm font-bold text-[#3E2D20]
                      outline-none
                      transition
                      placeholder:text-[#B79A7A]
                      focus:border-[#C68F46]
                      focus:bg-white
                    "
                  />

                  {formError ? (
                    <p className="text-xs font-bold leading-5 text-red-600">
                      {formError}
                    </p>
                  ) : null}

                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <button
                      type="button"
                      onClick={handleContinueToWhatsapp}
                      disabled={openingWhatsapp}
                      className="
                        flex h-11 items-center justify-center gap-2
                        rounded-[16px]
                        bg-gradient-to-l from-[#A86F2B] via-[#C68F46] to-[#D8A85F]
                        px-4
                        text-sm font-black text-white
                        transition
                        hover:-translate-y-0.5
                        disabled:cursor-not-allowed
                        disabled:opacity-70
                      "
                    >
                      <span>💬</span>
                      {openingWhatsapp ? "פותח..." : "המשך לוואטסאפ"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowLeadForm(false);
                        setFormError("");
                      }}
                      className="
                        h-11 rounded-[16px]
                        border border-[#E7D7C3]
                        bg-white
                        px-4
                        text-xs font-black text-[#7A5630]
                        transition
                        hover:bg-[#FFF3E3]
                      "
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              </div>
            )}

            <Link
              href="/pricing"
              onClick={onClose}
              className="
                flex w-full items-center justify-center gap-2
                rounded-[18px]
                border border-[#D8B98D]
                bg-white/80
                px-5 py-3.5
                text-sm font-black text-[#6B4A2D]
                transition
                hover:bg-[#FFF6EA]
              "
            >
              <span>💎</span>
              צפייה בחבילות
            </Link>

            <Link
              href="/login"
              onClick={onClose}
              className="
                flex w-full items-center justify-center gap-2
                rounded-[18px]
                border border-[#E7D7C3]
                bg-[#FFF8EE]/80
                px-5 py-3.5
                text-sm font-black text-[#7A5630]
                transition
                hover:bg-[#FFF1DC]
              "
            >
              <span>🔐</span>
              התחברות למערכת
            </Link>
          </div>

          <p className="mt-4 text-center text-xs leading-5 text-[#9C866D]">
            מענה בוואטסאפ ניתן בשעות הפעילות.
          </p>
        </div>
      </div>
    </div>
  );
}