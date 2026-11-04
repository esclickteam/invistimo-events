import { cn } from "@/lib/utils";

/** Homepage luxury rectangular CTAs — champagne / plum / cream. */

const base =
  "inline-flex min-h-12 min-w-[44px] items-center justify-center gap-2 rounded-none px-7 py-3 text-base font-extrabold tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A582] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5EEE8] active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45";

export const luxBtnPrimary = cn(
  base,
  "bg-[#C5A582] !text-[#2A0F1D] hover:bg-[#D4B899] active:bg-[#A88862]"
);

export const luxBtnPrimaryOnDark = cn(
  base,
  "bg-[#C5A582] !text-[#2A0F1D] hover:bg-[#D4B899] active:bg-[#A88862] focus-visible:ring-offset-[#42182F]"
);

export const luxBtnPlum = cn(
  base,
  "bg-[#42182F] !text-[#F5EEE8] hover:bg-[#842B4C] active:bg-[#2A0F1D]"
);

export const luxBtnSecondary = cn(
  base,
  "border border-[#C5A582]/75 bg-[#FFFBFA] !text-[#42182F] hover:border-[#C5A582] hover:bg-white"
);

export const luxBtnSecondaryOnDark = cn(
  base,
  "border border-[#F5EEE8]/45 bg-[#F5EEE8]/10 !text-[#F5EEE8] backdrop-blur-[4px] hover:border-[#F5EEE8]/65 hover:bg-[#F5EEE8]/18 focus-visible:ring-offset-[#42182F]"
);

export const luxBtnGhostLight = cn(
  base,
  "border border-[#F5EEE8]/55 bg-[#F5EEE8] !text-[#42182F] hover:bg-white"
);
