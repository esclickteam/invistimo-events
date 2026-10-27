"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ChevronDown, Link2, Search, X } from "lucide-react";

import FaqAnswerMedia from "./FaqAnswerMedia";
import {
  FAQ_CATEGORIES,
  type FaqItem,
  faqSearchHaystack,
  faqTextMatches,
  highlightFaqMatch,
  normalizeFaqText,
} from "@/lib/seo/faq";

const SEARCH_EXAMPLES = [
  "איך שולחים אישורי הגעה?",
  "מתי מתחילים סבבים?",
  "איך משבצים אורחים לשולחנות?",
  "מה קורה כשאורח לא עונה?",
];

const STICKY_OFFSET_PX = 96;

type Props = {
  items: FaqItem[];
};

function HighlightedText({ text, query }: { text: string; query: string }) {
  const parts = highlightFaqMatch(text, query);
  return (
    <>
      {parts.map((part, i) =>
        part.match ? (
          <mark key={i} className="rounded-sm bg-[#F3E6C4] px-0.5 text-inherit">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

export default function FaqKnowledgeCenter({ items }: Props) {
  const searchId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showBackTop, setShowBackTop] = useState(false);
  const [activeOption, setActiveOption] = useState(-1);

  const haystacks = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) map.set(item.id, faqSearchHaystack(item));
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const q = normalizeFaqText(query);
    return items.filter((item) => {
      if (activeCategory !== "all" && item.categoryId !== activeCategory) return false;
      if (!q) return true;
      return faqTextMatches(query, haystacks.get(item.id) ?? "");
    });
  }, [items, query, activeCategory, haystacks]);

  const grouped = useMemo(() => {
    return FAQ_CATEGORIES.map((category) => ({
      category,
      items: filtered.filter((item) => item.categoryId === category.id),
    })).filter((group) => group.items.length > 0);
  }, [filtered]);

  const categoryCounts = useMemo(() => {
    const q = normalizeFaqText(query);
    const base = q
      ? items.filter((item) => faqTextMatches(query, haystacks.get(item.id) ?? ""))
      : items;
    const counts = new Map<string, number>();
    for (const item of base) {
      counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [items, query, haystacks]);

  const scrollToQuestion = useCallback((id: string, open = true) => {
    if (open) {
      setOpenIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET_PX;
      window.scrollTo({ top, behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      if (items.some((item) => item.id === hash)) {
        scrollToQuestion(hash, true);
      } else if (FAQ_CATEGORIES.some((c) => c.id === hash)) {
        setActiveCategory(hash);
        const el = document.getElementById(`category-${hash}`);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET_PX;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [items, scrollToQuestion]);

  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSearch = () => {
    setQuery("");
    setActiveOption(-1);
    inputRef.current?.focus();
  };

  const copyLink = async (id: string) => {
    const url = `${window.location.origin}/faq#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
    } catch {
      window.location.hash = id;
    }
  };

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (query) {
        event.preventDefault();
        clearSearch();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveOption((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveOption((i) => Math.max(i - 1, -1));
      return;
    }
    if (event.key === "Enter" && activeOption >= 0 && filtered[activeOption]) {
      event.preventDefault();
      const item = filtered[activeOption];
      scrollToQuestion(item.id, true);
      setActiveCategory(item.categoryId);
    }
  };

  const searching = normalizeFaqText(query).length > 0;

  return (
    <div className="relative">
      {/* Search + category shortcuts */}
      <section className="px-5 md:px-8" aria-labelledby={`${searchId}-label`}>
        <div className="mx-auto max-w-4xl">
          <label id={`${searchId}-label`} htmlFor={searchId} className="sr-only">
            חיפוש בשאלות ותשובות
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9A7B55]"
              aria-hidden
            />
            <input
              ref={inputRef}
              id={searchId}
              type="search"
              role="combobox"
              aria-expanded={searching}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                activeOption >= 0 && filtered[activeOption]
                  ? `faq-option-${filtered[activeOption].id}`
                  : undefined
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveOption(-1);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder="מה תרצו לדעת?"
              className="w-full rounded-2xl border border-[#E6D2AA] bg-white/95 py-4 pr-12 pl-12 text-base text-[#35281F] shadow-[0_12px_40px_rgba(58,39,20,0.08)] outline-none transition placeholder:text-[#A89078] focus:border-[#C7A56B] focus:ring-2 focus:ring-[#E8D5A8]"
              autoComplete="off"
              enterKeyHint="search"
            />
            {query ? (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#7A6042] transition hover:bg-[#F7EFE3]"
                aria-label="ניקוי חיפוש"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>

          <p className="mt-3 text-sm text-[#7A6042]" aria-live="polite">
            {searching
              ? filtered.length === 0
                ? "לא נמצאו תוצאות"
                : `${filtered.length} תוצאות`
              : `${items.length} שאלות`}
          </p>

          {!searching ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {SEARCH_EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(example);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border border-[#EADDC8] bg-white/80 px-3 py-1.5 text-sm leading-snug text-[#5E4735] transition hover:border-[#C7A56B] hover:bg-white"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div
            className="mt-6 flex flex-wrap gap-2"
            role="tablist"
            aria-label="קטגוריות שאלות"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                activeCategory === "all"
                  ? "bg-[#35281F] text-[#F7F1E8]"
                  : "border border-[#EADDC8] bg-white/80 text-[#5E4735] hover:border-[#C7A56B]"
              }`}
            >
              הכל ({searching ? filtered.length : items.length})
            </button>
            {FAQ_CATEGORIES.map((category) => {
              const count = categoryCounts.get(category.id) ?? 0;
              if (searching && count === 0) return null;
              return (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === category.id}
                  onClick={() => {
                    setActiveCategory(category.id);
                    if (!searching) {
                      const el = document.getElementById(`category-${category.id}`);
                      if (el) {
                        const top =
                          el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET_PX;
                        window.scrollTo({ top, behavior: "smooth" });
                      }
                    }
                  }}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                    activeCategory === category.id
                      ? "bg-[#35281F] text-[#F7F1E8]"
                      : "border border-[#EADDC8] bg-white/80 text-[#5E4735] hover:border-[#C7A56B]"
                  }`}
                >
                  {category.shortTitle}
                  <span className="opacity-70">{` (${count})`}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Results / accordion — answers always in DOM for crawlers on first paint;
          filtering only hides non-matches visually while searching */}
      <section className="mt-10 px-5 pb-8 md:px-8" aria-label="שאלות לפי קטגוריה">
        <div className="mx-auto max-w-4xl space-y-12">
          {grouped.length === 0 ? (
            <div
              className="rounded-3xl border border-dashed border-[#DCC7A6] bg-white/70 px-6 py-12 text-center"
              role="status"
            >
              <p className="text-lg font-bold text-[#35281F]">לא מצאנו התאמה לחיפוש</p>
              <p className="mt-2 leading-7 text-[#5C4A3A]">
                נסו ניסוח אחר, בחרו קטגוריה, או פנו אלינו ונשמח לעזור.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={clearSearch}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#DCC7A6] bg-white px-6 text-sm font-bold text-[#5E4735]"
                >
                  ניקוי חיפוש
                </button>
                <Link
                  href="/contact"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#35281F] px-6 text-sm font-bold text-white"
                >
                  יצירת קשר
                </Link>
              </div>
            </div>
          ) : null}

          <div id={listboxId} role={searching ? "listbox" : undefined} className="space-y-12">
            {grouped.map(({ category, items: catItems }) => (
              <div key={category.id} id={`category-${category.id}`}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-[family-name:var(--font-faq-display)] text-2xl font-semibold text-[#35281F] md:text-3xl">
                      {category.title}
                    </h2>
                    {category.description ? (
                      <p className="mt-1 text-sm leading-6 text-[#7A6042]">{category.description}</p>
                    ) : null}
                  </div>
                  {category.relatedHref && category.relatedLabel ? (
                    <Link
                      href={category.relatedHref}
                      className="text-sm font-bold text-[#8A642E] underline-offset-4 hover:underline"
                    >
                      {category.relatedLabel}
                    </Link>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {catItems.map((item) => {
                    const isOpen = openIds.has(item.id);
                    const optionIndex = filtered.findIndex((f) => f.id === item.id);
                    return (
                      <article
                        key={item.id}
                        id={item.id}
                        className={`scroll-mt-28 rounded-2xl border bg-white/95 transition ${
                          activeOption === optionIndex && searching
                            ? "border-[#C7A56B] shadow-[0_10px_30px_rgba(58,39,20,0.1)]"
                            : "border-[#EADDC8]"
                        }`}
                      >
                        <h3 className="text-base font-semibold text-[#35281F]">
                          <button
                            type="button"
                            id={`faq-option-${item.id}`}
                            role={searching ? "option" : undefined}
                            aria-selected={searching ? activeOption === optionIndex : undefined}
                            aria-expanded={isOpen}
                            aria-controls={`faq-answer-${item.id}`}
                            onClick={() => toggle(item.id)}
                            className="flex w-full items-start justify-between gap-4 px-5 py-4 text-right"
                          >
                            <span className="leading-7">
                              {searching ? (
                                <HighlightedText text={item.q} query={query} />
                              ) : (
                                item.q
                              )}
                            </span>
                            <ChevronDown
                              className={`mt-1 h-5 w-5 shrink-0 text-[#9A7B55] transition-transform duration-300 ${
                                isOpen ? "rotate-180" : ""
                              }`}
                              aria-hidden
                            />
                          </button>
                        </h3>

                        {/* Answers stay in the DOM (CSS hidden) for crawlers and AI readers */}
                        <div
                          id={`faq-answer-${item.id}`}
                          role="region"
                          aria-labelledby={`faq-option-${item.id}`}
                          className={
                            isOpen
                              ? "border-t border-[#F0E4D2] px-5 pb-5 pt-4"
                              : "hidden"
                          }
                        >
                          <div className="space-y-4 leading-8 text-[#5C4A3A]">
                            {item.a.split("\n").map((paragraph, idx) => (
                              <p key={idx}>
                                {searching && idx === 0 ? (
                                  <HighlightedText text={paragraph} query={query} />
                                ) : (
                                  paragraph
                                )}
                              </p>
                            ))}
                          </div>

                          {item.links && item.links.length > 0 ? (
                            <ul className="mt-4 flex flex-wrap gap-2">
                              {item.links.map((link) => (
                                <li key={link.href + link.label}>
                                  <Link
                                    href={link.href}
                                    className="inline-flex min-h-10 items-center rounded-full border border-[#E6D2AA] bg-[#FFFDF8] px-4 text-sm font-bold text-[#5E4735] transition hover:border-[#C7A56B]"
                                  >
                                    {link.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : null}

                          {item.media ? <FaqAnswerMedia media={item.media} /> : null}

                          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#7A6042]">
                            <button
                              type="button"
                              onClick={() => copyLink(item.id)}
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 font-semibold text-[#8A642E] transition hover:bg-[#F7EFE3]"
                            >
                              <Link2 className="h-4 w-4" aria-hidden />
                              {copiedId === item.id ? "הקישור הועתק" : "העתקת קישור לשאלה"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showBackTop ? (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 left-6 z-40 inline-flex min-h-12 items-center rounded-full border border-[#E6D2AA] bg-white/95 px-4 text-sm font-bold text-[#35281F] shadow-[0_12px_30px_rgba(58,39,20,0.18)] backdrop-blur transition hover:-translate-y-0.5 md:bottom-8 md:left-8"
        >
          חזרה למעלה
        </button>
      ) : null}
    </div>
  );
}
