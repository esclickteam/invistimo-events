"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { Calculator, CalendarDays, LayoutGrid, Users } from "lucide-react";
import {
  GUIDE_HUB_PATH,
  type GuideCategory,
  type GuideCategoryId,
} from "@/lib/marketing/guideCatalog";

export type LibraryGuide = {
  slug: string;
  href: string;
  title: string;
  description: string;
  categoryId: GuideCategoryId;
  readLabel: string;
};

type ServiceLink = {
  name: string;
  path: string;
};

const ICONS = {
  planning: CalendarDays,
  guests: Users,
  seating: LayoutGrid,
  tools: Calculator,
} as const;

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function GuidesLibrary({
  guides,
  categories,
  serviceLinks,
}: {
  guides: LibraryGuide[];
  categories: GuideCategory[];
  serviceLinks: ServiceLink[];
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<GuideCategoryId | "all">("all");

  useEffect(() => {
    const readHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      const match = categories.find((category) => `cat-${category.id}` === hash);
      setCategoryId(match ? match.id : "all");
    };

    readHash();
    window.addEventListener("hashchange", readHash);
    window.addEventListener("popstate", readHash);

    const originalPush = history.pushState.bind(history);
    const originalReplace = history.replaceState.bind(history);
    history.pushState = (...args: Parameters<History["pushState"]>) => {
      originalPush(...args);
      readHash();
    };
    history.replaceState = (...args: Parameters<History["replaceState"]>) => {
      originalReplace(...args);
      readHash();
    };

    return () => {
      window.removeEventListener("hashchange", readHash);
      window.removeEventListener("popstate", readHash);
      history.pushState = originalPush;
      history.replaceState = originalReplace;
    };
  }, [categories]);

  useEffect(() => {
    if (categoryId === "all") return;
    const frame = window.requestAnimationFrame(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById(`cat-${categoryId}`)?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [categoryId]);

  const needle = normalize(query);

  const visible = useMemo(() => {
    return new Set(
      guides
        .filter((guide) => {
          if (categoryId !== "all" && guide.categoryId !== categoryId) return false;
          if (!needle) return true;
          return normalize(`${guide.title} ${guide.description}`).includes(needle);
        })
        .map((guide) => guide.slug)
    );
  }, [guides, categoryId, needle]);

  const showAll = () => {
    setCategoryId("all");
    if (window.location.pathname === GUIDE_HUB_PATH && window.location.hash) {
      window.history.pushState(null, "", GUIDE_HUB_PATH);
    }
  };

  const selectCategory = (event: MouseEvent<HTMLAnchorElement>, category: GuideCategory) => {
    event.preventDefault();
    setCategoryId(category.id);
    const next = category.href;
    if (`${window.location.pathname}${window.location.hash}` !== next) {
      window.history.pushState(null, "", next);
    }
  };

  return (
    <div id="guides-library" className="scroll-mt-36">
      <div className="border border-[#C5A582] bg-[#FFFDF8] p-4 md:p-5">
        <label htmlFor="guides-search" className="block text-sm font-bold text-[#7A6042]">
          חיפוש במדריכים
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="guides-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="שם מדריך או נושא"
            className="min-h-12 w-full border border-[#C5A582] bg-[#FFF8F0] px-4 text-base text-[#35281F] outline-none placeholder:text-[#8A7560] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A642E]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="min-h-12 shrink-0 border border-[#C5A582] bg-[#FFF8F0] px-4 text-sm font-bold text-[#42182F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A642E]"
            >
              ניקוי
            </button>
          ) : null}
        </div>

        <nav aria-label="קטגוריות מדריכים" className="mt-4 flex flex-wrap gap-2">
          <a
            href={GUIDE_HUB_PATH}
            aria-current={categoryId === "all" ? "true" : undefined}
            onClick={(event) => {
              if (window.location.pathname === GUIDE_HUB_PATH) event.preventDefault();
              showAll();
            }}
            className={filterClass(categoryId === "all")}
          >
            כל המדריכים
          </a>
          {categories.map((category) => {
            const active = categoryId === category.id;
            const Icon = ICONS[category.id];
            return (
              <a
                key={category.id}
                href={category.href}
                aria-current={active ? "true" : undefined}
                onClick={(event) => selectCategory(event, category)}
                className={filterClass(active)}
              >
                <Icon size={16} strokeWidth={1.5} aria-hidden />
                {category.title}
              </a>
            );
          })}
        </nav>

        <p className="mt-4 text-sm leading-6 text-[#5C4A3A]">
          עמודי השירות:{" "}
          {serviceLinks.map((link, index) => (
            <span key={link.path}>
              {index > 0 ? <span className="px-1.5 text-[#C7A56B]">·</span> : null}
              <Link href={link.path} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                {link.name}
              </Link>
            </span>
          ))}
        </p>
      </div>

      <p aria-live="polite" className="sr-only">
        {`מוצגים ${visible.size} מדריכים`}
      </p>

      <div className="mt-6 space-y-8">
        {categories.map((category) => {
          const items = guides
            .filter((guide) => guide.categoryId === category.id)
            .sort(
              (a, b) => category.slugs.indexOf(a.slug) - category.slugs.indexOf(b.slug)
            );
          const sectionVisible =
            (categoryId === "all" || categoryId === category.id) &&
            items.some((guide) => visible.has(guide.slug));
          const Icon = ICONS[category.id];

          return (
            <section
              key={category.id}
              id={`cat-${category.id}`}
              aria-labelledby={`cat-${category.id}-title`}
              hidden={!sectionVisible}
              className="scroll-mt-36 border border-[#C5A582] bg-[#FFFDF8]"
            >
              <div className="flex items-start gap-3 border-b border-[#E7D8BD] px-5 py-5">
                <Icon size={20} strokeWidth={1.5} aria-hidden className="mt-1 shrink-0 text-[#8A642E]" />
                <div>
                  <h2 id={`cat-${category.id}-title`} className="text-2xl font-black text-[#35281F]">
                    {category.title}
                  </h2>
                  <p className="mt-1 leading-7 text-[#5C4A3A]">{category.description}</p>
                </div>
              </div>
              <ul>
                {items.map((guide) => (
                  <li key={guide.slug} hidden={!visible.has(guide.slug)} className="border-b border-[#E7D8BD] last:border-b-0">
                    <div className="px-5 py-5">
                      <h3 className="text-lg font-bold leading-7 text-[#35281F]">
                        <Link href={guide.href} className="hover:text-[#8A642E]">
                          {guide.title}
                        </Link>
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">{guide.description}</p>
                      <Link
                        href={guide.href}
                        className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-[#8A642E] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A642E]"
                      >
                        {guide.readLabel}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {visible.size === 0 ? (
        <p className="mt-6 border border-[#C5A582] bg-[#FFFDF8] px-5 py-6 text-[#5C4A3A]">
          לא נמצאו מדריכים תואמים. נסו מילה אחרת, או חזרו אל{" "}
          <button type="button" onClick={showAll} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
            כל המדריכים
          </button>
          .
        </p>
      ) : null}
    </div>
  );
}

function filterClass(active: boolean) {
  return [
    "inline-flex min-h-11 items-center gap-2 border px-4 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A642E]",
    active
      ? "border-[#42182F] bg-[#42182F] text-[#FFF8F0]"
      : "border-[#C5A582] bg-[#FFF8F0] text-[#42182F] hover:border-[#8A642E]",
  ].join(" ");
}
