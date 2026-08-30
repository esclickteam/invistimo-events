"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { WEDDING_SECTIONS } from "@/config/weddingWebsite/templates";

type Props = {
  brand?: ReactNode;
  className?: string;
  barClassName?: string;
  buttonClassName?: string;
  panelClassName?: string;
  linkClassName?: string;
  extra?: ReactNode;
};

export default function WeddingSiteMenu({
  brand,
  className = "",
  barClassName = "",
  buttonClassName = "",
  panelClassName = "",
  linkClassName = "",
  extra,
}: Props) {
  const [open, setOpen] = useState(false);
  const items = WEDDING_SECTIONS.filter((section) => section.id !== "footer");

  return (
    <nav className={`relative z-50 ${className}`} data-ww-chrome="1">
      <div className={`mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 ${barClassName}`}>
        <div className="min-w-0">{brand}</div>
        <div className="flex items-center gap-2">
          {extra}
          <button
            type="button"
            className={
              buttonClassName ||
              "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-current/20"
            }
            aria-label="תפריט"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <div
          className={`absolute inset-x-0 top-full z-[60] max-h-[min(80vh,640px)] overflow-y-auto p-4 shadow-2xl ${
            panelClassName || "border-t bg-white"
          }`}
        >
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-1 sm:grid-cols-2">
            {items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={
                  linkClassName ||
                  "rounded-xl px-4 py-3 text-right text-sm font-bold hover:bg-black/5"
                }
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
