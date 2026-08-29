export type RsvpAppearance = {
  id: string;
  form: string;
  glowA?: string;
  glowB?: string;
  inner: string;
  headingWrap: string;
  heading: string;
  yesNoGrid: string;
  yesButton: (active: boolean) => string;
  noButton: (active: boolean) => string;
  countBox: string;
  countLabel: string;
  countRow: string;
  countButton: string;
  countValue: string;
  notesBox: string;
  notesLabel: string;
  notesGrid: string;
  noteItem: (checked: boolean) => string;
  submit: string;
  success: string;
  error: string;
  updateLink: string;
  checkboxClass: string;
};

export const personalRsvpAppearance: RsvpAppearance = {
  id: "personal",
  form: "relative mt-7 w-full max-w-md overflow-hidden rounded-[34px] border border-white/80 bg-white/92 p-6 shadow-[0_28px_90px_rgba(92,66,38,0.16)] backdrop-blur",
  glowA: "pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#dfc08f]/25 blur-3xl",
  glowB: "pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-[#fff2d9]/80 blur-3xl",
  inner: "relative",
  headingWrap: "mb-6 text-center",
  heading: "text-2xl font-black text-[#2d241c] leading-tight",
  yesNoGrid: "grid grid-cols-2 gap-3",
  yesButton: (active) =>
    `relative overflow-hidden rounded-2xl border px-4 py-4 text-sm font-black transition disabled:cursor-wait disabled:opacity-70 ${
      active
        ? "border-[#c79a55] bg-gradient-to-l from-[#c79a55] to-[#8f6437] text-white shadow-lg"
        : "border-[#eadfce] bg-[#fbf8f2] text-[#5a4634] hover:border-[#c79a55] hover:bg-[#fff7ea]"
    }`,
  noButton: (active) =>
    `rounded-2xl border px-4 py-4 text-sm font-black transition disabled:cursor-wait disabled:opacity-70 ${
      active
        ? "border-[#b88a8a] bg-[#b88a8a] text-white shadow-lg"
        : "border-[#eadfce] bg-[#fbf8f2] text-[#5a4634] hover:bg-white"
    }`,
  countBox: "mt-6 rounded-[28px] border border-[#eadfce] bg-[#fffaf2] p-5",
  countLabel: "mb-4 text-center text-sm font-black text-[#3a2c20]",
  countRow: "flex items-center justify-center gap-5",
  countButton:
    "flex h-11 w-11 items-center justify-center rounded-full border border-[#d8c7ad] bg-white text-xl font-bold text-[#5a4634] shadow-sm transition hover:bg-[#fbf7f0] disabled:cursor-wait disabled:opacity-70",
  countValue:
    "flex h-14 min-w-[64px] items-center justify-center rounded-2xl bg-white px-5 text-2xl font-black text-[#2d241c] shadow-sm",
  notesBox: "mt-6 rounded-[28px] border border-[#eadfce] bg-white p-5",
  notesLabel: "mb-3 block text-sm font-black text-[#3a2c20]",
  notesGrid: "grid grid-cols-2 gap-3",
  noteItem: (checked) =>
    `flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
      checked
        ? "border-[#c79a55] bg-[#fff7ea] text-[#5a4634]"
        : "border-[#eadfce] bg-[#fbf8f2] text-[#6b6046]"
    }`,
  submit:
    "mt-6 w-full rounded-2xl bg-gradient-to-l from-[#c79a55] to-[#8f6437] px-5 py-4 text-lg font-black text-white shadow-[0_18px_45px_rgba(143,100,55,0.28)] transition hover:shadow-[0_22px_55px_rgba(143,100,55,0.34)] disabled:cursor-wait disabled:opacity-70",
  success:
    "mt-7 w-full max-w-md rounded-[30px] border border-emerald-100 bg-white px-6 py-6 text-center font-black text-emerald-700 shadow-[0_20px_70px_rgba(92,66,38,0.12)]",
  error: "mt-4 text-center text-sm font-bold text-red-600",
  updateLink: "mt-4 text-sm font-black text-emerald-800 underline",
  checkboxClass: "accent-[#8f6437] disabled:cursor-wait",
};

function themed(base: Partial<RsvpAppearance> & Pick<RsvpAppearance, "id">): RsvpAppearance {
  return {
    ...personalRsvpAppearance,
    ...base,
  };
}

