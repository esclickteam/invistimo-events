"use client";

import { useWeddingTheme } from "./WeddingThemeProvider";
import WeddingSiteMenu from "./WeddingSiteMenu";

export default function WeddingNav() {
  const { content } = useWeddingTheme();

  return (
    <WeddingSiteMenu
      className="sticky top-0 z-50 border-b border-[var(--ww-border)] bg-[var(--ww-bg)]/88 backdrop-blur-xl"
      brand={
        <a
          href="#hero"
          className="ww-display text-lg font-semibold md:text-xl"
          style={{ fontFamily: "var(--ww-font-display)" }}
        >
          {content.coupleShort}
        </a>
      }
      buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--ww-border)]"
      panelClassName="border-t border-[var(--ww-border)] bg-[var(--ww-bg)]"
      linkClassName="rounded-xl px-4 py-3 text-right text-sm font-bold text-[var(--ww-text)] hover:bg-[var(--ww-accent-soft)]"
      extra={
        <a
          href="#rsvp"
          className="rounded-full bg-[var(--ww-accent)] px-5 py-2.5 text-xs font-black text-white shadow-lg"
        >
          אישור הגעה
        </a>
      }
    />
  );
}
