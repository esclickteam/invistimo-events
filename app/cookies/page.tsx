import Link from "next/link";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";

const route = findCoreRoute("/cookies")!;

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

export default function CookiePolicyPage() {
  return (
    <main dir="rtl" className="bg-[#f7f3ee] min-h-screen py-20 text-[#5c4632]">
      <div className="mx-auto max-w-4xl px-6">
        <div className="border border-[#eadfce] bg-white/90 px-8 py-14 shadow-xl md:px-14">
          <header className="mb-14 text-center">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">מדיניות עוגיות</h1>
            <p className="mt-3 text-lg font-medium text-[#7b6754]">Invistimo</p>
            <p className="mt-2 text-sm text-[#9b8772]">עודכן לאחרונה: 13.11.2026</p>
          </header>

          <div className="space-y-12 text-[17px] leading-relaxed">
            <section className="relative pr-6">
              <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
              <h2 className="mb-4 text-2xl font-bold">מהן עוגיות וטכנולוגיות דומות</h2>
              <p>
                עוגיות הן קבצי טקסט קטנים שהדפדפן שומר במכשיר. טכנולוגיות דומות כוללות
                localStorage ו־sessionStorage. הן יכולות לזכור התחברות, בחירת פרטיות, או
                לאפשר לספק חיצוני למדוד שימוש באתר.
              </p>
              <p className="mt-3">
                המסמך מתאר את מה שנמצא בקוד האתר ובבדיקת העמודים הציבוריים. אין בו קביעה
                שהאתר עומד בכל הוראת דין. הנוסח ממתין לאישור בעל העסק ולבדיקה משפטית
                לפני פרסום כנוסח מחייב.
              </p>
            </section>

            <section className="relative pr-6">
              <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
              <h2 className="mb-4 text-2xl font-bold">מה פועל באתר</h2>
              <p>בבדיקה נמצאו שלוש קבוצות. לא נמצא פיקסל פרסום, Google Ads או כלי שיווק נפרד.</p>
              <ul className="mt-3 list-disc space-y-2 pr-6">
                <li>
                  <strong>חיוניות.</strong> התחברות למערכת ושמירת בחירת העוגיות. פועלות תמיד,
                  ואי אפשר לכבות אותן בלי לפגוע בכניסה לחשבון או בזיכרון הבחירה.
                </li>
                <li>
                  <strong>מדידה וניתוח.</strong> Google Analytics 4 של Google, מזהה מדידה
                  G-FFTCP1VN4Y. נטען רק בעמודים הציבוריים של האתר השיווקי, ורק אחרי הסכמה.
                  ברירת המחדל כבויה. אותות פרסום והתאמת מודעות נשארים במצב דחייה.
                </li>
                <li>
                  <strong>פונקציונליות לא חיונית.</strong> תוסף הנגישות UserWay, מחשבון
                  HnP2BQ1axC, נטען מ־cdn.userway.org באתר השיווקי רק אחרי הסכמה. ברירת
                  המחדל כבויה.
                </li>
              </ul>
              <p className="mt-3">
                השלמת כתובת דרך Google Maps נטענת רק כשמזינים מיקום בטופס של המערכת. זה
                חלק מפעולת הטופס ולא כלי מדידה של האתר השיווקי. Google עשויה לעבד את
                הבקשה לפי המדיניות שלה. אין לכך מתג נפרד בחלונית, כי כיבוי שלו היה שובר
                את הזנת המיקום.
              </p>
              <p className="mt-3">
                קישורי RSVP אישיים, אתרי אורחים, דפי ניהול והתחברות אינם טוענים את תג
                המדידה של האתר השיווקי. חלונית העוגיות אינה נפתחת אוטומטית בקישור אישי
                של אורח. תוסף UserWay בקישור אישי של אורח ממשיך להיטען כפי שפעל לפני
                מנגנון ההסכמה, בלי חלונית שיווקית. ההכרעה אם לגדר גם אותו ממתינה לאישור
                בעל העסק ולבדיקה משפטית.
              </p>
            </section>

            <section className="relative pr-6">
              <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
              <h2 className="mb-4 text-2xl font-bold">עוגיות שזוהו</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-right text-sm">
                  <thead>
                    <tr className="border-b border-[#eadfce]">
                      <th className="px-2 py-2 font-bold">שם</th>
                      <th className="px-2 py-2 font-bold">ספק</th>
                      <th className="px-2 py-2 font-bold">מטרה</th>
                      <th className="px-2 py-2 font-bold">משך</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#eadfce]">
                      <td className="px-2 py-3">authToken</td>
                      <td className="px-2 py-3">Invistimo</td>
                      <td className="px-2 py-3">התחברות לחשבון. עוגיית HttpOnly.</td>
                      <td className="px-2 py-3">7 ימים כברירת מחדל</td>
                    </tr>
                    <tr className="border-b border-[#eadfce]">
                      <td className="px-2 py-3">invistimo_consent</td>
                      <td className="px-2 py-3">Invistimo</td>
                      <td className="px-2 py-3">
                        גרסת המדיניות, הקטגוריות שאושרו ותאריך הבחירה. בלי שם, טלפון או דוא״ל.
                        אותו מידע נשמר גם ב־localStorage תחת invistimo-consent.
                      </td>
                      <td className="px-2 py-3">180 יום</td>
                    </tr>
                    <tr className="border-b border-[#eadfce]">
                      <td className="px-2 py-3">invistimo_analytics</td>
                      <td className="px-2 py-3">Invistimo</td>
                      <td className="px-2 py-3">
                        סימון קצר לשרת: granted או denied. בלי מזהה משתמש. נועד כדי שפנייה
                        מהטופס לא תישלח ל־Google Analytics בלי הסכמה.
                      </td>
                      <td className="px-2 py-3">180 יום</td>
                    </tr>
                    <tr className="border-b border-[#eadfce]">
                      <td className="px-2 py-3">_ga</td>
                      <td className="px-2 py-3">Google</td>
                      <td className="px-2 py-3">
                        הבחנה בין דפדפנים ב־Google Analytics. נוצרת רק אחרי הסכמה למדידה.
                      </td>
                      <td className="px-2 py-3">עד שנתיים, לפי תיעוד Google ל־GA4</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-3">_ga_FFTCP1VN4Y</td>
                      <td className="px-2 py-3">Google</td>
                      <td className="px-2 py-3">
                        מצב סשן של נכס המדידה G-FFTCP1VN4Y. נוצרת רק אחרי הסכמה למדידה.
                      </td>
                      <td className="px-2 py-3">עד שנתיים, לפי תיעוד Google ל־GA4</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-[#7b6754]">
                אם הדפדפן שומר גם עוגיות _gid או _gat של Google, מנגנון הביטול מוחק אותן
                יחד עם עוגיות _ga. עוגיות התחברות אינן נמחקות כשמבטלים מדידה.
              </p>
            </section>

            <section className="relative pr-6">
              <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
              <h2 className="mb-4 text-2xl font-bold">Google Analytics</h2>
              <p>
                לפני בחירה לא נטען הקובץ מ־googletagmanager.com ולא נשלחת פגיעת מדידה אל
                Google. מצב ההסכמה ההתחלתי הוא דחייה למדידה ולפרסום. אישור מדידה משנה רק
                את analytics_storage למצב granted. דחייה, או ביטול אחר כך, מחזירה את
                המדידה למצב denied ומוחקת את עוגיות המדידה שבשליטת האתר.
              </p>
              <p className="mt-3">
                האירועים הציבוריים אינם כוללים שם, טלפון, דוא״ל או תוכן הודעה. מעבר בין
                עמודים באתר השיווקי לא טוען את התג מחדש.
              </p>
            </section>

            <section className="relative pr-6">
              <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
              <h2 className="mb-4 text-2xl font-bold">איך בוחרים ומשנים</h2>
              <p>
                בכניסה ראשונה לאתר השיווקי מופיעה חלונית עם שלוש פעולות: אישור הכול,
                דחייה, והגדרות. דחייה סוגרת עוגיות לא חיוניות, והגדרות פותחות בחירה
                לפי קטגוריה. הבחירה נשמרת במכשיר ומוצגת שוב
                בביקורים הבאים. אם גרסת המדיניות משתנה, הבחירה הישנה אינה מופעלת והחלונית
                מופיעה מחדש.
              </p>
              <p className="mt-3">
                אפשר לפתוח את הבחירה שוב בכל עת דרך „הגדרות עוגיות” בתחתית האתר.
              </p>
            </section>

            <section className="relative pr-6">
              <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
              <h2 className="mb-4 text-2xl font-bold">ספקים ויצירת קשר</h2>
              <p>
                Google Ireland או Google LLC מפעילים את Google Analytics ואת Google Maps,
                לפי חשבון המדידה. UserWay Inc. מפעילה את תוסף הנגישות. מידע שנשלח אליהם
                כפוף גם למדיניות שלהם, ורק אחרי שהקטגוריה אושרה או שהטופס שמשתמש במפות
                הופעל.
              </p>
              <p className="mt-3">
                המדיניות המשלימה היא{" "}
                <Link href="/privacy" className="font-bold underline underline-offset-4">
                  מדיניות הפרטיות
                </Link>
                . מפעילת האתר היא Invistimo, עוסק 316576578. לפניות:{" "}
                <a href="mailto:support@invistimo.com" className="font-bold underline underline-offset-4">
                  support@invistimo.com
                </a>{" "}
                או{" "}
                <a
                  href="https://wa.me/972555039072"
                  className="font-bold underline underline-offset-4"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
