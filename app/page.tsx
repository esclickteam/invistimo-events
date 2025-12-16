"use client";

const PRICING_URL = "https://www.invistimo.com/pricing";

export default function HomePage() {
  return (
    <main className="bg-[#faf8f4] text-[#3f3a34]">

      {/* ================= HERO ================= */}
      <section className="min-h-screen flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-12 items-center">

          {/* Text */}
          <div className="md:col-span-7 space-y-10">
            <h1 className="text-[clamp(44px,6vw,88px)] leading-[1.05] font-light tracking-tight">
              ניהול אירוע
              <br />
              <span className="font-medium">בלי לרדוף אחרי אף אחד</span>
            </h1>

            <p className="text-xl md:text-2xl text-[#6b645c] leading-relaxed max-w-xl">
              הזמנות דיגיטליות, אישורי הגעה וניהול אורחים —  
              בצורה שקטה, אלגנטית, כמו שהעולם עובד היום.
            </p>

            <a
              href={PRICING_URL}
              className="inline-flex items-center gap-3 text-lg font-medium group"
            >
              <span className="border-b border-[#3f3a34] pb-1 group-hover:opacity-60 transition">
                לצפייה בחבילות
              </span>
              <span className="text-2xl leading-none">←</span>
            </a>
          </div>

          {/* Visual */}
          <div className="md:col-span-5">
            <div className="relative aspect-[3/4]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#e8dfd4] to-[#d8cbbd]" />
              <div className="absolute -inset-6 border border-[#e0d6cb]" />
            </div>
          </div>

        </div>
      </section>

      {/* ================= PHILOSOPHY ================= */}
      <section className="py-40 px-6">
        <div className="max-w-4xl mx-auto space-y-14">

          <p className="text-[clamp(32px,4vw,56px)] font-light leading-tight">
            אנחנו לא עושים סבבי טלפונים.
          </p>

          <p className="text-2xl md:text-3xl text-[#6b645c] leading-relaxed max-w-3xl">
            מי שרוצה להגיע — מאשר.  
            מי שלא — לא צריך שירדפו אחריו.
          </p>

          <p className="text-lg text-[#7a736b] max-w-2xl leading-relaxed">
            פחות הצקות. פחות כסף מבוזבז.  
            יותר כבוד לאורחים, ויותר שקט נפשי לכם.
          </p>

        </div>
      </section>

      {/* ================= STATEMENT ================= */}
      <section className="py-40 px-6 bg-[#f1ece5]">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[clamp(28px,3.5vw,48px)] font-light leading-snug">
            כל האירוע במקום אחד.
            <br />
            <span className="text-[#6b645c]">
              רגוע. מסודר. מדויק.
            </span>
          </p>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10 border-t border-[#e4dbd1] pt-16">

          <p className="text-2xl md:text-3xl font-light">
            מוכנים לנהל אירוע בלי רעש?
          </p>

          <a
            href={PRICING_URL}
            className="inline-flex items-center gap-3 text-lg font-medium group"
          >
            <span className="border-b border-[#3f3a34] pb-1 group-hover:opacity-60 transition">
              לצפייה בחבילות
            </span>
            <span className="text-2xl leading-none">←</span>
          </a>

        </div>
      </section>

    </main>
  );
}
