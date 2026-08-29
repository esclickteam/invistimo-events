"use client";

import { useEffect, useState, type CSSProperties } from "react";

export default function HeartBurst({ triggerKey }: { triggerKey: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!triggerKey) return;

    setShow(true);

    const timer = window.setTimeout(() => {
      setShow(false);
    }, 1250);

    return () => window.clearTimeout(timer);
  }, [triggerKey]);

  if (!show) return null;

  const items = ["😍", "💛", "🤍", "✨", "💖", "🥰", "💫", "❤️"];

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
      <div className="relative h-56 w-56">
        {items.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="heart-burst-item absolute left-1/2 top-1/2 text-4xl"
            style={
              {
                "--x": `${Math.cos((index / items.length) * Math.PI * 2) * 125}px`,
                "--y": `${Math.sin((index / items.length) * Math.PI * 2) * 125}px`,
                "--delay": `${index * 45}ms`,
              } as CSSProperties
            }
          >
            {item}
          </span>
        ))}

        <div className="heart-burst-center absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-5xl shadow-[0_25px_80px_rgba(105,70,35,0.22)]">
          😍
        </div>
      </div>
    </div>
  );
}

export function HeartBurstStyles() {
  return (
    <style>{`
      @keyframes heart-burst-fly {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.4);
        }
        18% {
          opacity: 1;
        }
        100% {
          opacity: 0;
          transform: translate(
              calc(-50% + var(--x)),
              calc(-50% + var(--y))
            )
            scale(1.25) rotate(18deg);
        }
      }

      @keyframes heart-burst-center {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.5);
        }
        25% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1.08);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(1.35);
        }
      }

      .heart-burst-item {
        animation: heart-burst-fly 1.05s ease-out forwards;
        animation-delay: var(--delay);
      }

      .heart-burst-center {
        animation: heart-burst-center 1.15s ease-out forwards;
      }
    `}</style>
  );
}
