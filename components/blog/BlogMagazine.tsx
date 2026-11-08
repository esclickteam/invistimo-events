"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import ArticleCard from "@/components/blog/ArticleCard";
import styles from "@/components/blog/blog.module.css";
import { formatReadingTime } from "@/lib/blog/reading";
import type { BlogArticle } from "@/lib/blog/articles";
import {
  BLOG_HUB_PATH,
  categoryIsIndexable,
  categoryPath,
  type BlogCategory,
} from "@/lib/blog/taxonomy";

type SortMode = "new" | "popular";

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function byNew(a: BlogArticle, b: BlogArticle) {
  return b.modified.localeCompare(a.modified) || a.title.localeCompare(b.title, "he");
}

function byPopular(a: BlogArticle, b: BlogArticle) {
  return a.popularRank - b.popularRank || byNew(a, b);
}

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { threshold: 0.18 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-shown={shown ? "true" : "false"} className={`${styles.reveal} ${className}`}>
      {children}
    </div>
  );
}

function CategoryRail({
  categories,
  categoryId,
  onSelect,
}: {
  categories: BlogCategory[];
  categoryId: string;
  onSelect: (id: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = () => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const has = max > 4;
    const pos = Math.abs(el.scrollLeft);
    setOverflow(has);
    setCanPrev(pos > 8);
    setCanNext(has && pos < max - 8);
  };

  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [categories.length]);

  const nudge = (toward: "start" | "end") => {
    const el = scroller.current;
    if (!el) return;
    const delta = toward === "end" ? -240 : 240;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  const chip = (active: boolean) =>
    `shrink-0 snap-start border px-4 py-2 text-sm font-bold whitespace-nowrap ${
      active
        ? "border-[#42182F] bg-[#42182F] text-[#FFF8F0]"
        : "border-[#E6D2AA] bg-white text-[#35281F] hover:border-[#C7A56B]"
    }`;

  return (
    <div className="relative mt-6 flex items-center gap-2">
      {overflow && canPrev ? (
        <button
          type="button"
          aria-label="קטגוריות קודמות"
          onClick={() => nudge("start")}
          className="hidden h-9 w-9 shrink-0 items-center justify-center border border-[#E6D2AA] bg-[#FFFDF8] text-lg text-[#8A642E] md:flex"
        >
          ›
        </button>
      ) : null}
      <nav
        ref={scroller}
        aria-label="קטגוריות הבלוג"
        className={`${styles.rail} min-w-0 flex-1 flex flex-nowrap gap-2 overflow-x-auto scroll-smooth pb-3 snap-x`}
      >
        <button type="button" onClick={() => onSelect("all")} className={chip(categoryId === "all")}>
          הכל
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            className={chip(categoryId === category.id)}
          >
            {category.title}
          </button>
        ))}
      </nav>
      {overflow && canNext ? (
        <button
          type="button"
          aria-label="קטגוריות נוספות"
          onClick={() => nudge("end")}
          className="hidden h-9 w-9 shrink-0 items-center justify-center border border-[#E6D2AA] bg-[#FFFDF8] text-lg text-[#8A642E] md:flex"
        >
          ‹
        </button>
      ) : null}
    </div>
  );
}

