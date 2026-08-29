"use client";

type Props = {
  accent?: string;
  text?: string;
  surface?: string;
  border?: string;
  /** Hide demo-only chrome */
  hideDemoLink?: boolean;
};

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * No top header / nav. Only primary action buttons that scroll to sections.
 */
export default function WeddingActionBar({
  accent = "#C9A962",
  text = "#FFFFFF",
  surface = "rgba(20,16,12,0.92)",
  border = "rgba(255,255,255,0.18)",
}: Props) {
  return (
    <div
      className="ww-action-bar fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 pointer-events-none"
      dir="rtl"
    >
      <div
        className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border px-3 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl"
        style={{ background: surface, borderColor: border }}
      >
        <button
          type="button"
          onClick={() => scrollToId("rsvp")}
          className="rounded-full px-5 py-2.5 text-sm font-black transition hover:opacity-95"
          style={{ background: accent, color: text }}
        >
          אישור הגעה
        </button>
        <button
          type="button"
          onClick={() => scrollToId("transportation")}
          className="rounded-full border px-5 py-2.5 text-sm font-black transition hover:opacity-95"
          style={{ borderColor: accent, color: accent, background: "transparent" }}
        >
          הזמנת הסעה
        </button>
      </div>
    </div>
  );
}
