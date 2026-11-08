"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ArticleCard from "@/components/blog/ArticleCard";
import { useBlogSearchTracking } from "@/components/blog/useBlogSearchTracking";
import type { BlogArticle } from "@/lib/blog/articles";
import { BLOG_HUB_PATH, categoryPath, type BlogCategory } from "@/lib/blog/taxonomy";

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function CategoryArticles({
  category,
  articles,
}: {
  category: BlogCategory;
  articles: BlogArticle[];
}) {
  const [query, setQuery] = useState("");
  const commitSearch = useBlogSearchTracking(query, categoryPath(category.id));
  const [subcategoryId, setSubcategoryId] = useState("all");
  const [sort, setSort] = useState<"new" | "popular">("new");

  const subs = category.subcategories.filter((sub) =>
    articles.some((article) => article.subcategoryId === sub.id)
  );

  const visible = useMemo(() => {
    const needle = normalize(query);
    const rows = articles.filter((article) => {
      if (subcategoryId !== "all" && article.subcategoryId !== subcategoryId) return false;
      if (!needle) return true;
      return normalize(`${article.title} ${article.description} ${article.searchText}`).includes(needle);
    });
    rows.sort((a, b) =>
      sort === "popular"
        ? a.popularRank - b.popularRank
        : b.modified.localeCompare(a.modified)
    );
    return rows;
  }, [articles, query, sort, subcategoryId]);

  return (
    <div>
      <form
        className="mt-8 max-w-xl"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          commitSearch();
        }}
      >
        <label htmlFor="category-search" className="text-sm font-bold text-[#7A6042]">
          חיפוש בקטגוריה
        </label>
        <input
          id="category-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-2 h-12 w-full border border-[#E6D2AA] bg-white px-4 outline-none focus:border-[#8A642E]"
        />
      </form>

      {subs.length ? (
        <nav aria-label="תת־קטגוריות" className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubcategoryId("all")}
            className={`border px-3 py-2 text-sm font-bold ${subcategoryId === "all" ? "border-[#42182F] bg-[#42182F] text-[#FFF8F0]" : "border-[#E6D2AA] bg-white"}`}
          >
            הכל
          </button>
          {subs.map((sub) => (
            <a
              key={sub.id}
              href={`#sub-${sub.id}`}
              onClick={() => setSubcategoryId(sub.id)}
              className={`border px-3 py-2 text-sm font-bold ${subcategoryId === sub.id ? "border-[#42182F] bg-[#42182F] text-[#FFF8F0]" : "border-[#E6D2AA] bg-white text-[#35281F]"}`}
            >
              {sub.title}
            </a>
          ))}
        </nav>
      ) : null}

      <div className="mt-4 flex border border-[#E6D2AA] w-fit">
        <button
          type="button"
          onClick={() => setSort("new")}
          className={`px-4 py-2 text-sm font-bold ${sort === "new" ? "bg-[#42182F] text-[#FFF8F0]" : "bg-white"}`}
        >
          חדשים
        </button>
        <button
          type="button"
          onClick={() => setSort("popular")}
          className={`px-4 py-2 text-sm font-bold ${sort === "popular" ? "bg-[#42182F] text-[#FFF8F0]" : "bg-white"}`}
        >
          פופולריים
        </button>
      </div>

      {visible.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              priority={index === 0 && normalize(query).length === 0}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 border border-[#E6D2AA] bg-[#FFFDF8] px-6 py-14 text-center">
          <h2 className="text-2xl font-black text-[#35281F]">אין מאמרים תואמים</h2>
          <p className="mt-3 leading-8 text-[#5C4A3A]">נסו ניסוח אחר, או חזרו אל כל המגזין.</p>
          <Link
            href={BLOG_HUB_PATH}
            className="mt-6 inline-flex min-h-12 items-center bg-[#42182F] px-6 font-black text-[#FFF8F0]"
          >
            לכל המאמרים
          </Link>
        </div>
      )}

      <div className="mt-12 space-y-10">
        {subs.map((sub) => {
          const group = articles.filter((article) => article.subcategoryId === sub.id);
          if (!group.length) return null;
          return (
            <section key={sub.id} id={`sub-${sub.id}`} className="scroll-mt-28">
              <h2 className="text-2xl font-black text-[#35281F]">{sub.title}</h2>
              <ul className="mt-3 space-y-2">
                {group.map((article) => (
                  <li key={article.id}>
                    <Link href={article.href} className="font-bold text-[#8A642E] hover:text-[#42182F]">
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
