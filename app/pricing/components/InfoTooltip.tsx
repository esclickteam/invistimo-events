"use client";

import { useId, useState, type ReactNode } from "react";

type InfoTooltipProps = {
  label: string;
  children: ReactNode;
};

export default function InfoTooltip({ label, children }: InfoTooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#D7B98D] bg-[#FFF8EE] text-[11px] font-black text-[#A86F2B] outline-none transition hover:border-[#C9A46A] focus-visible:ring-2 focus-visible:ring-[#D8B16A]/45"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        aria-label={`הסבר: ${label}`}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        ?
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="pricing-tooltip-panel absolute left-1/2 top-[calc(100%+0.45rem)] z-30 w-64 -translate-x-1/2 rounded-2xl border border-[#E5D3B8] bg-[#FFFDF9] px-3.5 py-3 text-right text-xs font-medium leading-5 text-[#5A3E25] shadow-[0_16px_36px_rgba(91,64,35,0.16)]"
        >
          <span className="mb-1 block text-[11px] font-black text-[#8A4E19]">{label}</span>
          {children}
        </span>
      ) : null}
    </span>
  );
}
