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
    className="
      px-10 py-4
      rounded-none
      bg-[#c9ab4d]
      text-white
      text-2xl
      font-bold
      hover:opacity-90
      transition
      inline-block
    "
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

      {/* ================= DASHBOARD PREVIEW ================= */}
      <section className="py-24" id="demo">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            כל המתנות – בדשבורד אחד
          </h2>
          <p className="text-lg text-gray-600 mb-12">
            מעקב מלא, סכומים, סטטוסים וייצוא נתונים – בלי בלגן
          </p>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { label: 'סה"כ מתנות', value: '₪12,450' },
              { label: 'מספר משלמים', value: '37' },
              { label: 'מתנה ממוצעת', value: '₪336' },
              { label: 'תשלומים הושלמו', value: '100%' },
            ].map((card, i) => (
              <div
                key={i}
                className="p-6 bg-white rounded-2xl border text-center"
              >
                <div className="text-3xl font-bold mb-2">
                  {card.value}
                </div>
                <div className="text-gray-600">{card.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= BENEFITS ================= */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-8">
          {[
            "אין מעטפות",
            "אין ספירה ידנית",
            "אין טעויות",
            "הכול מתועד",
            "חוויה מכובדת לאורחים",
            "שליטה מלאה בדשבורד",
          ].map((item, i) => (
            <div
              key={i}
              className="p-6 rounded-xl border bg-[#faf9f7]"
            >
              ✔ {item}
            </div>
          ))}
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-10 text-center">
            שאלות נפוצות
          </h2>

          {[
            {
              q: "האורחים חייבים לשלם?",
              a: "לא. האפשרות למתנה באשראי היא רשות בלבד.",
            },
            {
              q: "אפשר לבטל את האפשרות?",
              a: "כן, בכל רגע דרך הדשבורד.",
            },
            {
              q: "הכסף נכנס אליי ישירות?",
              a: "כן, לפי הגדרות הסליקה שלך.",
            },
            {
              q: "יש עמלה?",
              a: "רק עמלת סליקה סטנדרטית – מוצגת בשקיפות.",
            },
          ].map((item, i) => (
            <div key={i} className="mb-6">
              <h3 className="text-xl font-semibold mb-2">
                {item.q}
              </h3>
              <p className="text-gray-600">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-28 text-center bg-transparent">
  <h2 className="text-4xl font-bold mb-10 text-[#2b2b2b]">
    מוכנים לקבל מתנות בלי כאב ראש?
  </h2>

  <div className="flex flex-col items-center gap-4">
    <a
      href="https://ktzr.io/giftInvistimoSignup"
      target="_blank"
      rel="noopener noreferrer"
      className="
        px-12 py-5
        bg-[#c9ab4d]
        text-white
        text-2xl
        font-bold
        tracking-wide
        hover:opacity-90
        transition
        inline-block
      "
    >
      הפעלת מתנות באשראי עכשיו
    </a>

    <p className="text-[#2c5f9e] text-lg">
      *לא נדרש כרטיס אשראי להרשמה ולשירות
    </p>
  </div>
</section>


    </main>
  );
}
