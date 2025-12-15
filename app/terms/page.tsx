export const metadata = {
  title: "תקנון שימוש | Invistimo",
};

export default function TermsPage() {
  return (
    <main dir="rtl" className="bg-[#f7f3ee] min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-6">
        {/* ===== Card ===== */}
        <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl border border-[#eadfce] px-8 md:px-14 py-14 text-[#5c4632]">

          {/* ===== Header ===== */}
          <header className="text-center mb-14">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              תקנון שימוש
            </h1>
            <p className="mt-3 text-lg text-[#7b6754] font-medium">
              Invistimo
            </p>
            <p className="mt-2 text-sm text-[#9b8772]">
              עודכן לאחרונה: 15.12.2025
            </p>
          </header>

          {/* ===== Content ===== */}
          <div className="space-y-14 text-[17px] leading-relaxed">

            {/* סעיף */}
            <section className="relative pr-6">
              <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
              <h2 className="text-2xl font-bold mb-4">1. כללי</h2>
              <p>
                אתר <strong>Invistimo</strong> (להלן: "האתר") הינו פלטפורמת
                SaaS טכנולוגית לניהול אירועים, הזמנות דיגיטליות, אישורי הגעה
                (RSVP), ניהול אורחים, הושבה, שליחת הודעות ושירותים משלימים.
              </p>
              <p className="mt-3">
                בעלת ומפעילת האתר: <strong>Invistimo</strong>, עוסק מורשה
                מספר <strong>316576578</strong>.
              </p>
              <p className="mt-3">
                השימוש באתר מהווה הסכמה מלאה, סופית ובלתי חוזרת לתקנון זה.
              </p>
            </section>

            <section className="relative pr-6">
              <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
              <h2 className="text-2xl font-bold mb-4">
                תנאי שימוש כלליים באתר
              </h2>
              <p>
                השימוש באתר מותר אך ורק למשתמשים המקבלים על עצמם את תנאי
                התקנון במלואם. השימוש באתר הינו באחריות המשתמש בלבד.
              </p>
            </section>

            <section className="relative pr-6">
              <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
              <h2 className="text-2xl font-bold mb-4">
                הגבלת גישה והפסקת שימוש
              </h2>
              <p>
                מפעילת האתר רשאית לחסום, להגביל או להפסיק גישה לשירותים
                בכל עת, ללא הודעה מוקדמת וללא פיצוי.
              </p>
            </section>

            <section className="relative pr-6">
              <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
              <h2 className="text-2xl font-bold mb-4">
                תשלומים, ביטולים והעדר החזר כספי
              </h2>
              <p>
                כל תשלום באתר הינו סופי, מוחלט ובלתי חוזר. השירותים
                נפתחים לשימוש מיידי עם הרכישה.
              </p>
              <p className="mt-3">
                כל מנוי הינו חד־פעמי לאירוע אחד בלבד ויופסק אוטומטית
                כ־14 יום לאחר מועד האירוע.
              </p>
            </section>

            <section className="relative pr-6">
              <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
              <h2 className="text-2xl font-bold mb-4">
                ויתור על אחריות ושחרור מתביעות
              </h2>
              <p>
                האתר מבוסס על תשתיות טכנולוגיות ושירותי צד ג’. ייתכנו
                תקלות, שיבושים ואירועי סייבר.
              </p>
              <p className="mt-3">
                המשתמש מוותר מראש על כל טענה, תלונה או תביעה כלפי
                מפעילת האתר ו/או מי מטעמה.
              </p>
            </section>

            <section className="relative pr-6">
              <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
              <h2 className="text-2xl font-bold mb-4">קניין רוחני</h2>
              <p>
                כל זכויות הקניין הרוחני באתר שייכות באופן בלעדי למפעילת
                האתר. אין להעתיק, לשכפל או להפיץ תכנים ללא אישור בכתב.
              </p>
            </section>

            <section className="relative pr-6">
              <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
              <h2 className="text-2xl font-bold mb-4">שינוי התקנון</h2>
              <p>
                מפעילת האתר רשאית לעדכן תקנון זה בכל עת. המשך השימוש
                באתר מהווה הסכמה לתקנון המעודכן.
              </p>
            </section>

            <section className="relative pr-6">
              <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
              <h2 className="text-2xl font-bold mb-4">
                דין חל וסמכות שיפוט
              </h2>
              <p>
                על התקנון יחולו דיני מדינת ישראל בלבד. סמכות השיפוט
                הבלעדית נתונה לבתי המשפט במחוז תל אביב–יפו.
              </p>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
