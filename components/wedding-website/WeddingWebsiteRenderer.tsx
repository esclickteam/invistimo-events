"use client";

import Link from "next/link";
import WeddingNav from "./WeddingNav";
import { WeddingThemeProvider } from "./WeddingThemeProvider";
import { WEDDING_SECTION_COMPONENTS } from "./WeddingWebsiteSections";
import { WEDDING_SECTIONS } from "@/config/weddingWebsite/templates";
import { WEDDING_DEMO_CONTENT } from "@/config/weddingWebsite/demoContent";
import type { WeddingTemplate } from "@/types/weddingWebsite";

type Props = {
  template: WeddingTemplate;
};

export default function WeddingWebsiteRenderer({ template }: Props) {
  return (
    <WeddingThemeProvider template={template} content={WEDDING_DEMO_CONTENT}>
      <div className="ww-site bg-[var(--ww-bg)] text-[var(--ww-text)]">
        <div className="fixed bottom-4 left-4 z-[55]">
          <Link
            href="/wedding-website"
            className="rounded-full border border-[var(--ww-border)] bg-[var(--ww-surface)]/90 px-4 py-2 text-xs font-black shadow-lg backdrop-blur-md transition hover:scale-105"
          >
            ← כל התבניות
          </Link>
        </div>
        <WeddingNav />
        <main>
          {WEDDING_SECTIONS.map((section) => {
            const Component = WEDDING_SECTION_COMPONENTS[section.id];
            return <Component key={section.id} />;
          })}
        </main>
      </div>
    </WeddingThemeProvider>
  );
}
