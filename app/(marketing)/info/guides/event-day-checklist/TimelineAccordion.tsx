"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { TIMELINE } from "./checklistData";

export default function TimelineAccordion() {
  const [openId, setOpenId] = useState<string>(TIMELINE[0]?.id ?? "");

  return (
    <div className="space-y-3">
      {TIMELINE.map((period, index) => {
        const open = openId === period.id;
        return (
          <div
            key={period.id}
            className="overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_10px_28px_rgba(58,39,20,0.05)]"
          >
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`timeline-panel-${period.id}`}
              id={`timeline-btn-${period.id}`}
              onClick={() => setOpenId(open ? "" : period.id)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-right transition hover:bg-[#FFF8EA]"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C7A56B] to-[#8A642E] text-sm font-black text-white">
                  {index + 1}
                </span>
                <span className="text-base font-black text-[#2C241C] md:text-lg">{period.title}</span>
              </span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-[#8A642E] transition motion-safe:duration-200 ${
                  open ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>
            <div
              id={`timeline-panel-${period.id}`}
              role="region"
              aria-labelledby={`timeline-btn-${period.id}`}
              hidden={!open}
              className={open ? "border-t border-[#EADDC8] px-5 pb-5 pt-3" : undefined}
            >
              {open ? (
                <ul className="space-y-2.5">
                  {period.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 text-sm leading-7 text-[#5C4A3A] md:text-base"
                    >
                      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C7A56B]" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        );
      })}
      <p className="text-sm leading-7 text-[#7A6042]">
        כל המועדים הם המלצות כלליות. ההסכם עם האולם והספקים קובע את המועדים המחייבים.
      </p>
    </div>
  );
}
