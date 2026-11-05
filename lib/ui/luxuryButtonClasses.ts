import { cn } from "@/lib/utils";

/** Homepage luxury rectangular CTAs — contrast-safe champagne / plum / cream / burgundy. */

const base =
  "inline-flex min-h-12 min-w-[44px] items-center justify-center gap-2 rounded-none px-7 py-3 text-base font-extrabold tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A582] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5EEE8] active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:text-current";

/** Champagne surface + plum text */
export const luxBtnPrimary = cn(
  base,
  "bg-[#C5A582] text-[#42182F] hover:bg-[#D4B899] hover:text-[#42182F] active:bg-[#A88862] active:text-[#42182F]"
);

export const luxBtnPrimaryOnDark = cn(
  base,
  "bg-[#C5A582] text-[#42182F] hover:bg-[#D4B899] hover:text-[#42182F] active:bg-[#A88862] active:text-[#42182F] focus-visible:ring-offset-[#42182F]"
);

/** Plum surface + cream text */
export const luxBtnPlum = cn(
  base,
  "bg-[#42182F] text-[#FFF8F0] hover:bg-[#842B4C] hover:text-[#FFF8F0] active:bg-[#2A0F1D] active:text-[#FFF8F0]"
);

/** Burgundy surface + cream text */
export const luxBtnBurgundy = cn(
  base,
  "bg-[#842B4C] text-[#FFF8F0] hover:bg-[#9A3659] hover:text-[#FFF8F0] active:bg-[#6E2340] active:text-[#FFF8F0]"
);

/** Cream surface + plum text */
export const luxBtnSecondary = cn(
  base,
  "border border-[#C5A582]/75 bg-[#F5EEE8] text-[#42182F] hover:border-[#C5A582] hover:bg-[#FFF8F0] hover:text-[#42182F]"
);

export const luxBtnSecondaryOnDark = cn(
  base,
  "border border-[#FFF8F0]/55 bg-[#F5EEE8]/12 text-[#FFF8F0] backdrop-blur-[4px] hover:border-[#FFF8F0]/75 hover:bg-[#F5EEE8]/22 hover:text-[#FFF8F0] focus-visible:ring-offset-[#42182F]"
);

export const luxBtnGhostLight = cn(
  base,
  "border border-[#C5A582]/55 bg-[#F5EEE8] text-[#42182F] hover:bg-[#FFF8F0] hover:text-[#42182F]"
);
