"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DEMO_TOUR_STEPS, type DemoTourStep } from "@/lib/demo/interactive/tour";

type Rect = { top: number; left: number; width: number; height: number };

type Props = {
  stepIndex: number;
  onStep: (index: number) => void;
  onFinish: () => void;
  onSkipTour: () => void;
};

function tourRouteMatches(pathname: string, route: string) {
  if (route === "/try/dashboard") return pathname === "/try/dashboard";
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isTourTargetVisible(node: HTMLElement) {
  const box = node.getBoundingClientRect();
  if (box.width < 2 || box.height < 2) return false;
  let current: HTMLElement | null = node;
  while (current) {
    const style = window.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") return false;
    current = current.parentElement;
  }
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  return box.bottom > 0 && box.right > 0 && box.top < viewH && box.left < viewW;
}

function findTourTarget(selector: string) {
  const nodes = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  return nodes.find(isTourTargetVisible) || null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function ProductTour({
  stepIndex,
  onStep,
  onFinish,
  onSkipTour,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const step = DEMO_TOUR_STEPS[stepIndex];
  const [rect, setRect] = useState<Rect | null>(null);
  const [success, setSuccess] = useState("");
  const [waiting, setWaiting] = useState(step?.advance !== "continue");
  const [liftDim, setLiftDim] = useState(false);

  useEffect(() => {
    if (!step) return;
    setWaiting(step.advance !== "continue");
    setSuccess("");
    setLiftDim(false);
    document.documentElement.dataset.demoTour = step.id;
    window.dispatchEvent(
      new CustomEvent("invistimo:demo-tour-step", { detail: { id: step.id } })
    );
    if (step.route && !tourRouteMatches(pathname, step.route)) {
      router.push(step.route);
    }
  }, [step, pathname, router]);

  useEffect(() => {
    if (!step) return;
    let frame = 0;

    const measure = () => {
      const node = findTourTarget(step.selector);
      if (!node) {
        setRect(null);
        return;
      }
      const box = node.getBoundingClientRect();
      const inView = box.top >= 72 && box.bottom <= window.innerHeight - 12;
      if (!inView && !liftDim) {
        node.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
      setRect({
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
      });
    };

    frame = window.requestAnimationFrame(measure);
    const timer = window.setInterval(measure, 400);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, pathname, liftDim]);

  useEffect(() => {
    if (!step) return;

    const onAction = (event: Event) => {
      const action = String((event as CustomEvent).detail?.action || "");
      if (step.advance === "action" && action === step.action) {
        setWaiting(false);
        setSuccess("הפעולה נשמרה בדמו");
      }
    };

    const onClick = (event: MouseEvent) => {
      const node = findTourTarget(step.selector);
      const hit = Boolean(
        node && (node === event.target || node.contains(event.target as Node))
      );
      if (!hit) return;
      setLiftDim(true);
      if (step.advance === "click") {
        setWaiting(false);
        setSuccess("מצוין");
      }
    };

    window.addEventListener("invistimo:demo-action", onAction);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("invistimo:demo-action", onAction);
      document.removeEventListener("click", onClick, true);
    };
  }, [step, rect]);

  if (!step) return null;

  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  const bubble = liftDim
    ? parkedBubble(mobile)
    : placeBubble(rect, mobile);

  const go = (next: number) => {
    if (next >= DEMO_TOUR_STEPS.length) {
      onFinish();
      return;
    }
    onStep(Math.max(0, next));
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]" dir="rtl">
      {!liftDim && (
        <div
          className="pointer-events-none absolute inset-0 bg-[#1E1B2E]/45"
          style={{ clipPath: hole(rect) }}
        />
      )}
      {rect && (
        <>
          <div
            className="pointer-events-none absolute rounded-2xl border-2 border-white shadow-[0_0_0_6px_rgba(201,164,92,0.45)]"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
            }}
          />
          <div
            className="pointer-events-none absolute h-3 w-3 rounded-full bg-[#C9A45C]"
            style={{
              top: Math.max(8, rect.top - 14),
              left: rect.left + rect.width / 2 - 6,
            }}
          />
        </>
      )}

      <div
        className="pointer-events-auto absolute max-h-[46vh] overflow-y-auto rounded-3xl border border-[#E7D3B0] bg-[#FFFDF8] p-4 text-right shadow-[0_18px_50px_rgba(30,27,46,0.2)]"
        style={bubble}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-black text-[#9A6E24]">
            שלב {stepIndex + 1} מתוך {DEMO_TOUR_STEPS.length}
          </p>
          <p className="text-[11px] font-bold text-[#7A6A5E]">תלמדו: {step.learn}</p>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#F3E7D4]">
          <div
            className="h-full rounded-full bg-gradient-to-l from-[#B8862D] to-[#E7C98D] transition-all"
            style={{ width: `${((stepIndex + (waiting ? 0 : 0.35)) / DEMO_TOUR_STEPS.length) * 100}%` }}
          />
        </div>
        <h3 className="text-lg font-black text-[#2B2118]">{step.title}</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#5C4E43]">{step.body}</p>
        {waiting && step.advance !== "continue" && (
          <p className="mt-2 text-xs font-black text-[#8B6220]">בצעו את הפעולה המסומנת כדי להמשיך.</p>
        )}
        {success && (
          <p className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            {success}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <TourButton onClick={() => go(stepIndex - 1)} disabled={stepIndex === 0}>
            הקודם
          </TourButton>
          <TourButton onClick={() => go(stepIndex + 1)}>דלג</TourButton>
          <TourButton
            primary
            disabled={waiting}
            onClick={() => go(stepIndex + 1)}
          >
            {stepIndex === DEMO_TOUR_STEPS.length - 1 ? "סיום" : "המשך"}
          </TourButton>
          <TourButton onClick={onSkipTour}>סיים הדרכה</TourButton>
        </div>
      </div>
    </div>
  );
}

function TourButton({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
        primary
          ? "bg-[#2B2118] text-white"
          : "border border-[#E7D3B0] bg-white text-[#4A3A2A]"
      }`}
    >
      {children}
    </button>
  );
}

function hole(rect: Rect | null) {
  if (!rect) return "none";
  const pad = 8;
  const x = rect.left - pad;
  const y = rect.top - pad;
  const w = rect.width + pad * 2;
  const h = rect.height + pad * 2;
  return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${x}px ${y}px, ${x + w}px ${y}px, ${x + w}px ${y + h}px, ${x}px ${y + h}px, ${x}px ${y}px)`;
}

function parkedBubble(mobile: boolean): CSSProperties {
  const width = mobile ? Math.min(window.innerWidth - 24, 420) : 360;
  return { top: 76, left: 12, width, right: "auto" };
}

function placeBubble(rect: Rect | null, mobile: boolean): CSSProperties {
  const width = mobile ? Math.min(window.innerWidth - 24, 420) : 360;
  if (!rect || typeof window === "undefined") {
    return parkedBubble(mobile);
  }
  const gap = 16;
  const estimated = 240;
  const below = rect.bottom + gap;
  const above = rect.top - estimated - gap;
  const fitsBelow = below + estimated < window.innerHeight - 72;
  const fitsAbove = above > 64;
  let top = fitsBelow ? below : fitsAbove ? above : 76;
  let left = clamp(
    rect.left + rect.width / 2 - width / 2,
    12,
    window.innerWidth - width - 12
  );
  const overlaps =
    left < rect.right + 8 &&
    left + width > rect.left - 8 &&
    top < rect.bottom + 8 &&
    top + estimated > rect.top - 8;
  if (overlaps) {
    left = rect.left > window.innerWidth / 2 ? 12 : window.innerWidth - width - 12;
  }
  return { top, left, width, right: "auto" };
}

export function stepByIndex(index: number): DemoTourStep | undefined {
  return DEMO_TOUR_STEPS[index];
}