export const eternalGoldRsvpAppearance = themed({
  id: "eternal-gold",
  form: "relative w-full overflow-hidden border border-[#C9A962]/35 bg-white p-8",
  glowA: "",
  glowB: "",
  heading: "sr-only",
  headingWrap: "hidden",
  yesButton: (active) =>
    `flex-1 py-3 text-sm font-bold transition disabled:opacity-70 ${
      active ? "bg-[#C9A962] text-white" : "border border-[#C9A962]/40 text-[#8A7560]"
    }`,
  noButton: (active) =>
    `flex-1 py-3 text-sm font-bold transition disabled:opacity-70 ${
      active ? "bg-[#C9A962] text-white" : "border border-[#C9A962]/40 text-[#8A7560]"
    }`,
  countBox: "mt-6 border border-[#C9A962]/35 bg-[#FAF7F2] p-5",
  countLabel: "mb-4 text-center text-sm font-bold text-[#8A7560]",
  countButton:
    "flex h-11 w-11 items-center justify-center border border-[#C9A962]/40 bg-white text-xl font-bold text-[#8A7560]",
  countValue:
    "flex h-14 min-w-[64px] items-center justify-center bg-white px-5 text-2xl font-black text-[#2A2118]",
  notesBox: "mt-6 border border-[#C9A962]/35 bg-white p-5",
  notesLabel: "mb-3 block text-sm font-bold text-[#2A2118]",
  noteItem: (checked) =>
    `flex cursor-pointer items-center gap-2 border px-3 py-3 text-sm font-semibold ${
      checked ? "border-[#C9A962] bg-[#F3EBE0] text-[#2A2118]" : "border-[#C9A962]/40 text-[#8A7560]"
    }`,
  submit: "mt-6 w-full bg-[#C9A962] py-4 text-sm font-bold text-white disabled:opacity-40",
  success: "text-center text-lg text-[#C9A962]",
  updateLink: "mt-4 text-sm font-bold text-[#C9A962] underline",
  checkboxClass: "accent-[#C9A962]",
});

export const midnightVelvetRsvpAppearance = themed({
  id: "midnight-velvet",
  form: "relative w-full overflow-hidden border border-[#D4AF37]/25 bg-[#16141C] p-8 text-[#F5F0E8]",
  glowA: "",
  glowB: "",
  headingWrap: "hidden",
  heading: "sr-only",
  yesButton: (active) =>
    `flex-1 py-3 text-sm font-bold transition ${
      active ? "bg-[#D4AF37] text-black" : "border border-[#D4AF37]/40 text-[#D4AF37]"
    }`,
  noButton: (active) =>
    `flex-1 py-3 text-sm font-bold transition ${
      active ? "bg-[#D4AF37] text-black" : "border border-[#D4AF37]/40 text-[#D4AF37]"
    }`,
  countBox: "mt-6 border border-[#D4AF37]/25 bg-black/40 p-5",
  countLabel: "mb-4 text-center text-sm font-bold text-[#D4AF37]",
  countButton:
    "flex h-11 w-11 items-center justify-center border border-[#D4AF37]/40 text-xl font-bold text-[#D4AF37]",
  countValue:
    "flex h-14 min-w-[64px] items-center justify-center bg-[#0D0B10] px-5 text-2xl font-black text-[#F5F0E8]",
  notesBox: "mt-6 border border-[#D4AF37]/25 p-5",
  notesLabel: "mb-3 block text-sm font-bold text-[#F5F0E8]",
  noteItem: (checked) =>
    `flex cursor-pointer items-center gap-2 border px-3 py-3 text-sm ${
      checked ? "border-[#D4AF37] bg-[#D4AF37]/10" : "border-[#D4AF37]/30"
    }`,
  submit: "mt-6 w-full bg-[#D4AF37] py-4 text-sm font-bold text-black disabled:opacity-40",
  success: "text-center text-[#D4AF37]",
  error: "mt-4 text-center text-sm font-bold text-red-300",
  updateLink: "mt-4 text-sm font-bold text-[#D4AF37] underline",
  checkboxClass: "accent-[#D4AF37]",
});

