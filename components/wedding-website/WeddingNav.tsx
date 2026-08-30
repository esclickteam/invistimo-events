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
      linkClassName="whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-bold text-[var(--ww-text-muted)] hover:bg-[var(--ww-accent-soft)] hover:text-[var(--ww-accent)] sm:text-sm"
    />
  );
}
