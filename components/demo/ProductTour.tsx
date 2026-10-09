"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DEMO_TOUR_STEPS,
  DEMO_TOUR_TOPICS,
  tourTopicIndex,
  type DemoTourStep,
} from "@/lib/demo/interactive/tour";

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
  return true;
}

function findTourTarget(selector: string) {
  const nodes = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  return nodes.find(isTourTargetVisible) || null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function menuIsOpen() {
  return document.documentElement.dataset.demoMenu === "open";
}

function focusSelectorFor(step: DemoTourStep) {
  if (findTourTarget(step.selector)) return step.selector;
  const wantsNav =
    step.selector.includes("nav-") || step.selector.includes("customer-nav");
  if (wantsNav && window.innerWidth < 1024 && !menuIsOpen()) {
    return "[data-tour='open-menu']";
  }
  const wantsSeatingMenu =
    step.selector.includes("add-table") || step.selector.includes("seating-back");
  if (
    wantsSeatingMenu &&
    window.innerWidth < 768 &&
    findTourTarget("[data-tour='seating-actions']")
  ) {
    return "[data-tour='seating-actions']";
  }
  return step.selector;
}

function scrollTargetIntoCenter(node: HTMLElement) {
  node.style.scrollMargin = "96px";
  let parent = node.parentElement;
  const containers: HTMLElement[] = [];
  while (parent) {
    const style = window.getComputedStyle(parent);
    const scrollable = /(auto|scroll|overlay)/.test(
      `${style.overflowY} ${style.overflowX} ${style.overflow}`
    );
    if (
      scrollable &&
      (parent.scrollHeight > parent.clientHeight + 12 ||
        parent.scrollWidth > parent.clientWidth + 12)
    ) {
      containers.push(parent);
    }
    parent = parent.parentElement;
  }
  for (const container of containers) {
    const cRect = container.getBoundingClientRect();
    const nRect = node.getBoundingClientRect();
    const top =
      container.scrollTop +
      (nRect.top - cRect.top) -
      cRect.height / 2 +
      nRect.height / 2;
    container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }
  node.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
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
  const [missing, setMissing] = useState(false);
  const [focusSelector, setFocusSelector] = useState(step?.selector || "");

  const go = (next: number) => {
    if (next >= DEMO_TOUR_STEPS.length) {
      onFinish();
      return;
    }
    onStep(Math.max(0, next));
  };

  useEffect(() => {
    if (!step) return;
    setWaiting(step.advance !== "continue");
    setSuccess("");
    setLiftDim(false);
    setMissing(false);
    setFocusSelector(step.selector);
    document.documentElement.dataset.demoTour = step.id;
    window.dispatchEvent(
      new CustomEvent("invistimo:demo-tour-step", {
        detail: { id: step.id, selector: step.selector, topic: step.topic },
      })
    );
  }, [step]);

  useEffect(() => {
    if (!step || step.stay || !step.route || tourRouteMatches(pathname, step.route)) return;
    router.push(step.route);
  }, [step, pathname, router]);

  useEffect(() => {
    if (!success || !step || step.advance === "continue") return;
    const timer = window.setTimeout(() => go(stepIndex + 1), 900);
    return () => window.clearTimeout(timer);
  }, [success, step, stepIndex]);

  useEffect(() => {
    if (!step) return;
    let frame = 0;
    let scrolledKey = "";
    const started = Date.now();

    const measure = () => {
      const nextFocus = focusSelectorFor(step);
      setFocusSelector(nextFocus);
      const node = findTourTarget(nextFocus);
      if (!node) {
        setRect(null);
        if (Date.now() - started > 4000) setMissing(true);
        return;
      }
      setMissing(false);
      const box = node.getBoundingClientRect();
      const centered =
        box.top >= 64 &&
        box.bottom <= window.innerHeight - 24 &&
        box.height < window.innerHeight * 0.85;
      const key = `${step.id}:${nextFocus}:${Math.round(box.top / 48)}`;
      if (!centered && scrolledKey !== key && !liftDim) {
        scrolledKey = key;
        scrollTargetIntoCenter(node);
      }
      const fresh = node.getBoundingClientRect();
      setRect({
        top: fresh.top,
        left: fresh.left,
        width: fresh.width,
        height: fresh.height,
      });
    };

    frame = window.requestAnimationFrame(measure);
    const timer = window.setInterval(measure, 350);
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

    const complete = (label: string) => {
      setLiftDim(false);
      setWaiting(false);
      setSuccess(label);
    };

    const onAction = (event: Event) => {
      const action = String((event as CustomEvent).detail?.action || "");
      if (step.advance === "action" && action === step.action) {
        complete("הפעולה נשמרה בדמו");
      }
    };

    const onClick = (event: MouseEvent) => {
      const node = findTourTarget(focusSelector || step.selector);
      const hit = Boolean(
        node && (node === event.target || node.contains(event.target as Node))
      );
      if (!hit) return;
      const interim = Boolean(focusSelector) && focusSelector !== step.selector;
      const real = findTourTarget(step.selector);
      const hitReal = Boolean(
        real && (real === event.target || real.contains(event.target as Node))
      );
      if (interim && !hitReal) return;
      setLiftDim(true);
      if (step.advance === "click") complete("מצוין");
    };

    const onInput = (event: Event) => {
      if (step.advance !== "input") return;
      const node = findTourTarget(step.selector);
      const target = event.target as Node | null;
      if (!node || !target || (node !== target && !node.contains(target))) return;
      complete("עודכן");
    };

    window.addEventListener("invistimo:demo-action", onAction);
    document.addEventListener("click", onClick, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    return () => {
      window.removeEventListener("invistimo:demo-action", onAction);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
    };
  }, [step, focusSelector]);

  if (!step) return null;

  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  const openingMenu = Boolean(focusSelector) && focusSelector !== step.selector;
  const bubble = liftDim ? parkedBubble(mobile) : placeBubble(rect, mobile);
  const topicAt = tourTopicIndex(step.topic);
  const topic = DEMO_TOUR_TOPICS[topicAt];
  const topicSteps = DEMO_TOUR_STEPS.filter((item) => item.topic === step.topic);
  const topicStepAt = topicSteps.findIndex((item) => item.id === step.id);

  return (
    <div className="pointer-events-none fixed inset-0 z-[10060]" dir="rtl">
      {!liftDim && (
        <div
          className="pointer-events-none absolute inset-0 bg-[#1E1B2E]/45"
          style={{ clipPath: hole(rect) }}
        />
      )}
      {rect && !liftDim && (
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
        className="pointer-events-auto absolute max-h-[42vh] overflow-y-auto rounded-3xl border border-[#E7D3B0] bg-[#FFFDF8] p-4 text-right shadow-[0_18px_50px_rgba(30,27,46,0.2)]"
        style={bubble}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-black text-[#9A6E24]">
            {topic?.label || "הדרכה"} · {topicStepAt + 1}/{topicSteps.length}
          </p>
          <p className="text-[11px] font-bold text-[#7A6A5E]">
            נושא {topicAt + 1} מתוך {DEMO_TOUR_TOPICS.length}
          </p>
        </div>
        <div className="mb-3 flex gap-1">
          {DEMO_TOUR_TOPICS.map((item, index) => (
            <span
              key={item.id}
              title={item.label}
              className={`h-1.5 flex-1 rounded-full ${
                index < topicAt
                  ? "bg-[#8B6220]"
                  : index === topicAt
                    ? "bg-[#E7C98D]"
                    : "bg-[#F3E7D4]"
              }`}
            />
          ))}
        </div>
        <h3 className="text-lg font-black text-[#2B2118]">{step.title}</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#5C4E43]">{step.body}</p>
        <p className="mt-1 text-[11px] font-bold text-[#8A7A68]">תלמדו: {step.learn}</p>
        {openingMenu && (
          <p className="mt-2 text-xs font-black text-[#8B6220]">
            פתחו את התפריט. אחר כך נסמן את הפריט עצמו.
          </p>
        )}
        {waiting && step.advance !== "continue" && !missing && (
          <p className="mt-2 text-xs font-black text-[#8B6220]">
            בצעו את הפעולה המסומנת. אחרי הצלחה נעבור הלאה.
          </p>
        )}
        {missing && (
          <p className="mt-2 text-xs font-black text-[#8B3A2A]">
            לא מצאנו את הכפתור במסך הזה. אפשר לדלג לשלב הבא בלי לאבד את שאר הסיור.
          </p>
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
          {step.advance === "continue" || missing ? (
            <TourButton primary onClick={() => go(stepIndex + 1)}>
              {stepIndex === DEMO_TOUR_STEPS.length - 1 ? "סיום" : "המשך"}
            </TourButton>
          ) : null}
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
  const width = mobile ? Math.min(window.innerWidth - 24, 420) : 380;
  return { top: 76, left: 12, width, right: "auto" };
}

function placeBubble(rect: Rect | null, mobile: boolean): CSSProperties {
  const width = mobile ? Math.min(window.innerWidth - 24, 420) : 380;
  if (!rect || typeof window === "undefined") {
    return parkedBubble(mobile);
  }
  const gap = 16;
  const estimated = mobile ? 220 : 250;
  const rectBottom = rect.top + rect.height;
  const rectRight = rect.left + rect.width;
  const spaceBelow = window.innerHeight - rectBottom;
  const spaceAbove = rect.top;
  let top = spaceBelow > estimated + gap || spaceBelow >= spaceAbove
    ? rectBottom + gap
    : Math.max(72, rect.top - estimated - gap);
  if (top + estimated > window.innerHeight - 12) {
    top = Math.max(72, window.innerHeight - estimated - 12);
  }
  let left = clamp(
    rect.left + rect.width / 2 - width / 2,
    12,
    window.innerWidth - width - 12
  );
  const overlaps =
    left < rectRight + 8 &&
    left + width > rect.left - 8 &&
    top < rectBottom + 8 &&
    top + estimated > rect.top - 8;
  if (overlaps) {
    const sideLeft = rect.left > window.innerWidth / 2 ? 12 : window.innerWidth - width - 12;
    const sideTop = clamp(rect.top, 72, window.innerHeight - estimated - 12);
    return { top: sideTop, left: sideLeft, width, right: "auto" };
  }
  return { top, left, width, right: "auto" };
}

export function stepByIndex(index: number): DemoTourStep | undefined {
  return DEMO_TOUR_STEPS[index];
}
