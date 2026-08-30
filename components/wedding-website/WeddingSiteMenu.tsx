"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const site = useWeddingSite();
  const items = WEDDING_PRIMARY_NAV_IDS.map((id) => WEDDING_SECTIONS.find((section) => section.id === id))
    .filter((section): section is NonNullable<typeof section> => Boolean(section))
    .filter((section) => isSectionVisible(site?.content, section.id));

  const linkClass = `${
    linkClassName ||
    "whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold hover:bg-black/5 sm:text-sm"
  }`;

  const links = items.map((item) => (
    <a
      key={item.id}
      href={`#${item.id}`}
      data-ww-nav={item.id}
      className={`${linkClass} ${item.id === "rsvp" ? "font-black" : ""}`}
      onClick={() => setOpen(false)}
    >
      {item.navLabel}
    </a>
  ));

  return (
    <nav className={`relative z-50 ${className}`} data-ww-chrome="1">
      <div className={`relative mx-auto max-w-6xl px-3 py-2 sm:px-4 ${barClassName}`}>
        {brand ? (
          <div className="ww-nav-desktop pointer-events-auto absolute inset-y-0 start-3 z-10 hidden items-center md:flex sm:start-4">
            {brand}
          </div>
        ) : null}
        <div className="ww-nav-desktop hidden flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center md:flex">
          {links}
        </div>
        <div className="ww-nav-hamburger flex items-center gap-3 md:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-current/20"
            aria-label="תפריט"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {brand ? <div className="min-w-0 flex-1 truncate">{brand}</div> : null}
        </div>
      </div>
      {open ? (
        <div className="ww-nav-hamburger-panel absolute inset-x-0 top-full z-[60] border-t border-black/10 bg-white/95 p-3 shadow-2xl backdrop-blur-md md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 text-right">
            {items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                data-ww-nav={item.id}
                className={`${linkClass} block w-full px-4 py-3 text-sm ${item.id === "rsvp" ? "font-black" : ""}`}
                onClick={() => setOpen(false)}
              >
                {item.navLabel}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