export const gardenBloomRsvpAppearance = themed({
  id: "garden-bloom",
  form: "relative w-full overflow-hidden rounded-[28px] border border-[#7CB87A]/35 bg-white p-8",
  glowA: "",
  glowB: "",
  headingWrap: "hidden",
  heading: "sr-only",
  yesButton: (active) =>
    `flex-1 rounded-full py-3 text-sm font-bold transition ${
      active ? "bg-[#3F7A45] text-white" : "border border-[#3F7A45]/40 text-[#3F7A45]"
    }`,
  noButton: (active) =>
    `flex-1 rounded-full py-3 text-sm font-bold transition ${
      active ? "bg-[#3F7A45] text-white" : "border border-[#3F7A45]/40 text-[#3F7A45]"
    }`,
  countBox: "mt-6 rounded-[24px] border border-[#7CB87A]/30 bg-[#E8F3E8] p-5",
  countLabel: "mb-4 text-center text-sm font-bold text-[#1F3324]",
  countButton:
    "flex h-11 w-11 items-center justify-center rounded-full border border-[#3F7A45]/40 bg-white text-xl font-bold text-[#3F7A45]",
  countValue:
    "flex h-14 min-w-[64px] items-center justify-center rounded-2xl bg-white px-5 text-2xl font-black text-[#1F3324]",
  notesBox: "mt-6 rounded-[24px] border border-[#7CB87A]/30 bg-white p-5",
  notesLabel: "mb-3 block text-sm font-bold text-[#1F3324]",
  noteItem: (checked) =>
    `flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-3 text-sm ${
      checked ? "border-[#3F7A45] bg-[#E8F3E8]" : "border-[#7CB87A]/40"
    }`,
  submit: "mt-6 w-full rounded-full bg-[#3F7A45] py-4 text-sm font-bold text-white disabled:opacity-40",
  success: "text-center text-xl text-[#3F7A45]",
  updateLink: "mt-4 text-sm font-bold text-[#3F7A45] underline",
  checkboxClass: "accent-[#3F7A45]",
});

export const coastalBreezeRsvpAppearance = themed({
  id: "coastal-breeze",
  form: "relative w-full overflow-hidden rounded-2xl border border-[#0D2840]/15 bg-white p-8",
  glowA: "",
  glowB: "",
  headingWrap: "hidden",
  heading: "sr-only",
  yesButton: (active) =>
    `flex-1 rounded-md py-3 text-sm font-bold transition ${
      active ? "bg-[#0D2840] text-white" : "border border-[#0D2840]/30 text-[#0D2840]"
    }`,
  noButton: (active) =>
    `flex-1 rounded-md py-3 text-sm font-bold transition ${
      active ? "bg-[#0D2840] text-white" : "border border-[#0D2840]/30 text-[#0D2840]"
    }`,
  countBox: "mt-6 rounded-2xl border border-[#0D2840]/15 bg-[#F5E6C8] p-5",
  countLabel: "mb-4 text-center text-sm font-bold text-[#0D2840]",
  countButton:
    "flex h-11 w-11 items-center justify-center rounded-full border border-[#0D2840]/30 bg-white text-xl font-bold text-[#0D2840]",
  countValue:
    "flex h-14 min-w-[64px] items-center justify-center rounded-xl bg-white px-5 text-2xl font-black text-[#0D2840]",
  notesBox: "mt-6 rounded-2xl border border-[#0D2840]/15 bg-white p-5",
  notesLabel: "mb-3 block text-sm font-bold text-[#0D2840]",
  noteItem: (checked) =>
    `flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm ${
      checked ? "border-[#0D2840] bg-[#F5E6C8]" : "border-[#0D2840]/20"
    }`,
  submit: "mt-6 w-full rounded-md bg-[#0D2840] py-4 text-sm font-bold text-white disabled:opacity-40",
  success: "text-center text-xl text-[#0D2840]",
  updateLink: "mt-4 text-sm font-bold text-[#0D2840] underline",
  checkboxClass: "accent-[#0D2840]",
});

