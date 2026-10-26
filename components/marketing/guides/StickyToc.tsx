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
        className="sticky top-0 z-20 -mx-5 mb-8 overflow-x-auto border-b border-[#E6D2AA]/80 bg-[#FBF6EE]/95 px-5 py-3 backdrop-blur print:hidden lg:hidden"
      >
        <ul className="flex min-w-max gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  active === item.id
                    ? "border-[#C7A56B] bg-[#FFF8EA] text-[#5E4735]"
                    : "border-[#EADDC8] bg-white/70 text-[#7A6042]"
                }`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
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
