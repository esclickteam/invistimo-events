export type InteractiveWeddingThemeId =
  | "lunar-silk"
  | "olive-clay"
  | "noir-champagne"
  | "garden-mist"
  | "coastal-pearl"
  | "amber-archive";

export type InteractiveWeddingTheme = {
  id: InteractiveWeddingThemeId;
  name: string;
  nameHe: string;
  tagline: string;
  description: string;
  mood: string;
  previewImage: string;
  heroImage: string;
  galleryImages: string[];
  css: {
    bg: string;
    bgDeep: string;
    paper: string;
    ink: string;
    muted: string;
    accent: string;
    accentSoft: string;
    seal: string;
    ribbon: string;
    envelope: string;
    envelopeFlap: string;
    fontDisplay: string;
    fontBody: string;
    fontScript: string;
  };
  weddingTheme: {
    bg: string;
    bgAlt: string;
    surface: string;
    text: string;
    textMuted: string;
    accent: string;
    accentSoft: string;
    border: string;
    heroOverlay: string;
    fontDisplay: string;
    fontBody: string;
    radius: string;
    shadow: string;
    grain: boolean;
  };
};

export const INTERACTIVE_WEDDING_THEMES: InteractiveWeddingTheme[] = [
  {
    id: "lunar-silk",
    name: "Lunar Silk",
    nameHe: "משי ירח",
    tagline: "מעטפת משי, חותם ירח וגלילת כסף",
    description: "פתיחת מעטפה פיזית, שליפת הזמנה ואפקטי גלילה ליליים רכים.",
    mood: "romantic",
    previewImage: "/interactive-invites/lunar-silk/envelope-photo.webp",
    heroImage: "/interactive-invites/lunar-silk/invite-card.webp",
    galleryImages: [
      "/interactive-invites/lunar-silk/gallery-2.webp",
      "/interactive-invites/lunar-silk/gallery-1.webp",
      "/interactive-invites/lunar-silk/gallery-3.webp",
      "/interactive-invites/lunar-silk/gallery-4.webp",
      "/interactive-invites/lunar-silk/hero.webp",
    ],
    css: {
      bg: "#F3EEE4",
      bgDeep: "#E5DBCC",
      paper: "#FFFBF5",
      ink: "#2A2430",
      muted: "#7A6E60",
      accent: "#8FA3C7",
      accentSoft: "#C5D0E2",
      seal: "#7E9A7A",
      ribbon: "#A8B89A",
      envelope: "#E8E0D2",
      envelopeFlap: "#DDD4C4",
      fontDisplay: "'Cormorant Garamond', 'Noto Serif Hebrew', serif",
      fontBody: "'Heebo', sans-serif",
      fontScript: "'Great Vibes', cursive",
    },
    weddingTheme: {
      bg: "#FFFBF5",
      bgAlt: "#F3EEE4",
      surface: "#FFFFFF",
      text: "#2A2430",
      textMuted: "#7A6E60",
      accent: "#8FA3C7",
      accentSoft: "#C5D0E2",
      border: "rgba(143,163,199,0.35)",
      heroOverlay: "linear-gradient(180deg, transparent, rgba(42,36,48,0.55))",
      fontDisplay: "'Cormorant Garamond', serif",
      fontBody: "'Heebo', sans-serif",
      radius: "18px",
      shadow: "0 24px 70px rgba(70,55,35,0.16)",
      grain: true,
    },
  },
  {
    id: "olive-clay",
    name: "Olive Clay",
    nameHe: "חרס זית",
    tagline: "אדמה חמה, חותם חרס וכרם",
    description: "מעטפת חרס ים־תיכונית עם גלילה חמימה וחברים סביב השולחן.",
    mood: "warm",
    previewImage: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=900&q=80",
    heroImage: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1600&q=85",
    galleryImages: [
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80",
      "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800&q=80",
      "https://images.unsplash.com/photo-1507504031003-b41795c01189?w=800&q=80",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80",
    ],
    css: {
      bg: "#E8DCC8",
      bgDeep: "#C9B396",
      paper: "#F7F1E6",
      ink: "#3A2A1C",
      muted: "#7A6550",
      accent: "#6B7F4A",
      accentSoft: "#A3B07A",
      seal: "#8B5A3C",
      ribbon: "#8F6B4A",
      envelope: "#D8C4A8",
      envelopeFlap: "#CBB48F",
      fontDisplay: "'Frank Ruhl Libre', serif",
      fontBody: "'Assistant', sans-serif",
      fontScript: "'Caveat', cursive",
    },
    weddingTheme: {
      bg: "#F7F1E6",
      bgAlt: "#E8DCC8",
      surface: "#FFFCF7",
      text: "#3A2A1C",
      textMuted: "#7A6550",
      accent: "#6B7F4A",
      accentSoft: "#A3B07A",
      border: "rgba(107,127,74,0.3)",
      heroOverlay: "linear-gradient(180deg, transparent, rgba(58,42,28,0.55))",
      fontDisplay: "'Frank Ruhl Libre', serif",
      fontBody: "'Assistant', sans-serif",
      radius: "12px",
      shadow: "0 24px 60px rgba(90,60,30,0.22)",
      grain: true,
    },
  },
  {
    id: "noir-champagne",
    name: "Noir Champagne",
    nameHe: "נואר שמפניה",
    tagline: "ארט־דקו שחור־זהב עם פתיחה דרמטית",
    description: "מעטפה כהה, חותם זהב וגלילה חדה עם ניצוצות שמפניה.",
    mood: "dramatic",
    previewImage: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=900&q=80",
    heroImage: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=1600&q=85",
    galleryImages: [
      "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=800&q=80",
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80",
    ],
    css: {
      bg: "#1A1A1A",
      bgDeep: "#0A0A0A",
      paper: "#F7F3EA",
      ink: "#121212",
      muted: "#6E6558",
      accent: "#D4AF37",
      accentSoft: "#E8D48B",
      seal: "#C9A227",
      ribbon: "#B8962E",
      envelope: "#2A2A2A",
      envelopeFlap: "#1F1F1F",
      fontDisplay: "'Playfair Display', serif",
      fontBody: "'Rubik', sans-serif",
      fontScript: "'Playfair Display', serif",
    },
    weddingTheme: {
      bg: "#0A0A0A",
      bgAlt: "#141414",
      surface: "#1A1A1A",
      text: "#F7F3EA",
      textMuted: "#A89F8F",
      accent: "#D4AF37",
      accentSoft: "#E8D48B",
      border: "rgba(212,175,55,0.35)",
      heroOverlay: "linear-gradient(180deg, transparent, rgba(0,0,0,0.75))",
      fontDisplay: "'Playfair Display', serif",
      fontBody: "'Rubik', sans-serif",
      radius: "4px",
      shadow: "0 30px 90px rgba(0,0,0,0.55)",
      grain: false,
    },
  },
  {
    id: "garden-mist",
    name: "Garden Mist",
    nameHe: "ערפל גן",
    tagline: "עטיפה בוטנית וורוד־אבק",
    description: "מעטפה רכה עם עלווה, חותם ירוק ואפקטי גלילה אורגניים.",
    mood: "soft",
    previewImage: "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=900&q=80",
    heroImage: "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1600&q=85",
    galleryImages: [
      "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800&q=80",
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80",
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&q=80",
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&q=80",
    ],
    css: {
      bg: "#F3E9E4",
      bgDeep: "#E2D0C8",
      paper: "#FFFCF8",
      ink: "#3D2F2A",
      muted: "#8A7368",
      accent: "#C4877A",
      accentSoft: "#D9A99C",
      seal: "#7E9A6A",
      ribbon: "#B7C9A3",
      envelope: "#F0E2DA",
      envelopeFlap: "#E7D4CA",
      fontDisplay: "'Cormorant Garamond', serif",
      fontBody: "'Heebo', sans-serif",
      fontScript: "'Great Vibes', cursive",
    },
    weddingTheme: {
      bg: "#FFFCF8",
      bgAlt: "#F3E9E4",
      surface: "#FFFFFF",
      text: "#3D2F2A",
      textMuted: "#8A7368",
      accent: "#C4877A",
      accentSoft: "#D9A99C",
      border: "rgba(196,135,122,0.3)",
      heroOverlay: "linear-gradient(180deg, transparent, rgba(61,47,42,0.5))",
      fontDisplay: "'Cormorant Garamond', serif",
      fontBody: "'Heebo', sans-serif",
      radius: "28px",
      shadow: "0 22px 70px rgba(120,80,70,0.18)",
      grain: true,
    },
  },
  {
    id: "coastal-pearl",
    name: "Coastal Pearl",
    nameHe: "פנינת חוף",
    tagline: "פנינה־תכלת, גלים ואור חופי",
    description: "מעטפת פנינה, חותם קליפה וגלילת גל רכה עד החוף.",
    mood: "fresh",
    previewImage: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=900&q=80",
    heroImage: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1600&q=85",
    galleryImages: [
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&q=80",
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80",
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&q=80",
    ],
    css: {
      bg: "#D9E8EE",
      bgDeep: "#B7D0DB",
      paper: "#F8FBFC",
      ink: "#1F3A45",
      muted: "#5F7A86",
      accent: "#4A8FA0",
      accentSoft: "#8EBCC8",
      seal: "#E8DCC8",
      ribbon: "#A8C5CF",
      envelope: "#EAF3F6",
      envelopeFlap: "#DCEAEF",
      fontDisplay: "'Libre Baskerville', serif",
      fontBody: "'Assistant', sans-serif",
      fontScript: "'Great Vibes', cursive",
    },
    weddingTheme: {
      bg: "#F8FBFC",
      bgAlt: "#D9E8EE",
      surface: "#FFFFFF",
      text: "#1F3A45",
      textMuted: "#5F7A86",
      accent: "#4A8FA0",
      accentSoft: "#8EBCC8",
      border: "rgba(74,143,160,0.3)",
      heroOverlay: "linear-gradient(180deg, transparent, rgba(31,58,69,0.55))",
      fontDisplay: "'Libre Baskerville', serif",
      fontBody: "'Assistant', sans-serif",
      radius: "40px",
      shadow: "0 26px 70px rgba(40,80,100,0.2)",
      grain: true,
    },
  },
  {
    id: "amber-archive",
    name: "Amber Archive",
    nameHe: "ארכיון ענבר",
    tagline: "חותם שעווה, אלבום וינטג׳ וחום ספיה",
    description: "מעטפה עם חוט וחותם, גלריית סקראפבוק וגלילה נוסטלגית.",
    mood: "vintage",
    previewImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=80",
    heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=85",
    galleryImages: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80",
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&q=80",
    ],
    css: {
      bg: "#EFE4D2",
      bgDeep: "#D9C7A8",
      paper: "#F8F0E3",
      ink: "#3B2A1A",
      muted: "#7C6550",
      accent: "#B56B2A",
      accentSoft: "#D4A574",
      seal: "#A34B2A",
      ribbon: "#8B6B45",
      envelope: "#E4D3B8",
      envelopeFlap: "#D8C4A0",
      fontDisplay: "'Libre Baskerville', serif",
      fontBody: "'Alef', sans-serif",
      fontScript: "'Caveat', cursive",
    },
    weddingTheme: {
      bg: "#F8F0E3",
      bgAlt: "#EFE4D2",
      surface: "#FFF9F0",
      text: "#3B2A1A",
      textMuted: "#7C6550",
      accent: "#B56B2A",
      accentSoft: "#D4A574",
      border: "rgba(181,107,42,0.3)",
      heroOverlay: "linear-gradient(180deg, transparent, rgba(59,42,26,0.55))",
      fontDisplay: "'Libre Baskerville', serif",
      fontBody: "'Alef', sans-serif",
      radius: "8px",
      shadow: "0 20px 55px rgba(90,55,25,0.25)",
      grain: true,
    },
  },
];

export function getInteractiveWeddingTheme(id: string) {
  return INTERACTIVE_WEDDING_THEMES.find((t) => t.id === id) || null;
}

export function isInteractiveWeddingThemeId(id: string): id is InteractiveWeddingThemeId {
  return INTERACTIVE_WEDDING_THEMES.some((t) => t.id === id);
}