export const desertRoseRsvpAppearance = themed({
  id: "desert-rose",
  form: "relative w-full overflow-hidden rounded-[20px] border border-[#C4785A]/30 bg-white p-8",
  glowA: "",
  glowB: "",
  headingWrap: "hidden",
  heading: "sr-only",
  yesButton: (active) =>
    `flex-1 rounded-xl py-3 text-sm font-bold transition ${
      active ? "bg-[#C4785A] text-white" : "border border-[#C4785A]/40 text-[#C4785A]"
    }`,
  noButton: (active) =>
    `flex-1 rounded-xl py-3 text-sm font-bold transition ${
      active ? "bg-[#C4785A] text-white" : "border border-[#C4785A]/40 text-[#C4785A]"
    }`,
  countBox: "mt-6 rounded-2xl border border-[#C4785A]/25 bg-[#F5E8DE] p-5",
  countLabel: "mb-4 text-center text-sm font-bold text-[#3D2518]",
  countButton:
    "flex h-11 w-11 items-center justify-center rounded-full border border-[#C4785A]/40 bg-white text-xl font-bold text-[#C4785A]",
  countValue:
    "flex h-14 min-w-[64px] items-center justify-center rounded-2xl bg-white px-5 text-2xl font-black text-[#3D2518]",
  notesBox: "mt-6 rounded-2xl border border-[#C4785A]/25 bg-white p-5",
  notesLabel: "mb-3 block text-sm font-bold text-[#3D2518]",
  noteItem: (checked) =>
    `flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm ${
      checked ? "border-[#C4785A] bg-[#F5E8DE]" : "border-[#C4785A]/30"
    }`,
  submit: "mt-6 w-full rounded-xl bg-[#C4785A] py-4 text-sm font-bold text-white disabled:opacity-40",
  success: "text-center text-xl text-[#C4785A]",
  updateLink: "mt-4 text-sm font-bold text-[#C4785A] underline",
  checkboxClass: "accent-[#C4785A]",
});

export const minimalNoirRsvpAppearance = themed({
  id: "minimal-noir",
  form: "relative w-full overflow-hidden bg-black p-0 text-white",
  glowA: "",
  glowB: "",
  headingWrap: "hidden",
  heading: "sr-only",
  yesNoGrid: "grid grid-cols-2 gap-0 border border-white",
  yesButton: (active) =>
    `py-4 font-mono text-xs uppercase tracking-widest ${active ? "bg-white text-black" : "hover:bg-white/10"}`,
  noButton: (active) =>
    `py-4 font-mono text-xs uppercase tracking-widest ${active ? "bg-white text-black" : "hover:bg-white/10"}`,
  countBox: "mt-6 border border-white/40 p-5",
  countLabel: "mb-4 text-center font-mono text-xs uppercase tracking-widest",
  countButton:
    "flex h-11 w-11 items-center justify-center border border-white text-xl font-bold",
  countValue:
    "flex h-14 min-w-[64px] items-center justify-center border border-white px-5 font-mono text-2xl",
  notesBox: "mt-6 border border-white/40 p-5",
  notesLabel: "mb-3 block font-mono text-xs uppercase tracking-widest",
  noteItem: (checked) =>
    `flex cursor-pointer items-center gap-2 border px-3 py-3 font-mono text-xs ${
      checked ? "border-white bg-white text-black" : "border-white/40"
    }`,
  submit:
    "mt-6 w-full border border-white py-4 font-mono text-xs uppercase tracking-widest disabled:opacity-30",
  success: "font-mono text-sm",
  error: "mt-4 text-center text-sm font-bold text-red-300",
  updateLink: "mt-4 font-mono text-xs underline",
  checkboxClass: "accent-white",
});

