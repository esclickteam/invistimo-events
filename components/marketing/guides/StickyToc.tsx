"use client";

import { useEffect, useState } from "react";

export type TocItem = { id: string; label: string };

type Props = {
  items: TocItem[];
  title?: string;
};

export default function StickyToc({ items, title = "תוכן עניינים" }: Props) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <>
      {/* Mobile: horizontal chips */}
      <nav
        aria-label={title}
        className="mb-8 border border-[#E6D2AA] bg-[#FFFDF8] print:hidden lg:hidden"
      >
        <details>
          <summary className="cursor-pointer px-4 py-3 text-sm font-black text-[#8A642E]">
            {title}
          </summary>
          <ol className="space-y-1 border-t border-[#E6D2AA] px-4 py-3">
            {items.map((item, index) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`block py-1.5 text-sm font-semibold ${
                    active === item.id ? "text-[#842B4C]" : "text-[#5C4A3A]"
                  }`}
                >
                  {index + 1}. {item.label}
                </a>
              </li>
            ))}
          </ol>
        </details>
      </nav>

      {/* Desktop: sticky sidebar */}
      <aside className="relative hidden print:hidden lg:block">
        <nav
          aria-label={title}
          className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-[24px] border border-[#E6D2AA] bg-white/90 p-5 shadow-[0_12px_32px_rgba(58,39,20,0.06)]"
        >
          <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">{title}</p>
          <ol className="mt-4 space-y-1.5">
            {items.map((item, index) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`flex gap-2 rounded-xl px-2.5 py-2 text-sm leading-6 transition ${
                    active === item.id
                      ? "bg-[#FFF8EA] font-bold text-[#2C241C]"
                      : "font-semibold text-[#5C4A3A] hover:bg-[#FFFDF8]"
                  }`}
                >
                  <span className="tabular-nums text-[#C7A56B]">{index + 1}.</span>
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </aside>
    </>
  );
}
