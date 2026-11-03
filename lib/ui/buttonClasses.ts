import { cn } from "@/lib/utils";

/**
 * Invistimo global editorial button classes — rectangular (radius 0).
 * Use these for Links / TrackedCtaLink / native buttons outside shadcn <Button>.
 */

const base =
  "inline-flex min-h-12 min-w-[44px] items-center justify-center gap-2 rounded-none px-7 py-3 text-base font-extrabold tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A45C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F1E8] active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";

/** Primary — Invistimo gold fill */
export const btnPrimary = cn(
  base,
  "bg-[#C9A45C] !text-[#1C1612] hover:bg-[#D4B06A] active:bg-[#B8862D]"
);

/** Primary on dark / cinematic hero */
export const btnPrimaryOnDark = cn(
  base,
  "bg-[#C9A45C] !text-[#1C1612] hover:bg-[#D4B06A] active:bg-[#B8862D] focus-visible:ring-offset-[#1A1410]"
);

/** Dark solid primary (brown) — used where gold would clash */
export const btnPrimaryDark = cn(
  base,
  "bg-[#2C241C] !text-[#F7F1E8] hover:bg-[#3A3028] active:bg-[#1C1612]"
);

/** Secondary — outline / soft surface */
export const btnSecondary = cn(
  base,
  "border border-[#C9A45C]/70 bg-[#FFFDF8] !text-[#2C241C] hover:border-[#C9A45C] hover:bg-white active:bg-[#F7F1E8]"
);

/** Secondary on dark backgrounds (hero glass) */
export const btnSecondaryOnDark = cn(
  base,
  "border border-white/45 bg-white/10 !text-white backdrop-blur-[4px] hover:border-white/65 hover:bg-white/18 active:bg-white/12 focus-visible:ring-offset-[#1A1410]"
);

/** Tertiary — text / light emphasis */
export const btnTertiary = cn(
  base,
  "min-h-11 border border-transparent bg-transparent !text-[#2C241C] hover:bg-[#2C241C]/06 active:bg-[#2C241C]/10"
);

/** Danger — rectangular warning action (border + label, not color alone) */
export const btnDanger = cn(
  base,
  "border border-[#C45C5C] bg-[#FFF5F5] !text-[#8B1E1E] hover:bg-[#FFE8E8] active:bg-[#FFD6D6] focus-visible:ring-[#C45C5C]"
);

/** Compact size modifier */
export const btnSizeSm = "min-h-11 px-5 py-2.5 text-sm";

/** Loading state helper — pair with aria-busy / disabled */
export const btnLoading = "relative cursor-wait opacity-70";

export const buttonClass = {
  primary: btnPrimary,
  primaryOnDark: btnPrimaryOnDark,
  primaryDark: btnPrimaryDark,
  secondary: btnSecondary,
  secondaryOnDark: btnSecondaryOnDark,
  tertiary: btnTertiary,
  danger: btnDanger,
} as const;

export type ButtonClassVariant = keyof typeof buttonClass;
