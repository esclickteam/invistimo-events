import Link from "next/link";
import { notFound } from "next/navigation";
import { draftHref, draftsPreviewEnabled, loadDraftArticles } from "@/lib/blog/drafts";
import { formatReadingTime } from "@/lib/blog/reading";
import { NOINDEX } from "@/lib/seo/site";
import { categoryById, isBlogCategoryId } from "@/lib/blog/taxonomy";

export const dynamic = "force-dynamic";
export const metadata = {
  ...NOINDEX,
  title: { absolute: "טיוטות המגזין | תצוגה מקדימה" },
  description: "תצוגה מקדימה פנימית של מאמרי המגזין. העמודים האלה לא מפורסמים.",
};

export default function DraftMagazinePage() {
  if (!draftsPreviewEnabled()) notFound();
  const articles = loadDraftArticles();
  const waves = [1, 2] as const;

  return (
    <main dir="rtl" className="bg-[#FBF6EE] px-5 py-14 text-[#3F3025] md:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="bg-[#42182F] px-4 py-3 text-center text-sm font-bold text-[#FFF8F0]">
          תצוגה מקדימה פנימית. המאמרים לא מפורסמים, לא גלויים בפרודקשן, ולא נכללים במפת האתר.
        </p>
        <h1 className="mt-8 text-4xl font-black text-[#35281F]">טיוטות המגזין</h1>
        <p className="mt-4 leading-8 text-[#5C4A3A]">
          שלושה מאמרים מוכנים לפעימה הראשונה. תשעה נוספים ממתינים לפעימה השנייה, אחרי שהראשונה תיבדק.
        </p>
        {waves.map((wave) => (
          <section key={wave} className="mt-10">
            <h2 className="text-2xl font-black text-[#35281F]">{wave === 1 ? "פעימה ראשונה" : "פעימה שנייה"}</h2>
            <ul className="mt-4 grid gap-4">
              {articles
                .filter((article) => article.wave === wave)
                .map((article) => {
                  const category = isBlogCategoryId(article.categoryId) ? categoryById(article.categoryId) : null;
                  return (
                    <li key={article.slug} className="border border-[#E6D2AA] bg-white">
                      <Link href={draftHref(`/blog/p/${article.slug}`, articles.map((item) => item.slug))} className="grid gap-3 p-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={article.coverImage} alt={article.coverAlt} className="aspect-[16/9] w-full object-cover" />
                        <span>
                          <span className="block text-lg font-black text-[#35281F]">{article.title}</span>
                          <span className="mt-1 block text-sm font-semibold text-[#7A6042]">
                            {category?.title || article.categoryId} · {formatReadingTime(article.readingMinutes)}
                          </span>
                          <span className="mt-2 block leading-7 text-[#5C4A3A]">{article.excerpt}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
