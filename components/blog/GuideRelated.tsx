"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatReadingTime } from "@/lib/blog/reading";

export type GuideRelatedCard = {
  href: string;
  title: string;
  image: string;
  imageAlt: string;
  readingMinutes: number;
  categoryId: string;
  categoryTitle: string;
  categoryHref: string;
  subcategoryId: string;
  popularRank: number;
};

function pickRelated(articles: GuideRelatedCard[], current: GuideRelatedCard) {
  const others = articles.filter((article) => article.href !== current.href);
  const sameSub = others
    .filter((article) => article.subcategoryId === current.subcategoryId)
    .sort((a, b) => a.popularRank - b.popularRank);
  const sameCategory = others
    .filter(
      (article) =>
        article.categoryId === current.categoryId && article.subcategoryId !== current.subcategoryId
    )
    .sort((a, b) => a.popularRank - b.popularRank);
  const rest = others
    .filter((article) => article.categoryId !== current.categoryId)
    .sort((a, b) => a.popularRank - b.popularRank);
  const picked: GuideRelatedCard[] = [];
  for (const article of [...sameSub, ...sameCategory, ...rest]) {
    if (picked.length >= 6) break;
    picked.push(article);
  }
  return picked.slice(0, picked.length >= 3 ? Math.min(6, picked.length) : picked.length);
}

export default function GuideRelated({ articles }: { articles: GuideRelatedCard[] }) {
  const path = usePathname();
  const current = articles.find((article) => article.href === path);
  if (!current) return null;
  const related = pickRelated(articles, current);
  if (related.length < 3) return null;

  return (
    <section className="bg-[#FBF6EE] px-5 pb-16 pt-4 md:px-8" dir="rtl">
      <div className="mx-auto max-w-6xl border-t border-[#E6D2AA] pt-10">
        <h2 className="text-2xl font-black text-[#35281F]">מאמרים קשורים</h2>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((article) => (
            <li key={article.href}>
              <Link href={article.href} className="group block border border-[#E6D2AA] bg-[#FFFDF8]">
                <div className="relative aspect-[16/10] overflow-hidden bg-[#F3E6D4]">
                  <Image
                    src={article.image}
                    alt={article.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="px-4 py-4">
                  <p className="text-xs font-bold text-[#8A642E]">{article.categoryTitle}</p>
                  <p className="mt-2 text-lg font-black leading-7 text-[#35281F] group-hover:text-[#842B4C]">
                    {article.title}
                  </p>
                  <p className="mt-3 text-sm font-bold text-[#7A6042]">
                    {formatReadingTime(article.readingMinutes)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <Link href={current.categoryHref} className="text-sm font-bold text-[#8A642E] hover:text-[#42182F]">
            לכל המאמרים בקטגוריה
          </Link>
        </p>
      </div>
    </section>
  );
}
