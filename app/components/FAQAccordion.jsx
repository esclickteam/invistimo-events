"use client";

import { useState } from "react";

const FAQS = [
  {
    question: "מהי Invistimo?",
    answer: (
      <>
        <p>
          <strong>Invistimo</strong> היא פלטפורמת תוכנה מתקדמת (SaaS) לניהול,
          תכנון והפקת אירועים, המאפשרת יצירה וניהול של הזמנות דיגיטליות,
          אישורי הגעה (RSVP), ניהול אורחים, סידורי הושבה, שליחת הודעות
          ותזכורות – בצורה חכמה, נוחה ומקצועית.
        </p>
      </>
    ),
  },
  {
    question: "למי המערכת מתאימה?",
    answer: (
      <p>
        המערכת מתאימה לכל סוגי האירועים – חתונות, בר/בת מצווה, אירועים
        עסקיים, כנסים, השקות, אירועים פרטיים ואירועים מרובי מוזמנים.
      </p>
    ),
  },
  {
    question: "האם ניתן להשתמש במערכת ללא תשלום?",
    answer: (
      <p>
        Invistimo בנויה כמערכת מקצועית ומתקדמת, ולכן השימוש בשירותיה
        מותנה ברכישת חבילה מתאימה. כל חבילה כוללת גישה מלאה לפיצ’רים
        הרלוונטיים לאירוע.
      </p>
    ),
  },
  {
    question: "האם ניתן לנהל יותר מאירוע אחד?",
    answer: (
      <p>
        כל חבילה או מנוי מיועדים לאירוע אחד בלבד. ניתן לרכוש חבילות נוספות
        עבור אירועים נוספים, בהתאם לצורך.
      </p>
    ),
  },
  {
    question: "האם ניתן לשלוח הזמנות ותזכורות אוטומטיות?",
    answer: (
      <p>
        כן. המערכת מאפשרת שליחת הזמנות, תזכורות ועדכונים באמצעות ערוצים
        דיגיטליים שונים, בהתאם לחבילה שנרכשה ולהגדרות האירוע.
      </p>
    ),
  },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {FAQS.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={index}
            className="rounded-2xl border border-[#eadfce] bg-white shadow-sm transition"
          >
            {/* כותרת */}
            <button
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between gap-4 px-6 py-5 text-right"
            >
              <span className="font-semibold text-lg text-[#5c4632]">
                {item.question}
              </span>

              {/* חץ */}
              <span
                className={`transform transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {/* תוכן */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="px-6 pb-6 text-[#6a5440] leading-relaxed">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
