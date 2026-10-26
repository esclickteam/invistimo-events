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
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
          <Logo className="text-white drop-shadow-sm" />
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/85">
            <a href="#experience">החוויה</a>
            <a href="#features">יכולות</a>
            <a href="#plans">חבילות</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-full border border-white/35 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              כניסה
            </Link>
            <Link href="/register" className="btn-gold text-sm">
              יצירת אלבום
            </Link>
          </div>
        </div>
      </header>

      {/* Full-bleed hero — brand first, matches luxury album mood */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <div
          className="absolute inset-0 scale-105"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,16,12,0.35) 0%, rgba(20,16,12,0.55) 55%, rgba(20,16,12,0.72) 100%), url('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=85') center/cover",
          }}
        />
        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-28 md:pb-24">
          <p
            className="animate-fade-up mb-3 font-display text-sm tracking-[0.35em] uppercase"
            style={{ color: "#E8D5B5" }}
          >
            Album
          </p>
          <h1
            className="animate-fade-up stagger-1 font-display text-5xl leading-[1.05] md:text-7xl lg:text-8xl max-w-3xl"
            style={{ color: "#FFFCF7" }}
          >
            האלבום הדיגיטלי
            <br />
            של הרגעים שלכם
          </h1>
          <p
            className="animate-fade-up stagger-2 mt-5 max-w-xl text-lg leading-relaxed"
            style={{ color: "rgba(255,252,247,0.82)" }}
          >
            אלבום יוקרתי לאירוע — האורחים מעלים, אתם מנהלים, והכול נשמר במקום אחד
            יפה ומסודר.
          </p>
          <div className="animate-fade-up stagger-3 mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-gold">
              התחלת אלבום לאירוע
            </Link>
            <Link
              href="/a/mia-alon-wedding"
              className="inline-flex items-center rounded-full border border-white/40 px-5 py-3 text-white hover:bg-white/10"
            >
              צפייה באלבום לדוגמה
            </Link>
          </div>
        </div>
      </section>

      <section id="experience" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl md:text-5xl text-[var(--ink)]">
            נראה כמו אתר צילום.
            <br />
            עובד כמו מוצר שלם.
          </h2>
          <p className="mt-5 text-lg text-[var(--muted)] leading-relaxed">
            מהרגע שהאורחים סורקים את ה־QR — הם נכנסים לאלבום מעוצב, מעלים תמונות
            וסרטונים מהטלפון, משאירים ברכות, ומוצאים את עצמם בתוך הרגעים של האירוע.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "לאורחים",
              d: "העלאה מהירה מהטלפון, גלריה עשירה, ספר ברכות, ושיתוף בלחיצה.",
            },
            {
              n: "02",
              t: "לבעלי השמחה",
              d: "שליטה בהרשאות, תור אישור, רגעי האירוע, וקישור אישי עם QR להדפסה.",
            },
            {
              n: "03",
              t: "לצלמים ולמפיקים",
              d: "העלאת חומר מקצועי אחרי האירוע, ניהול מספר אירועים, וחבילות מותאמות.",
            },
          ].map((item) => (
            <div key={item.n} className="border-t border-[var(--stone)] pt-6">
              <p className="font-display text-sm text-[var(--gold-deep)] tracking-widest">
                {item.n}
              </p>
              <h3 className="font-display mt-3 text-3xl">{item.t}</h3>
              <p className="mt-3 text-[var(--muted)] leading-relaxed">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="features"
        className="relative overflow-hidden border-y border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_70%,transparent)]"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <h2 className="font-display text-4xl md:text-5xl">כל מה שהאירוע צריך</h2>
            <p className="mt-4 text-[var(--muted)] leading-relaxed">
              חוויה אחת רציפה — מהקבלת פנים ועד אחרי המסיבה.
            </p>
            <ul className="mt-10 space-y-6">
              {[
                {
                  t: "העלאת תמונות וסרטונים",
                  d: "מהגלריה או בצילום חדש, גם בכמות גדולה ובמהלך האירוע עצמו.",
                },
                {
                  t: "רגעי האירוע",
                  d: "פרקים מעוצבים: הכנות, חופה, ריקודים ועוד — סיפור ויזואלי שלם.",
                },
                {
                  t: "ספר ברכות דיגיטלי",
                  d: "ברכות כתובות, קוליות ובווידאו — בסגנון ספר זיכרונות יוקרתי.",
                },
                {
                  t: "מצא אותי בתמונות",
                  d: "האורחים מוצאים את עצמם באלבום בעזרת זיהוי פנים חכם.",
                },
                {
                  t: "מסך LIVE באולם",
                  d: "תמונות מאושרות מוצגות במצגת אלגנטית על מסך גדול.",
                },
              ].map((f) => (
                <li key={f.t} className="flex gap-4">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold)]" />
                  <div>
                    <p className="font-medium text-[var(--ink)]">{f.t}</p>
                    <p className="mt-1 text-[var(--muted)]">{f.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative min-h-[480px] overflow-hidden rounded-[28px]">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "url('https://images.unsplash.com/photo-1511285560929-80b456fea3caa?auto=format&fit=crop&w=1400&q=80') center/cover",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 text-white">
              <p className="font-display text-4xl">מיה ואלון</p>
              <p className="mt-1 text-white/85">החתונה שלנו · 24.10.2026</p>
            </div>
          </div>
        </div>
      </section>

      <section id="plans" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="max-w-2xl mb-12">
          <h2 className="font-display text-4xl md:text-5xl">בחרו את החבילה שלכם</h2>
          <p className="mt-4 text-[var(--muted)]">
            אלבום לאירוע בודד, או מסלול מקצועי לצלמים ולמפיקים.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`rounded-[24px] border bg-[var(--card)] p-7 ${
                p.code === "premium"
                  ? "border-[var(--gold)] shadow-[var(--shadow)]"
                  : "border-[var(--line)]"
              }`}
            >
              <h3 className="font-display text-3xl">{p.nameHe}</h3>
              <p className="mt-3 text-[var(--muted)] min-h-16">{p.descriptionHe}</p>
              <p className="mt-8 font-display text-4xl text-[var(--ink)]">
                ₪{(p.priceOnceAgorot / 100).toLocaleString("he-IL")}
                <span className="ms-2 text-base text-[var(--muted)]">לאירוע</span>
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-[var(--muted)]">
                <li>עד {(Number(p.maxStorageBytes) / 1024 ** 3).toFixed(0)} GB אחסון</li>
                <li>שמירת האלבום ל־{p.retentionDays} ימים</li>
                {p.allowGuestbook ? <li>ספר ברכות דיגיטלי</li> : null}
                {p.allowStories ? <li>רגעי האירוע (Stories)</li> : null}
                {p.allowFaceAi ? <li>זיהוי פנים חכם</li> : null}
                {p.allowLive ? <li>מסך LIVE באולם</li> : null}
                {p.allowTimeCapsule ? <li>קפסולת זמן</li> : null}
                {p.allowSummaryFilm ? <li>סרט סיכום AI</li> : null}
              </ul>
              <Link href="/register" className="btn-primary mt-8 w-full">
                בחירת {p.nameHe}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--ink)] px-8 py-14 text-center text-[var(--card)] md:px-16">
          <h2 className="font-display text-4xl md:text-5xl">מוכנים לשמור את הרגעים?</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            יצירת אלבום לוקחת דקות. השיתוף עם האורחים — מיידי.
          </p>
          <Link href="/register" className="btn-gold mt-8 inline-flex">
            יצירת האלבום שלי
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <Logo className="text-xl" />
          <p className="text-sm text-[var(--muted)]">
            © {new Date().getFullYear()} ALBUM · אלבומים דיגיטליים לאירועים
          </p>
          <div className="flex gap-5 text-sm text-[var(--muted)]">
            <Link href="/login">כניסה</Link>
            <Link href="/register">הרשמה</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
