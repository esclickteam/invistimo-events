"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
    findTourTarget("[data-tour='seating-actions']") &&
    !findTourTarget(step.selector)
  ) {
    return "[data-tour='seating-actions']";
  }
  const wantsGuestList = /seating-guest|seating-move|seating-capacity|seating-unseated/.test(
    step.selector
  );
  if (wantsGuestList && window.innerWidth < 768) {
    const guest = findTourTarget(step.selector);
    const box = guest?.getBoundingClientRect();
    const offscreen =
      !guest ||
      !box ||
      box.left > window.innerWidth - 8 ||
      box.right < 8;
    if (offscreen && findTourTarget("[data-tour='seating-guests']")) {
      return "[data-tour='seating-guests']";
    }
  }
  return step.selector;
}

function scrollsOn(style: CSSStyleDeclaration, axis: "x" | "y") {
  const value = axis === "y" ? style.overflowY : style.overflowX;
  return /(auto|scroll|overlay)/.test(value);
}

function scrollTargetFullyIntoView(node: HTMLElement) {
  const marginTop = 96;
  const marginBottom = 28;
  let parent: HTMLElement | null = node.parentElement;
  const containers: HTMLElement[] = [];
  while (parent) {
    const style = window.getComputedStyle(parent);
    const scrollY = scrollsOn(style, "y") && parent.scrollHeight > parent.clientHeight + 8;
    const scrollX = scrollsOn(style, "x") && parent.scrollWidth > parent.clientWidth + 8;
    if (scrollY || scrollX) containers.push(parent);
    parent = parent.parentElement;
  }

  for (const container of containers) {
    const style = window.getComputedStyle(container);
    const cRect = container.getBoundingClientRect();
    const nRect = node.getBoundingClientRect();
    if (scrollsOn(style, "y")) {
      const roomTop = Math.max(cRect.top, marginTop);
      const roomBottom = Math.min(cRect.bottom, window.innerHeight - marginBottom);
      const room = roomBottom - roomTop;
      let delta = 0;
      if (nRect.height <= room) {
        if (nRect.top < roomTop) delta = nRect.top - roomTop;
        else if (nRect.bottom > roomBottom) delta = nRect.bottom - roomBottom;
      } else if (nRect.top < roomTop || nRect.top > roomTop + 8) {
        delta = nRect.top - roomTop;
      }
      if (Math.abs(delta) > 2) {
        const left = container.scrollLeft;
        container.scrollTop += delta;
        if (container.scrollLeft !== left) container.scrollLeft = left;
      }
    }
    if (scrollsOn(style, "x")) {
      const n2 = node.getBoundingClientRect();
      const roomLeft = Math.max(cRect.left, 12);
      const roomRight = Math.min(cRect.right, window.innerWidth - 12);
      if (n2.left < roomLeft - 1 || n2.right > roomRight + 1) {
        const delta = n2.left < roomLeft ? n2.left - roomLeft : n2.right - roomRight;
        const before = n2.left;
        const start = container.scrollLeft;
        container.scrollLeft = start + delta;
        const moved = node.getBoundingClientRect().left - before;
        if (Math.abs(moved) < 2) {
          container.scrollLeft = start - delta;
          if (Math.abs(node.getBoundingClientRect().left - before) < 2) {
            container.scrollLeft = start;
          }
        }
      }
    }
  }
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
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubbleHeight, setBubbleHeight] = useState(240);
  const [obstacles, setObstacles] = useState<Rect[]>([]);

  const go = (next: number) => {
    if (next >= DEMO_TOUR_STEPS.length) {
      onFinish();
      return;
    }
    onStep(Math.max(0, next));
  };

  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.demoTour;
    };
  }, []);

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
    if (success) return;
    router.push(step.route);
  }, [step, pathname, router, success]);

  useEffect(() => {
    if (!success || !step || step.advance === "continue") return;
    const timer = window.setTimeout(() => go(stepIndex + 1), 900);
    return () => window.clearTimeout(timer);
  }, [success, step, stepIndex]);

  useEffect(() => {
    if (!step) return;
    let frame = 0;
    const started = Date.now();

    const measure = () => {
      const nextFocus = focusSelectorFor(step);
      const node = findTourTarget(nextFocus);
      if (!node) {
        setRect((current) => (current === null ? current : null));
        if (Date.now() - started > 4000) setMissing(true);
        return;
      }
      setMissing(false);
      setFocusSelector((current) => (current === nextFocus ? current : nextFocus));
      const box = node.getBoundingClientRect();
      const fits = box.height <= window.innerHeight - 120;
      const fullyVisible =
        box.top >= 72 &&
        box.left >= 0 &&
        box.right <= window.innerWidth - 4 &&
        (fits ? box.bottom <= window.innerHeight - 16 : box.top <= 96);
      if (!fullyVisible && !liftDim) scrollTargetFullyIntoView(node);
      const fresh = node.getBoundingClientRect();
      const nextRect = {
        top: fresh.top,
        left: fresh.left,
        width: fresh.width,
        height: fresh.height,
      };
      setRect((current) =>
        current &&
        Math.abs(current.top - nextRect.top) < 2 &&
        Math.abs(current.left - nextRect.left) < 2 &&
        Math.abs(current.width - nextRect.width) < 2 &&
        Math.abs(current.height - nextRect.height) < 2
          ? current
          : nextRect
      );
      setObstacles((current) => {
        const next = openPanelRects(node);
        const same =
          current.length === next.length &&
          current.every(
            (item, index) =>
              Math.abs(item.top - next[index].top) < 2 &&
              Math.abs(item.left - next[index].left) < 2
          );
        return same ? current : next;
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

  useEffect(() => {
    const node = bubbleRef.current;
    if (!node) return;
    const next = node.offsetHeight;
    if (next > 0 && Math.abs(next - bubbleHeight) > 12) setBubbleHeight(next);
  });

  if (!step) return null;

  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  const openingMenu = Boolean(focusSelector) && focusSelector !== step.selector;
  const bubble = liftDim
    ? parkedBubble(mobile)
    : placeBubble(rect, mobile, bubbleHeight, obstacles);
  const topicAt = tourTopicIndex(step.topic);
  const topic = DEMO_TOUR_TOPICS[topicAt];
  const topicSteps = DEMO_TOUR_STEPS.filter((item) => item.topic === step.topic);
  const topicStepAt = topicSteps.findIndex((item) => item.id === step.id);

  return (
    <div className="pointer-events-none fixed inset-0 z-[10060] overflow-hidden" dir="rtl">
      {rect && !liftDim && (
        <div
          className="pointer-events-none absolute rounded-2xl border-2 border-[#C9A45C] shadow-[0_0_0_4px_rgba(255,253,248,0.95)]"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}

      <div
        ref={bubbleRef}
        className="pointer-events-auto absolute max-h-[38vh] overflow-y-auto rounded-3xl border border-[#E7D3B0] bg-[#FFFDF8] p-4 text-right shadow-[0_18px_50px_rgba(30,27,46,0.2)]"
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

function parkedBubble(mobile: boolean): CSSProperties {
  const width = mobile ? Math.min(window.innerWidth - 24, 420) : 380;
  return { top: 76, left: 12, width, right: "auto" };
}

function overlapArea(a: Rect, b: Rect) {
  const width = Math.max(
    0,
    Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)
  );
  const height = Math.max(
    0,
    Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top)
  );
  return width * height;
}

function openPanelRects(target: HTMLElement): Rect[] {
  const panels: Rect[] = [];
  const nodes = document.querySelectorAll("[class*='fixed'], [class*='absolute']");
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement) || node === target) return;
    const style = window.getComputedStyle(node);
    if (style.position !== "fixed" && style.position !== "absolute") return;
    const z = Number(style.zIndex);
    if (!Number.isFinite(z) || z < 40 || z >= 10060) return;
    const box = node.getBoundingClientRect();
    if (box.width < 180 || box.height < 100) return;
    if (box.width > window.innerWidth * 0.97 && box.height > window.innerHeight * 0.97) return;
    panels.push({
      top: box.top,
      left: box.left,
      width: box.width,
      height: box.height,
    });
  });
  return panels.slice(0, 4);
}

function placeBubble(
  rect: Rect | null,
  mobile: boolean,
  bubbleHeight: number,
  obstacles: Rect[] = []
): CSSProperties {
  const width = mobile ? Math.min(window.innerWidth - 24, 420) : 360;
  const height = Math.max(bubbleHeight || 0, Math.round(window.innerHeight * 0.38));
  if (!rect || typeof window === "undefined") {
    return parkedBubble(mobile);
  }
  const gap = 16;
  const maxTop = Math.max(12, window.innerHeight - height - 12);
  const maxLeft = Math.max(12, window.innerWidth - width - 12);
  const candidates = [
    { top: rect.top + rect.height + gap, left: rect.left },
    { top: rect.top - height - gap, left: rect.left },
    { top: 12, left: 12 },
    { top: 12, left: maxLeft },
    { top: maxTop, left: 12 },
    { top: maxTop, left: maxLeft },
  ].map((item) => ({
    top: clamp(item.top, 12, maxTop),
    left: clamp(item.left, 12, maxLeft),
  }));
  const ranked = candidates
    .map((item) => {
      const box = { top: item.top, left: item.left, width, height };
      const targetOverlap = overlapArea(box, rect);
      const panelOverlap = obstacles.reduce((sum, panel) => sum + overlapArea(box, panel), 0);
      return { ...item, score: targetOverlap * 8 + panelOverlap };
    })
    .sort((a, b) => a.score - b.score);
  const best = ranked[0];
  return { top: best.top, left: best.left, width, right: "auto" };
}

export function stepByIndex(index: number): DemoTourStep | undefined {
  return DEMO_TOUR_STEPS[index];
}
