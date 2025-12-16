"use client";

const PRICING_URL = "https://www.invistimo.com/pricing";

export default function HomePage() {
  return (
    <main className="bg-[#f7f3ee] text-[#5c4632]">

      {/* ================= HERO ================= */}
      <section className="min-h-[90vh] flex items-center justify-center px-6">
        <div className="max-w-4xl text-center space-y-10">
          <h1 className="text-5xl md:text-7xl font-semibold leading-tight">
            ניהול אירוע
            <br />
            בלי לרדוף אחרי אף אחד
          </h1>

          <p className="text-xl md:text-2xl text-[#7b6754] leading-relaxed">
            הזמנות דיגיטליות ואישורי הגעה —
            <br />
            כמו שהעולם עובד היום
          </p>

          <a
            href={PRICING_URL}
            className="inline-block mt-4 px-14 py-4 rounded-full text-lg font-medium bg-[#5c4632] text-white hover:opacity-90 transition"
          >
            לצפייה בחבילות
          </a>
        </div>
      </section>

      {/* ================= APPROACH ================= */}
      <section className="py-40 px-6 bg-[#efe7dd]">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <p className="text-3xl md:text-4xl font-medium leading-snug">
            אנחנו לא עושים סבבי טלפונים.
          </p>

          <p className="text-xl md:text-2xl text-[#7b6754] leading-relaxed">
            מי שרוצה להגיע — מאשר.
            <br />
            מי שלא — לא צריך שיציקו לו.
          </p>

          <p className="text-lg text-[#7b6754] leading-relaxed">
            אתם חוסכים כסף.
            <br />
            האורחים מרגישים בנוח.
            <br />
            והכול מתעדכן אוטומטית.
          </p>
        </div>
      </section>

      {/* ================= VISUAL ================= */}
      <section className="py-40 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-10">
          {/* Placeholder ויזואלי */}
          <div className="w-full h-[420px] bg-[#e8dfd4] rounded-2xl" />

          <p className="text-2xl text-[#7b6754]">
            כל האירוע במקום אחד.
            <br />
            ברור. מסודר. רגוע.
          </p>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-32 px-6 bg-[#efe7dd]">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-medium">
            מוכנים לאירוע רגוע באמת?
          </h2>

          <a
            href={PRICING_URL}
            className="inline-block px-16 py-5 rounded-full text-lg font-semibold bg-[#5c4632] text-white hover:opacity-90 transition"
          >
            לצפייה בחבילות
          </a>

          <p className="text-sm text-[#7b6754]">
            תשלום חד־פעמי · בלי מנויים · בלי אותיות קטנות
          </p>
        </div>
      </section>

    </main>
  );
}