export const royalIvoryRsvpAppearance = themed({
  id: "royal-ivory",
  form: "relative mt-10 w-full overflow-hidden rounded-3xl border border-[#B8956B]/25 bg-white p-8 shadow-lg",
  glowA: "",
  glowB: "",
  headingWrap: "hidden",
  heading: "sr-only",
  yesButton: (active) =>
    `flex-1 rounded-full py-3 font-['Playfair_Display'] text-sm transition ${
      active ? "bg-[#B8956B] text-white" : "border border-[#B8956B]/30 text-[#B8956B]"
    }`,
  noButton: (active) =>
    `flex-1 rounded-full py-3 font-['Playfair_Display'] text-sm transition ${
      active ? "bg-[#B8956B] text-white" : "border border-[#B8956B]/30 text-[#B8956B]"
    }`,
  countBox: "mt-6 rounded-[28px] border border-[#B8956B]/25 bg-[#F7F1E8] p-5",
  countLabel: "mb-4 text-center font-['Playfair_Display'] text-sm text-[#2C2419]",
  countButton:
    "flex h-11 w-11 items-center justify-center rounded-full border border-[#B8956B]/40 bg-white text-xl text-[#B8956B]",
  countValue:
    "flex h-14 min-w-[64px] items-center justify-center rounded-2xl bg-white px-5 font-['Playfair_Display'] text-2xl text-[#2C2419]",
  notesBox: "mt-6 rounded-[28px] border border-[#B8956B]/25 bg-white p-5",
  notesLabel: "mb-3 block font-['Playfair_Display'] text-sm",
  noteItem: (checked) =>
    `flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-3 text-sm ${
      checked ? "border-[#B8956B] bg-[#F7F1E8]" : "border-[#B8956B]/25"
    }`,
  submit:
    "mt-6 w-full rounded-full bg-[#B8956B] py-3 font-['Playfair_Display'] text-white disabled:opacity-40",
  success: "mt-10 text-center font-['Playfair_Display'] italic text-[#B8956B]",
  updateLink: "mt-4 text-sm font-bold text-[#B8956B] underline",
  checkboxClass: "accent-[#B8956B]",
});

export const sunsetBlushRsvpAppearance = themed({
  id: "sunset-blush",
  form: "relative mt-8 w-full overflow-hidden rounded-[32px] border border-[#E8A0A0]/30 bg-white/90 p-8 shadow-lg",
  glowA: "",
  glowB: "",
  headingWrap: "hidden",
  heading: "sr-only",
  yesButton: (active) =>
    `flex-1 rounded-full py-3 text-sm font-bold transition ${
      active ? "bg-[#E8A0A0] text-white" : "border border-[#E8A0A0]/40 text-[#C97B7B]"
    }`,
  noButton: (active) =>
    `flex-1 rounded-full py-3 text-sm font-bold transition ${
      active ? "bg-[#E8A0A0] text-white" : "border border-[#E8A0A0]/40 text-[#C97B7B]"
    }`,
  countBox: "mt-6 rounded-[28px] border border-[#E8A0A0]/25 bg-[#FFF5F3] p-5",
  countLabel: "mb-4 text-center text-sm font-bold text-[#5A3A3A]",
  countButton:
    "flex h-11 w-11 items-center justify-center rounded-full border border-[#E8A0A0]/40 bg-white text-xl text-[#C97B7B]",
  countValue:
    "flex h-14 min-w-[64px] items-center justify-center rounded-2xl bg-white px-5 text-2xl font-black text-[#5A3A3A]",
  notesBox: "mt-6 rounded-[28px] border border-[#E8A0A0]/25 bg-white p-5",
  notesLabel: "mb-3 block text-sm font-bold text-[#5A3A3A]",
  noteItem: (checked) =>
    `flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-3 text-sm ${
      checked ? "border-[#E8A0A0] bg-[#FFF5F3]" : "border-[#E8A0A0]/30"
    }`,
  submit: "mt-6 w-full rounded-full bg-[#E8A0A0] py-4 text-sm font-bold text-white disabled:opacity-40",
  success: "mt-10 text-center text-2xl text-[#C97B7B]",
  updateLink: "mt-4 text-sm font-bold text-[#C97B7B] underline",
  checkboxClass: "accent-[#E8A0A0]",
});

