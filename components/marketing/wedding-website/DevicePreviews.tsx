"use client";

import Link from "next/link";
import { ExternalLink, Maximize2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { WeddingTemplate } from "@/types/weddingWebsite";

type FrameProps = {
  template: WeddingTemplate;
  className?: string;
};

/** Large desktop live preview — real template, not a mock. */
export function DesktopLiveFrame({ template, className = "" }: FrameProps) {
  return (
    <div
      className={`overflow-hidden rounded-[22px] border border-[#D8C4A4]/70 bg-[#1A1510] shadow-[0_28px_80px_rgba(36,24,16,0.28)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#241E18] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#E8A090]/80" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#E8D5A8]/80" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#A8C9A0]/80" aria-hidden />
        <span className="mr-auto truncate text-[11px] font-semibold text-[#C9B89A]">
          invistimo.com/wedding-website/{template.id}
        </span>
      </div>
      <div className="relative h-[min(62vh,560px)] overflow-hidden bg-[#0a0a0a] md:h-[620px]">
        <iframe
          src={`/wedding-website/${template.id}?embed=1`}
          title={`תצוגת דסקטופ — ${template.name}`}
          loading="lazy"
          className="pointer-events-none absolute left-1/2 top-0 border-0"
          style={{
            width: "1280px",
            height: "2200px",
            transform: "translateX(-50%) scale(0.55)",
            transformOrigin: "top center",
          }}
        />
      </div>
    </div>
  );
}

/** Readable mobile live preview — avoids shrinking content past legibility. */
export function MobileLiveFrame({ template, className = "" }: FrameProps) {
  return (
    <div className={`mx-auto w-full max-w-[300px] ${className}`}>
      <div className="rounded-[2.1rem] border border-[#2C241C]/18 bg-[#1A1510] p-2.5 shadow-[0_30px_80px_rgba(36,24,16,0.32)]">
        <div className="mb-2 flex justify-center">
          <span className="h-1.5 w-16 rounded-full bg-white/20" aria-hidden />
        </div>
        <div className="relative h-[520px] overflow-hidden rounded-[1.55rem] bg-black md:h-[560px]">
          <iframe
            src={`/wedding-website/${template.id}?embed=1`}
            title={`תצוגת מובייל — ${template.name}`}
            loading="lazy"
            className="pointer-events-none absolute left-1/2 top-0 border-0"
            style={{
              width: "390px",
              height: "2400px",
              transform: "translateX(-50%) scale(0.74)",
              transformOrigin: "top center",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function HeroDeviceDuo({ template }: { template: WeddingTemplate }) {
  return (
    <div className="relative mx-auto w-full max-w-[640px]">
      <div className="pointer-events-none absolute inset-x-[10%] top-8 bottom-10 rounded-[40px] bg-[radial-gradient(circle_at_top,#E8D4AF_0%,transparent_55%)] blur-2xl" />
      <div className="relative grid items-end gap-4 sm:grid-cols-[1.35fr_0.75fr] sm:gap-0">
        <div className="ww-mkt-float relative z-[1] sm:ml-[-6%]">
          <DesktopLiveFrame template={template} />
        </div>
        <div className="ww-mkt-float-delayed relative z-[2] mx-auto w-[78%] sm:mb-6 sm:mr-0 sm:w-auto sm:justify-self-end">
          <MobileLiveFrame template={template} />
        </div>
      </div>
    </div>
  );
}

type ShowcaseProps = {
  template: WeddingTemplate;
  styleName: string;
  styleNameHe: string;
  description: string;
  mood: string;
  index: number;
};

export function FeaturedTemplateShowcase({
  template,
  styleName,
  styleNameHe,
  description,
  mood,
  index,
}: ShowcaseProps) {
  const [scrollOpen, setScrollOpen] = useState(false);
  const odd = index % 2 === 1;

  return (
    <article
      id={`style-${template.id}`}
      className={`grid items-center gap-8 lg:gap-12 ${
        odd ? "lg:grid-cols-[0.95fr_1.05fr]" : "lg:grid-cols-[1.05fr_0.95fr]"
      }`}
    >
      <div className={odd ? "lg:order-2" : undefined}>
        <div className="relative">
          <DesktopLiveFrame template={template} />
          <div className="pointer-events-none absolute -bottom-8 -left-2 w-[42%] sm:-left-6 sm:w-[38%]">
            <div className="pointer-events-auto">
              <MobileLiveFrame template={template} className="max-w-none scale-[0.92] origin-bottom" />
            </div>
          </div>
        </div>
      </div>

      <div className={`pt-10 sm:pt-0 ${odd ? "lg:order-1" : ""}`}>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#A77A38]">
          {String(index + 1).padStart(2, "0")} · {styleName}
        </p>
        <h3 className="mt-3 font-[family-name:var(--font-ww-display)] text-3xl font-medium text-[#241E18] md:text-4xl">
          {styleNameHe}
        </h3>
        <p className="mt-2 text-sm font-semibold text-[#8A7458]">{template.name} · {mood}</p>
        <p className="mt-4 max-w-md text-base leading-8 text-[#5C4A38] md:text-lg">{description}</p>
        <p className="mt-3 max-w-md text-sm leading-7 text-[#7A6550]">{template.tagline}</p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href={`/wedding-website/${template.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-l from-[#2C211B] via-[#5A4333] to-[#3A2B22] px-7 py-3 text-sm font-bold text-[#F7F1E6] shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5"
          >
            צפייה באתר לדוגמה
            <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setScrollOpen(true)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#DCC7A6] bg-white/80 px-7 py-3 text-sm font-bold text-[#5E4735] backdrop-blur transition hover:bg-white"
          >
            גלילה מלאה
            <Maximize2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {scrollOpen ? (
        <ScrollPreviewModal
          template={template}
          onClose={() => setScrollOpen(false)}
        />
      ) : null}
    </article>
  );
}

function ScrollPreviewModal({
  template,
  onClose,
}: {
  template: WeddingTemplate;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[#17120E]/78 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] bg-[#FBF6EE] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6D2AA] px-5 py-4">
          <div>
            <h3 id={titleId} className="font-[family-name:var(--font-ww-display)] text-2xl text-[#241E18]">
              {template.name} — גלילה מלאה
            </h3>
            <p className="text-sm text-[#7A6550]">אתר דמו אמיתי מהמערכת · ניתן לגלול בתוך החלון</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/wedding-website/${template.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-sm font-bold text-[#5E4735]"
            >
              פתיחה בחלון מלא
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#241E18] px-4 py-2 text-sm font-bold text-[#F7F1E6]"
            >
              סגירה
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-[#F3EADF]">
          <iframe
            src={`/wedding-website/${template.id}?embed=1`}
            title={`גלילה מלאה — ${template.name}`}
            className="block w-full border-0"
            style={{ height: "2200px", minHeight: "80vh" }}
          />
        </div>
      </div>
    </div>
  );
}
