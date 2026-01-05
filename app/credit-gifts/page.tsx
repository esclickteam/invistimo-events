"use client";

export default function CreditGiftsPage() {
  return (
    <main
      dir="rtl"
      className="bg-[#faf9f7] text-[#1a1a1a] leading-relaxed"
    >
      {/* ================= HERO ================= */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold mb-6">
          מתנות באשראי – פשוט, נוח ומכובד
        </h1>

        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          האורחים משלמים בכרטיס אשראי
          <br />
          אתם מקבלים את המתנות ישירות למערכת
          <br />
          הכול מרוכז, מסודר ובטוח
        </p>

        <div className="flex flex-col items-center gap-4">
          <a
            href="https://ktzr.io/giftInvistimoSignup"
            target="_blank"
            rel="noopener noreferrer"
            className="px-10 py-4 bg-[#c9ab4d] text-white text-2xl font-bold hover:opacity-90 transition"
          >
            הרשמה בחינם
          </a>

          <p className="text-[#2c5f9e] text-lg">
            *לא נדרש כרטיס אשראי להרשמה ולשירות
          </p>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          {[
            {
              title: "האורח מקבל קישור",
              text: "הקישור מופיע בהזמנה הדיגיטלית או בהודעת WhatsApp / SMS",
            },
            {
              title: "בחירת סכום ותשלום",
              text: "סכומים מוכנים או סכום חופשי – תשלום מאובטח באשראי",
            },
            {
              title: "מעקב בדשבורד",
              text: "מי שילם, כמה ומתי – הכול במקום אחד",
            },
          ].map((step, i) => (
            <div
              key={i}
              className="p-8 rounded-2xl border bg-[#faf9f7]"
            >
              <div className="text-3xl font-bold mb-4">{i + 1}</div>
              <h3 className="text-xl font-semibold mb-2">
                {step.title}
              </h3>
              <p className="text-gray-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FEATURES (UPDATED) ================= */}
      <section className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-6">
          {[
            {
              title: "חלוקה לתשלומים",
              text: "ניתן לפרוס עד 6 תשלומים את המתנה ואתם מקבלים את מלוא הסכום",
            },
            {
              title: "שיטת תשלום",
              text: "אפשרות לתשלום בכרטיס אשראי, Apple Pay או Google Pay",
            },
            {
              title: "עמוד מתנה",
              text: "עמוד ייעודי להענקת מתנה באשראי עם אפשרות להוספת ברכה",
            },
            {
              title: "העברת הכספים",
              text: "העברת כספי המתנות מתבצעת עד 3 ימי עסקים לאחר האירוע",
            },
            {
              title: "סיכום המתנות",
              text: "סיכום מלא וברור של כל המתנות עם אפשרות ייצוא לקובץ אקסל",
            },
            {
              title: "תזמון אוטומטי",
              text: "שליחת הודעות SMS אוטומטיות לכל האורחים ביום האירוע",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-6
                         bg-[#faf9f7] border border-[#e8e6e1]
                         rounded-xl px-6 py-5"
            >
              <div>
                <h3 className="text-lg font-bold mb-1">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-base">
                  {item.text}
                </p>
              </div>

              <span className="text-[#9c8a5f] text-xl font-bold">✓</span>
            </div>
          ))}
        </div>
      </section>

     

      {/* ================= CTA ================= */}
      <section className="py-28 text-center">
        <h2 className="text-4xl font-bold mb-10">
          מוכנים לקבל מתנות בלי כאב ראש?
        </h2>

        <div className="flex flex-col items-center gap-4">
          <a
            href="https://ktzr.io/giftInvistimoSignup"
            target="_blank"
            rel="noopener noreferrer"
            className="px-12 py-5 bg-[#c9ab4d] text-white text-2xl font-bold hover:opacity-90 transition"
          >
            הרשמה בחינם
          </a>

          <p className="text-[#2c5f9e] text-lg">
            *לא נדרש כרטיס אשראי להרשמה ולשירות
          </p>
        </div>
      </section>
    </main>
  );
}
