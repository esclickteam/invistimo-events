import Link from "next/link";
import { Logo } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getPlans() {
  try {
    return await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    return [];
  }
}

export default async function MarketingPage() {
  const plans = await getPlans();

  return (
    <main>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm text-[var(--muted)]">
          <a href="#features">יכולות</a>
          <a href="#plans">חבילות</a>
          <a href="#invistimo">Invistimo</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-sm">
            כניסה
          </Link>
          <Link href="/register" className="btn-primary text-sm">
            התחלת אלבום
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-10 md:pt-16">
        <div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <p className="mb-4 text-sm tracking-[0.2em] text-[var(--gold-deep)] uppercase">
              Digital Event Albums
            </p>
            <h1 className="font-display text-5xl leading-[1.05] md:text-7xl text-[var(--ink)]">
              האלבום הדיגיטלי
              <br />
              של האירוע שלכם
            </h1>
            <p className="mt-6 max-w-xl text-lg text-[var(--muted)] leading-relaxed">
              חוויית צילום יוקרתית לאורחים ולבעלי השמחה — העלאות חכמות, Stories,
              ספר ברכות, מסך LIVE, וזיהוי פנים AI כשהוא מופעל ומאושר.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-gold">
                יצירת אלבום לאירוע
              </Link>
              <Link href="/a/mia-alon-wedding" className="btn-ghost">
                צפייה בדוגמה
              </Link>
            </div>
          </div>
          <div className="animate-soft-scale stagger-2 relative min-h-[420px] overflow-hidden rounded-[28px] border border-[var(--line)] shadow-[var(--shadow)]">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(160deg, rgba(28,25,23,0.35), rgba(28,25,23,0.15)), url('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80') center/cover",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 p-8 text-white">
              <p className="font-display text-4xl">מיה ואלון</p>
              <p className="opacity-90">החתונה שלנו · 24.10.2026</p>
            </div>
          </div>
        </div>
      </section>

      <div className="gold-rule mx-auto max-w-4xl" />

      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="font-display text-4xl md:text-5xl mb-4">מוצר שלם, לא דמו</h2>
        <p className="text-[var(--muted)] max-w-2xl mb-12">
          ארבעה אזורים מחוברים למנוע אחד: אתר שיווקי, פורטל לקוח, אלבום אורחים
          ומערכת מנהל־על — עם API מוכן לחיבור Invistimo.
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              t: "העלאות חכמות",
              d: "Multipart/resumable מהטלפון, תמונות ממוזערות, תמלול וידאו לתצוגה, ומניעת כפילויות.",
            },
            {
              t: "Stories וספר ברכות",
              d: "פרקי אירוע אלגנטיים וספר זיכרונות עם ברכות טקסט, קול, וידאו ותמונה.",
            },
            {
              t: "LIVE + AI",
              d: "מסך אולם בזמן אמת, ותשתית זיהוי פנים מוכנה — בלי להציג AI מדומה כפעיל.",
            },
          ].map((f) => (
            <div key={f.t} className="surface p-6">
              <h3 className="font-display text-2xl mb-2">{f.t}</h3>
              <p className="text-[var(--muted)] leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="plans" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-display text-4xl md:text-5xl mb-10">חבילות</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`surface p-6 ${p.code === "premium" ? "ring-1 ring-[var(--gold)]" : ""}`}
            >
              <p className="text-sm text-[var(--gold-deep)] tracking-wide">{p.code}</p>
              <h3 className="font-display text-3xl mt-1">{p.nameHe}</h3>
              <p className="mt-3 text-[var(--muted)] min-h-16">{p.descriptionHe}</p>
              <p className="mt-6 font-display text-3xl">
                ₪{(p.priceOnceAgorot / 100).toLocaleString("he-IL")}
                <span className="text-base text-[var(--muted)]"> / אירוע</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                <li>אחסון עד {(Number(p.maxStorageBytes) / 1024 ** 3).toFixed(0)} GB</li>
                <li>שמירה {p.retentionDays} ימים</li>
                <li>{p.allowFaceAi ? "כולל תשתית AI פנים" : "ללא AI פנים"}</li>
              </ul>
              <Link href="/register" className="btn-primary mt-6 w-full">
                בחירה
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-[var(--muted)]">
          סליקה חיה אינה מופעלת. מחירים ומכסות ניתנים לניהול במערכת המנהל.
        </p>
      </section>

      <section id="invistimo" className="mx-auto max-w-6xl px-5 py-16 pb-24">
        <div className="surface p-8 md:p-12">
          <h2 className="font-display text-4xl mb-3">מנוע אחד — גם עצמאי וגם ב־Invistimo</h2>
          <p className="text-[var(--muted)] max-w-3xl leading-relaxed">
            ניתן למכור את האלבום כמוצר SaaS עצמאי, או להפעיל אותו כשירות
            &quot;אלבום דיגיטלי&quot; מתוך Invistimo דרך API מאובטח. מחזור החיים של
            האלבום נפרד ממחיקת אירועים ב־Invistimo.
          </p>
          <div className="mt-8">
            <Link href="/docs" className="btn-ghost">
              תיעוד ארכיטקטורה ואינטגרציה
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] px-5 py-10 text-center text-sm text-[var(--muted)]">
        <Logo className="text-xl" />
        <p className="mt-3">ALBUM · סביבת פיתוח מבודדת · לא מחוברת ל־Production של Invistimo</p>
      </footer>
    </main>
  );
}
