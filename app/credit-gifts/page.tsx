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
      {/* ================= FEATURES (WITH ICON IMAGES) ================= */}
   {/* ================= FEATURES – CARD UX (LIKE IMAGE) ================= */}
<section className="bg-white py-24">
  <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">
    {[
      {
        title: "חלוקה לתשלומים",
        text: "ניתן לפרוס עד 6 תשלומים את המתנה ואתם מקבלים את מלוא הסכום",
        icon: "/icons/installments.png",
      },
      {
        title: "שיטת תשלום",
        text: "ניתן לבחור להעניק מתנה בכרטיס אשראי או Apple Pay / Google Pay",
        icon: "/icons/payment.png",
      },
      {
        title: "עמוד מתנה",
        text: "עמוד הענקת מתנה באשראי לאורחי האירוע עם כתיבת ברכה",
        icon: "/icons/gift-page.png",
      },
      {
        title: "העברת הכספים",
        text: "העברת כספי המתנות מתבצעת עד 5 ימי עסקים לאחר מועד האירוע. ניתן לבצע משיכת כספים מהירה תוך יום עסקים בעלות 100 ש\"ח",

        icon: "/icons/transfer.png",
      },
      {
        title: "סיכום המתנות",
        text: "סיכום כספי המתנות והברכות עם אפשרות הורדה לקובץ אקסל",
        icon: "/icons/summary.png",
      },
      {
        title: "תזמון אוטומטי",
        text: "שליחה אוטומטית בהודעות SMS לכל האורחים ביום האירוע",
        icon: "/icons/schedule.png",
      },
    ].map((item, i) => (
      <div
        key={i}
        className="
          bg-white
          rounded-2xl
          border border-[#ededed]
          shadow-[0_6px_20px_rgba(0,0,0,0.06)]
          px-8 py-10
          text-center
        "
      >
        {/* ICON */}
        <div className="flex justify-center mb-6">
          <img
            src={item.icon}
            alt=""
            className="w-16 h-16 object-contain"
          />
        </div>

        {/* TITLE */}
        <h3 className="text-2xl font-bold mb-3 text-[#1f1f1f]">
          {item.title}
        </h3>

        {/* TEXT */}
        <p className="text-gray-600 text-lg leading-relaxed">
          {item.text}
        </p>
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
