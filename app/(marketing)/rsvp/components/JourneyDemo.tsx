"use client";

import { useMemo, useRef, useState } from "react";
import { JOURNEY_STEPS, JOURNEY_VIDEO } from "../content";
import MarketingVideo from "./MarketingVideo";

function stepIndexForTime(time: number) {
  const durationEnd = JOURNEY_STEPS[JOURNEY_STEPS.length - 1].endSec;
  const t = ((time % durationEnd) + durationEnd) % durationEnd;
  const idx = JOURNEY_STEPS.findIndex((step) => t >= step.startSec && t < step.endSec);
  return idx < 0 ? JOURNEY_STEPS.length - 1 : idx;
}

export default function JourneyDemo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [active, setActive] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const step = JOURNEY_STEPS[active];
  const progress = useMemo(() => {
    const span = step.endSec - step.startSec || 1;
    const local = Math.min(1, Math.max(0, (currentTime - step.startSec) / span));
    return (active + local) / JOURNEY_STEPS.length;
  }, [active, step, currentTime]);

  const sync = (time: number) => {
    setCurrentTime(time);
    const next = stepIndexForTime(time);
    setActive((prev) => (prev === next ? prev : next));
  };

  return (
    <section
      id="rsvp-journey"
      dir="rtl"
      className="relative isolate scroll-mt-24 px-5 py-20 md:px-8 md:py-28"
      aria-labelledby="rsvp-journey-heading"
    >
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#2C211B_0%,#3A2B22_42%,#241C17_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(199,165,107,0.18),transparent_42%),radial-gradient(circle_at_90%_80%,rgba(255,248,232,0.08),transparent_40%)]" />

      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold tracking-[0.18em] text-[#E8D1A5]">מסע האורח</p>
          <h2
            id="rsvp-journey-heading"
            className="mt-4 font-[family-name:var(--font-rsvp-display)] text-3xl font-bold leading-tight text-[#FBF6EE] md:text-5xl"
          >
            מהודעת WhatsApp ועד אישור ההגעה
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#D9CBB8] md:text-lg">
            הסרטון מציג את התהליך המלא מצד האורח — ואז איך התשובה מופיעה אצלכם במערכת.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-12">
          <div className="order-2 lg:order-1">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md md:p-7">
              <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
                <div
                  className="h-full rounded-full bg-gradient-to-l from-[#C7A56B] to-[#E8D1A5] transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.max(6, progress * 100)}%` }}
                />
              </div>

              <div className="hidden space-y-3 md:block" role="list" aria-label="שלבי התהליך">
                {JOURNEY_STEPS.map((item, index) => {
                  const isActive = index === active;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="listitem"
                      onClick={() => {
                        const el = videoRef.current;
                        if (!el) return;
                        el.currentTime = item.startSec + 0.05;
                        sync(el.currentTime);
                      }}
                      className={`w-full rounded-2xl border px-4 py-4 text-right transition ${
                        isActive
                          ? "border-[#C7A56B] bg-[#C7A56B]/15 shadow-[0_12px_35px_rgba(199,165,107,0.18)]"
                          : "border-white/10 bg-transparent hover:border-white/25"
                      }`}
                      aria-current={isActive ? "step" : undefined}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 text-sm font-black ${
                            isActive ? "text-[#E8D1A5]" : "text-white/40"
                          }`}
                        >
                          {item.id}
                        </span>
                        <div>
                          <p
                            className={`text-base font-bold leading-7 ${
                              isActive ? "text-[#FBF6EE]" : "text-white/70"
                            }`}
                          >
                            {item.title}
                          </p>
                          <p
                            className={`mt-1 text-sm leading-6 transition-opacity ${
                              isActive ? "text-[#D9CBB8] opacity-100" : "opacity-0 h-0 overflow-hidden"
                            }`}
                          >
                            {item.body}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Compact mobile active caption */}
              <div className="md:hidden" aria-live="polite">
                <p className="text-sm font-black text-[#E8D1A5]">{step.id}</p>
                <p className="mt-2 text-xl font-bold text-[#FBF6EE]">{step.title}</p>
                <p className="mt-2 text-sm leading-7 text-[#D9CBB8]">{step.body}</p>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="שלבים">
                  {JOURNEY_STEPS.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={index === active}
                      onClick={() => {
                        const el = videoRef.current;
                        if (!el) return;
                        el.currentTime = item.startSec + 0.05;
                        sync(el.currentTime);
                      }}
                      className={`min-h-10 shrink-0 rounded-full px-3 text-xs font-bold ${
                        index === active
                          ? "bg-[#C7A56B] text-[#2C211B]"
                          : "bg-white/10 text-white/70"
                      }`}
                    >
                      {item.id}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 mx-auto w-full max-w-[420px] lg:order-2 lg:mx-0 lg:max-w-none">
            <div className="relative mx-auto max-w-[380px]">
              <div className="absolute -inset-6 rounded-[46px] bg-[radial-gradient(circle_at_top,rgba(199,165,107,0.35),transparent_60%)] blur-2xl" />
              <div className="relative rounded-[36px] border border-white/15 bg-gradient-to-br from-[#4A3A2E] via-[#2C211B] to-[#1A1410] p-3 shadow-[0_40px_90px_rgba(0,0,0,0.45)]">
                <div className="overflow-hidden rounded-[28px] border border-white/10">
                  <MarketingVideo
                    src={JOURNEY_VIDEO.src}
                    poster={JOURNEY_VIDEO.poster}
                    title={JOURNEY_VIDEO.title}
                    eager
                    videoRef={videoRef}
                    onTimeUpdate={sync}
                    onSeeked={sync}
                    className="aspect-[420/760]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
