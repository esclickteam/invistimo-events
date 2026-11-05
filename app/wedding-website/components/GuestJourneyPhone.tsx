"use client";

import { useRef, useState } from "react";
import WeddingLiveFrame from "./WeddingLiveFrame";

const STEPS = [
  { id: "hero", title: "האורח מקבל קישור לאתר החתונה", target: "" },
  { id: "open", title: "פותח את האתר בטלפון", target: "" },
  { id: "details", title: "צופה בפרטי האירוע, בתמונות ובלוח הזמנים", target: "gallery" },
  { id: "nav", title: "לוחץ על ניווט", target: "location" },
  { id: "rsvp", title: "מאשר הגעה דרך דמו", target: "rsvp" },
] as const;

type Props = {
  templateId: string;
  name: string;
};

function showStep(frame: HTMLIFrameElement | null, index: number) {
  const target = STEPS[index]?.target;
  const doc = frame?.contentDocument;
  const win = frame?.contentWindow;
  if (!doc || !win) return;
  if (!target) {
    win.scrollTo({ top: 0, behavior: "auto" });
    return;
  }
  doc.getElementById(target)?.scrollIntoView({ block: "start", behavior: "auto" });
}

export default function GuestJourneyPhone({ templateId, name }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [active, setActive] = useState(0);

  const go = (index: number) => {
    setActive(index);
    showStep(frame.current, index);
  };

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_280px]">
      <ol className="space-y-3">
        {STEPS.map((step, index) => {
          const on = index === active;
          return (
            <li key={step.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => go(index)}
                className={`flex w-full min-h-12 items-center gap-4 rounded-none px-4 py-3 text-right transition ${
                  on
                    ? "bg-[#42182F] !text-[#FFF8F0]"
                    : "border border-[#C5A582] bg-[#FFF8F0] !text-[#42182F] hover:bg-[#F5EEE8]"
                }`}
              >
                <span className={`font-['Cormorant_Garamond'] text-2xl ${on ? "text-[#C5A582]" : "text-[#B57591]"}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-base font-bold leading-7">{step.title}</span>
              </button>
            </li>
          );
        })}
        <p className="pt-2 text-sm leading-7 text-[#6B5360]">
          הטלפון מציג את {name}. הגלילה והדמו רצים כאן, בלי לשלוח הודעה.
        </p>
      </ol>

      <div className="mx-auto w-full max-w-[280px]">
        <div className="overflow-hidden rounded-[40px] border-[8px] border-[#42182F] bg-[#2A0F1D] shadow-[0_24px_50px_rgba(66,24,47,0.2)]">
          <div className="relative">
            <WeddingLiveFrame
              templateId={templateId}
              name={name}
              mode="phone"
              poster={`/marketing/wedding-website/previews/${templateId}-mobile.jpg`}
              frameRef={frame}
              onLoad={() => showStep(frame.current, active)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
