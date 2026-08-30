"use client";

import type { ReactNode } from "react";
import { WEDDING_PRIMARY_NAV_IDS, WEDDING_SECTIONS } from "@/config/weddingWebsite/templates";
import { isSectionVisible } from "@/lib/weddingWebsite/editorSchema";
import { useWeddingSite } from "./editable/WeddingSiteContext";

type Props = {
  brand?: ReactNode;
  className?: string;
  barClassName?: string;
  linkClassName?: string;
};

export default function WeddingSiteMenu({
  brand,
  className = "",
  barClassName = "",
  linkClassName = "",
}: Props) {
  const site = useWeddingSite();
  const items = WEDDING_PRIMARY_NAV_IDS.map((id) => WEDDING_SECTIONS.find((section) => section.id === id)).filter(
    (section): section is NonNullable<typeof section> => Boolean(section)
  ).filter((section) => isSectionVisible(site?.content, section.id));

  return (
    <nav className={`relative z-50 ${className}`} data-ww-chrome="1">
      <div
        className={`mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2 sm:px-4 ${barClassName}`}
      >
        <div className="min-w-0 shrink-0">{brand}</div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-1 gap-y-1">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              data-ww-nav={item.id}
              className={`${
                linkClassName ||
                "whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold hover:bg-black/5 sm:text-sm"
              } ${item.id === "rsvp" ? "font-black" : ""}`}
            >
              {item.navLabel}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
