"use client";

import React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

type Props = {
  title: string;
  subtitle: string;
  items: string[];
};

export default function VenueComingSoonTab({
  title,
  subtitle,
  items,
}: Props) {
  return (
    <section className="rounded-[2rem] border border-[#eadfce] bg-white p-6 shadow-sm sm:p-8">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[#f1e6d4] text-[#a5824f]">
          <Sparkles size={28} />
        </div>

        <p className="mt-5 text-sm font-black text-[#a5824f]">
          מודול בהמשך
        </p>

        <h2 className="mt-2 text-2xl font-black text-[#2f261d] sm:text-3xl">
          {title}
        </h2>

        <p className="mt-3 text-sm font-bold leading-7 text-[#7b6a58] sm:text-base">
          {subtitle}
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-4xl gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 rounded-2xl border border-[#f0e6d7] bg-[#fffaf4] p-4 text-sm font-black text-[#2f261d]"
          >
            <CheckCircle2 size={18} className="shrink-0 text-[#a5824f]" />
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}