export const forestEnchantedRsvpAppearance = themed({
  id: "forest-enchanted",
  form: "relative mt-10 w-full overflow-hidden rounded-3xl border border-[#7CB87A]/25 bg-[#1C2A1E] p-8 text-[#E8F3E8]",
  glowA: "",
  glowB: "",
  headingWrap: "hidden",
  heading: "sr-only",
  yesButton: (active) =>
    `flex-1 rounded-2xl py-3 text-sm font-bold transition ${
      active ? "bg-[#7CB87A] text-[#1C2A1E]" : "border border-[#7CB87A]/40 text-[#7CB87A]"
    }`,
  noButton: (active) =>
    `flex-1 rounded-2xl py-3 text-sm font-bold transition ${
      active ? "bg-[#7CB87A] text-[#1C2A1E]" : "border border-[#7CB87A]/40 text-[#7CB87A]"
    }`,
  countBox: "mt-6 rounded-[28px] border border-[#7CB87A]/25 bg-[#152018] p-5",
  countLabel: "mb-4 text-center text-sm font-bold text-[#7CB87A]",
  countButton:
    "flex h-11 w-11 items-center justify-center rounded-full border border-[#7CB87A]/40 text-xl text-[#7CB87A]",
  countValue:
    "flex h-14 min-w-[64px] items-center justify-center rounded-2xl bg-[#1C2A1E] px-5 text-2xl font-black text-[#E8F3E8]",
  notesBox: "mt-6 rounded-[28px] border border-[#7CB87A]/25 p-5",
  notesLabel: "mb-3 block text-sm font-bold",
  noteItem: (checked) =>
    `flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-3 text-sm ${
      checked ? "border-[#7CB87A] bg-[#7CB87A]/15" : "border-[#7CB87A]/30"
    }`,
  submit: "mt-6 w-full rounded-2xl bg-[#7CB87A] py-4 text-sm font-bold text-[#1C2A1E] disabled:opacity-40",
  success: "mt-10 text-center text-[#7CB87A]",
  error: "mt-4 text-center text-sm font-bold text-red-300",
  updateLink: "mt-4 text-sm font-bold text-[#7CB87A] underline",
  checkboxClass: "accent-[#7CB87A]",
});

export const modernGlassRsvpAppearance = themed({
  id: "modern-glass",
  form: "relative w-full overflow-hidden p-0 text-white",
  glowA: "",
  glowB: "",
  headingWrap: "hidden",
  heading: "sr-only",
  yesButton: (active) =>
    `flex-1 rounded-2xl py-3 text-sm font-bold transition ${
      active ? "bg-[#7C9CFF] text-black" : "border border-white/20 text-white/80"
    }`,
  noButton: (active) =>
    `flex-1 rounded-2xl py-3 text-sm font-bold transition ${
      active ? "bg-[#7C9CFF] text-black" : "border border-white/20 text-white/80"
    }`,
  countBox: "mt-6 rounded-[28px] border border-white/15 bg-white/5 p-5",
  countLabel: "mb-4 text-center text-sm font-bold text-white/80",
  countButton:
    "flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-xl",
  countValue:
    "flex h-14 min-w-[64px] items-center justify-center rounded-2xl bg-white/10 px-5 text-2xl font-black",
  notesBox: "mt-6 rounded-[28px] border border-white/15 bg-white/5 p-5",
  notesLabel: "mb-3 block text-sm font-bold",
  noteItem: (checked) =>
    `flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-3 text-sm ${
      checked ? "border-[#7C9CFF] bg-[#7C9CFF]/15" : "border-white/15"
    }`,
  submit: "mt-6 w-full rounded-2xl bg-[#7C9CFF] py-4 text-sm font-bold text-black disabled:opacity-40",
  success: "mt-10 text-center text-[#7C9CFF]",
  error: "mt-4 text-center text-sm font-bold text-red-300",
  updateLink: "mt-4 text-sm font-bold text-[#7C9CFF] underline",
  checkboxClass: "accent-[#7C9CFF]",
});

export const RSVP_APPEARANCES = {
  personal: personalRsvpAppearance,
  "eternal-gold": eternalGoldRsvpAppearance,
  "midnight-velvet": midnightVelvetRsvpAppearance,
  "garden-bloom": gardenBloomRsvpAppearance,
  "coastal-breeze": coastalBreezeRsvpAppearance,
  "desert-rose": desertRoseRsvpAppearance,
  "minimal-noir": minimalNoirRsvpAppearance,
  "royal-ivory": royalIvoryRsvpAppearance,
  "sunset-blush": sunsetBlushRsvpAppearance,
  "forest-enchanted": forestEnchantedRsvpAppearance,
  "modern-glass": modernGlassRsvpAppearance,
} as const;

export type RsvpAppearanceId = keyof typeof RSVP_APPEARANCES;

export function getRsvpAppearance(id?: string | null): RsvpAppearance {
  if (id && id in RSVP_APPEARANCES) {
    return RSVP_APPEARANCES[id as RsvpAppearanceId];
  }
  return eternalGoldRsvpAppearance;
}
