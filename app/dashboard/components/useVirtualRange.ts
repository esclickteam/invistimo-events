"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { computeVirtualRange } from "@/lib/dashboard/desktopPerf";

export function useVirtualRange(
  count: number,
  scrollElement: HTMLElement | null,
  estimate: number,
  resetKey = ""
) {
  const heightsRef = useRef<number[]>([]);
  const rangeRef = useRef({ start: 0, end: 0, paddingTop: 0, paddingBottom: 0 });
  const measureFrame = useRef(0);
  const [metrics, setMetrics] = useState({ scrollTop: 0, viewport: 640 });
  const [heightVersion, setHeightVersion] = useState(0);

  useEffect(() => {
    heightsRef.current = [];
    setHeightVersion((version) => version + 1);
  }, [resetKey]);

  useEffect(
    () => () => {
      if (measureFrame.current) {
        window.cancelAnimationFrame(measureFrame.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!scrollElement) return;

    let frame = 0;
    const read = () => {
      frame = 0;
      const scrollTop = scrollElement.scrollTop;
      const viewport = scrollElement.clientHeight || estimate;
      setMetrics((prev) =>
        prev.scrollTop === scrollTop && prev.viewport === viewport
          ? prev
          : { scrollTop, viewport }
      );
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(read);
    };

    read();
    scrollElement.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(onScroll);
    observer.observe(scrollElement);

    return () => {
      window.cancelAnimationFrame(frame);
      scrollElement.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [scrollElement, estimate, count]);

  const range = useMemo(
    () =>
      computeVirtualRange(
        count,
        metrics.scrollTop,
        metrics.viewport,
        estimate,
        8,
        heightsRef.current
      ),
    [count, metrics.scrollTop, metrics.viewport, estimate, heightVersion]
  );
  rangeRef.current = range;

  const measure = useCallback((index: number, node: HTMLElement | null) => {
    if (!node) return;
    const height = Math.round(node.getBoundingClientRect().height);
    if (!height) return;
    const previous = heightsRef.current[index];
    if (previous && Math.abs(previous - height) < 4) return;
    heightsRef.current[index] = height;
    if (measureFrame.current) return;
    measureFrame.current = window.requestAnimationFrame(() => {
      measureFrame.current = 0;
      const next = computeVirtualRange(
        count,
        metrics.scrollTop,
        metrics.viewport,
        estimate,
        8,
        heightsRef.current
      );
      const current = rangeRef.current;
      if (
        next.start === current.start &&
        next.end === current.end &&
        Math.abs(next.paddingTop - current.paddingTop) < 4 &&
        Math.abs(next.paddingBottom - current.paddingBottom) < 4
      ) {
        return;
      }
      setHeightVersion((version) => version + 1);
    });
  }, [count, estimate, metrics.scrollTop, metrics.viewport]);

  return { ...range, measure };
}
