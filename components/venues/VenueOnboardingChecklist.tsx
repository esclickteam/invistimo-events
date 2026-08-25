"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  ImageIcon,
  Settings,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";

export type OnboardingItem = {
  id: string;
  label: string;
  done: boolean;
  href: string;
};

type Props = {
  hallId: string;
  items: OnboardingItem[];
};

function storageKey(hallId: string) {
  return `venue.onboarding.dismissed.${hallId}`;
}

export default function VenueOnboardingChecklist({ hallId, items }: Props) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(hallId));
      setDismissed(stored === "1");
    } catch {
      setDismissed(false);
    }
  }, [hallId]);

  const completedCount = useMemo(
    () => items.filter((item) => item.done).length,
    [items]
  );

  const allDone = completedCount === items.length;
  const visible = !dismissed && !allDone;

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey(hallId), "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  if (!visible) return null;

  return (
    <section className="mb-5 rounded-[30px] border border-[#d8bd83] bg-gradient-to-br from-[#fffdf8] to-[#fbf2df] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black text-[#9f6f1a]">הגדרת אולם</div>
          <h2 className="mt-1 text-xl font-black text-[#2b241c]">
            רשימת פתיחה — {completedCount}/{items.length} הושלמו
          </h2>
          <p className="mt-1 text-sm font-bold text-[#7f705d]">
            השלימי את הצעדים הבאים כדי להפעיל את האולם. אפשר לדלג בכל עת.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#d9bd83] bg-white/80 text-[#8a7b68] transition hover:bg-white"
          aria-label="סגירת רשימת פתיחה"
        >
          <X size={16} />
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-2xl border px-4 py-3 transition",
                item.done
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-[#eadfce] bg-white/80 hover:border-[#d9bd83] hover:bg-white",
              ].join(" ")}
            >
              {item.done ? (
                <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
              ) : (
                <Circle size={20} className="shrink-0 text-[#c99a3d]" />
              )}
              <span
                className={[
                  "flex-1 text-sm font-black",
                  item.done ? "text-emerald-800 line-through" : "text-[#2b241c]",
                ].join(" ")}
              >
                {item.label}
              </span>
              <OnboardingIcon id={item.id} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OnboardingIcon({ id }: { id: string }) {
  const className = "shrink-0 text-[#b98121]";
  if (id === "settings") return <Settings size={18} className={className} />;
  if (id === "image") return <ImageIcon size={18} className={className} />;
  if (id === "employee") return <ShieldCheck size={18} className={className} />;
  if (id === "lead") return <UsersRound size={18} className={className} />;
  if (id === "event") return <CalendarDays size={18} className={className} />;
  return null;
}
