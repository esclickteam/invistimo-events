export type WeddingFontOption = {
  id: string;
  label: string;
  family: string;
  cssFamily: string;
  google: string;
  rtl: boolean;
};

export const WEDDING_EDITOR_FONTS: WeddingFontOption[] = [
  { id: "heebo", label: "Heebo", family: "Heebo", cssFamily: "'Heebo', sans-serif", google: "Heebo:wght@300;400;500;600;700", rtl: true },
  { id: "assistant", label: "Assistant", family: "Assistant", cssFamily: "'Assistant', sans-serif", google: "Assistant:wght@300;400;600;700", rtl: true },
  { id: "rubik", label: "Rubik", family: "Rubik", cssFamily: "'Rubik', sans-serif", google: "Rubik:wght@300;400;500;600;700", rtl: true },
  { id: "alef", label: "Alef", family: "Alef", cssFamily: "'Alef', sans-serif", google: "Alef:wght@400;700", rtl: true },
  { id: "noto-sans-hebrew", label: "Noto Sans Hebrew", family: "Noto Sans Hebrew", cssFamily: "'Noto Sans Hebrew', sans-serif", google: "Noto+Sans+Hebrew:wght@300;400;500;700", rtl: true },
  { id: "frank-ruhl", label: "Frank Ruhl Libre", family: "Frank Ruhl Libre", cssFamily: "'Frank Ruhl Libre', serif", google: "Frank+Ruhl+Libre:wght@300;400;500;700", rtl: true },
  { id: "noto-serif-hebrew", label: "Noto Serif Hebrew", family: "Noto Serif Hebrew", cssFamily: "'Noto Serif Hebrew', serif", google: "Noto+Serif+Hebrew:wght@300;400;600;700", rtl: true },
  { id: "cormorant", label: "Cormorant Garamond", family: "Cormorant Garamond", cssFamily: "'Cormorant Garamond', serif", google: "Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400", rtl: false },
  { id: "playfair", label: "Playfair Display", family: "Playfair Display", cssFamily: "'Playfair Display', serif", google: "Playfair+Display:ital,wght@0,400;0,600;0,700;1,400", rtl: false },
  { id: "libre-baskerville", label: "Libre Baskerville", family: "Libre Baskerville", cssFamily: "'Libre Baskerville', serif", google: "Libre+Baskerville:ital,wght@0,400;0,700;1,400", rtl: false },
];

export function getWeddingFont(family?: string | null) {
  const raw = String(family || "").replace(/['"]/g, "").split(",")[0].trim();
  if (!raw) return null;
  return (
    WEDDING_EDITOR_FONTS.find(
      (font) => font.family.toLowerCase() === raw.toLowerCase() || font.cssFamily.includes(raw)
    ) || null
  );
}

export function weddingFontHref(fonts: WeddingFontOption[]) {
  if (!fonts.length) return "";
  const families = fonts.map((font) => `family=${font.google}`).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

export function loadWeddingFont(family: string) {
  if (typeof document === "undefined") return;
  const font = getWeddingFont(family);
  if (!font) return;
  if (document.querySelector(`link[data-ww-font="${font.id}"]`)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = weddingFontHref([font]);
  link.setAttribute("data-ww-font", font.id);
  document.head.appendChild(link);
}

export function collectUsedWeddingFonts(styles?: Record<string, { fontFamily?: string }> | null) {
  const used = new Map<string, WeddingFontOption>();
  for (const style of Object.values(styles || {})) {
    const font = getWeddingFont(style?.fontFamily);
    if (font) used.set(font.id, font);
  }
  return Array.from(used.values());
}
