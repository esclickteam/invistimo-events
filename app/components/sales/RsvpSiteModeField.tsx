"use client";

import { Link2, Sparkles } from "lucide-react";
import {
  RSVP_SITE_MODE_OPTIONS,
  type RsvpSiteMode,
} from "@/types/rsvpSite";

type Props = {
  value: RsvpSiteMode;
  onChange: (value: RsvpSiteMode) => void;
};

export default function RsvpSiteModeField({ value, onChange }: Props) {
  return (
    <div className="md:col-span-2 rounded-[26px] border border-[#eadfce] bg-[#fffdf9] p-4">
      <p className="text-sm font-black text-[#3f3327]">סוג אתר לאורחים</p>
      <p className="mt-1 text-xs font-semibold leading-6 text-[#7b6a58]">
        בחירה רק ללקוח הזה. לקוחות קיימים נשארים עם קישור אישי לכל אורח.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {RSVP_SITE_MODE_OPTIONS.map((option) => {
          const selected = value === option.value;
          const isPersonal = option.value === "personal";

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-[22px] border p-4 text-right transition ${
                selected
                  ? "border-[#b47a3b] bg-[#fff7ec] shadow-sm"
                  : "border-[#eadfce] bg-white hover:border-[#d8b777]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    selected ? "bg-[#B8844F] text-white" : "bg-[#fff3df] text-[#B8844F]"
                  }`}
                >
                  {isPersonal ? <Sparkles className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                </span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    selected ? "border-[#B8844F] bg-[#B8844F]" : "border-[#D8D2C9] bg-white"
                  }`}
                >
                  {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-black text-[#3f3327]">{option.title}</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#8A7B69]">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