export default function BlogMagazine({
  articles,
  categories,
}: {
  articles: BlogArticle[];
  categories: BlogCategory[];
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [sort, setSort] = useState<SortMode>("new");

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const article of articles) {
      map.set(article.categoryId, (map.get(article.categoryId) || 0) + 1);
    }
    return map;
  }, [articles]);

  const filtered = useMemo(() => {
    const needle = normalize(query);
    return articles.filter((article) => {
      if (categoryId !== "all" && article.categoryId !== categoryId) return false;
      if (!needle) return true;
      const haystack = normalize(
        `${article.title} ${article.description} ${article.categoryTitle} ${article.subcategoryTitle} ${article.searchText}`
      );
      return haystack.includes(needle);
    });
  }, [articles, categoryId, query]);

  const searching = normalize(query).length > 0 || categoryId !== "all";
  const hero = articles.find((article) => article.hero) || [...articles].sort(byPopular)[0];
  const recommended = articles.filter((article) => article.featured).slice(0, 3);
  const latest = [...articles].sort(sort === "new" ? byNew : byPopular).slice(0, 6);
  const popular = [...articles].sort(byPopular).slice(0, 3);

  return (
    <div dir="rtl" className="bg-[#FBF6EE] text-[#3F3025]">
      <section className={`${styles.rise} relative isolate overflow-hidden px-5 pb-10 pt-14 md:px-8 md:pt-20`}>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,rgba(201,164,92,0.28),transparent_36%),radial-gradient(circle_at_88%_0%,rgba(132,43,76,0.08),transparent_32%),linear-gradient(180deg,#FFFDF8_0%,#FBF6EE_100%)]" />
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-[#7A6042]">
            <Link href="/" className="hover:text-[#8A642E]">
              ראשי
            </Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            בלוג
          </p>
          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.15] text-[#35281F] md:text-6xl">
            המגזין של Invistimo — כל מה שצריך לדעת על אירועים
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5C4A3A]">
            מדריכים מעשיים לתכנון אירוע, אישורי הגעה, הזמנות, סידורי הושבה וניהול אורחים. נכתב מתוך
            העבודה השוטפת עם זוגות, משפחות ואולמות בישראל.
          </p>

          <form
            className="mt-8 max-w-2xl"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="blog-search" className="text-sm font-bold text-[#7A6042]">
              חיפוש מאמרים
            </label>
            <input
              id="blog-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="לדוגמה: הושבה, Save the Date, רשימת מוזמנים"
              className="mt-2 h-14 w-full border border-[#E6D2AA] bg-white px-4 text-base text-[#35281F] outline-none focus:border-[#8A642E]"
            />
          </form>

          <CategoryRail categories={categories} categoryId={categoryId} onSelect={setCategoryId} />
        </div>
      </section>

      {searching ? (
        <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-3xl font-black text-[#35281F]">תוצאות</h2>
            <p className="text-sm font-bold text-[#7A6042]">{filtered.length} מאמרים</p>
          </div>
          {filtered.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="border border-[#E6D2AA] bg-[#FFFDF8] px-6 py-16 text-center">
              <p className="text-2xl font-black text-[#35281F]">לא נמצאו מאמרים</p>
              <p className="mx-auto mt-3 max-w-md leading-8 text-[#5C4A3A]">
                נסו מילה אחרת, או חזרו לכל המאמרים. אפשר גם לעבור לקטגוריה מהתפריט למעלה.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategoryId("all");
                }}
                className="mt-6 inline-flex min-h-12 items-center bg-[#42182F] px-6 text-base font-black text-[#FFF8F0] hover:bg-[#842B4C]"
              >
                לכל המאמרים
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          {hero ? (
            <Reveal>
            <section className="mx-auto max-w-6xl px-5 py-8 md:px-8">
              <article className="border border-[#E6D2AA] bg-[#FFFDF8]">
                <Link href={hero.href} className="grid md:grid-cols-2">
                  <div className="relative min-h-72 overflow-hidden bg-[#F3E6D4] md:min-h-[28rem]">
                    <ArticleCover article={hero} />
                  </div>
                  <div className="flex flex-col justify-center px-6 py-8 md:px-10">
                    <p className="text-xs font-bold text-[#8A642E]">{hero.categoryTitle}</p>
                    <h2 className="mt-3 text-3xl font-black leading-tight text-[#35281F] md:text-4xl">
                      {hero.title}
                    </h2>
                    <p className="mt-4 leading-8 text-[#5C4A3A]">{hero.description}</p>
                    <p className="mt-5 text-sm font-bold text-[#7A6042]">
                      {formatReadingTime(hero.readingMinutes)}
                    </p>
                  </div>
                </Link>
              </article>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {recommended.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </section>
            </Reveal>
          ) : null}

          <Reveal>
          <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-3xl font-black text-[#35281F]">מאמרים אחרונים</h2>
              <div className="flex border border-[#E6D2AA]">
                <button
                  type="button"
                  onClick={() => setSort("new")}
                  className={`px-4 py-2 text-sm font-bold ${sort === "new" ? "bg-[#42182F] text-[#FFF8F0]" : "bg-white text-[#35281F]"}`}
                >
                  חדשים
                </button>
                <button
                  type="button"
                  onClick={() => setSort("popular")}
                  className={`px-4 py-2 text-sm font-bold ${sort === "popular" ? "bg-[#42182F] text-[#FFF8F0]" : "bg-white text-[#35281F]"}`}
                >
                  פופולריים
                </button>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
          </Reveal>

          {categories.map((category) => {
            const items = articles.filter((article) => article.categoryId === category.id);
            if (!items.length) return null;
            const count = counts.get(category.id) || 0;
            return (
              <Reveal key={category.id}>
              <section
                id={`cat-${category.id}`}
                className="mx-auto max-w-6xl px-5 py-8 md:px-8"
              >
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-t border-[#E6D2AA] pt-8">
                  <div>
                    <h2 className="text-3xl font-black text-[#35281F]">{category.title}</h2>
                    <p className="mt-2 max-w-2xl leading-7 text-[#5C4A3A]">{category.description}</p>
                  </div>
                  {categoryIsIndexable(count) ? (
                    <Link
                      href={categoryPath(category.id)}
                      className="text-sm font-black text-[#8A642E] hover:text-[#42182F]"
                    >
                      לכל המאמרים בקטגוריה
                    </Link>
                  ) : null}
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.slice(0, 3).map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </section>
              </Reveal>
            );
          })}

          <Reveal>
          <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
            <h2 className="text-3xl font-black text-[#35281F]">מאמרים פופולריים</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {popular.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
          </Reveal>
        </>
      )}

      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <div className="border border-[#42182F] bg-[#42182F] px-6 py-10 text-[#FFF8F0] md:px-10">
          <h2 className="text-3xl font-black leading-tight">רוצים לסגור את האירוע בלי רשימות מפוזרות?</h2>
          <p className="mt-4 max-w-2xl leading-8 text-[#F6E7D4]">
            Invistimo מרכזת הזמנות, אישורי הגעה, רשימת מוזמנים וסידורי הושבה. אפשר לבדוק חבילה לפי
            מספר הרשומות, או לדבר איתנו לפני שמחליטים.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center bg-[#C9A45C] px-6 font-black text-[#1C1612] hover:bg-[#D4B06A]"
            >
              לחבילות ומחירים
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center border border-[#E6D2AA] px-6 font-black text-[#FFF8F0] hover:bg-white/10"
            >
              יצירת קשר
            </Link>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-[#7A6042]">
          <Link href={BLOG_HUB_PATH} className="font-bold text-[#8A642E]">
            חזרה לראש המגזין
          </Link>
        </p>
      </section>
    </div>
  );
}

function ArticleCover({ article }: { article: BlogArticle }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={article.image}
      alt={article.imageAlt}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
