export const STUDIO_WIDTH = 1080;
export const STUDIO_HEIGHT = 1920;

export const STUDIO_CATEGORIES = [
  "wedding",
  "henna",
  "bnai",
  "brit",
  "birthday",
  "business",
] as const;

export const STUDIO_STYLES = [
  "luxury",
  "classic",
  "modern",
  "romantic",
  "floral",
  "minimal",
  "gold",
  "black",
  "white",
  "pastel",
] as const;

export type StudioCategory = (typeof STUDIO_CATEGORIES)[number];
export type StudioStyle = (typeof STUDIO_STYLES)[number];
export type StudioMotion = "none" | "soft";

export type StudioFont =
  | "Frank Ruhl Libre"
  | "David Libre"
  | "Miriam Libre"
  | "Alef"
  | "Assistant"
  | "Heebo"
  | "Rubik"
  | "Secular One";

export type PaletteToken = "paper" | "ink" | "accent" | "muted" | "deep";

export type StudioPalette = Record<PaletteToken, string>;

export type TextRole =
  | "kicker"
  | "hostNames"
  | "eventType"
  | "wording"
  | "hebrewDate"
  | "gregorianDate"
  | "receptionTime"
  | "ceremonyTime"
  | "venueName"
  | "venueAddress"
  | "guestGreeting";

export type StudioContent = Record<TextRole, string>;

export type ShapeLayer = {
  id: string;
  type: "shape";
  shape: "rect" | "ellipse" | "line" | "arch";
  x: number;
  y: number;
  w: number;
  h: number;
  fillToken?: PaletteToken;
  fill?: string;
  strokeToken?: PaletteToken;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  opacity?: number;
  rotate?: number;
};

export type OrnamentLayer = {
  id: string;
  type: "ornament";
  motif:
    | "corner"
    | "botanical"
    | "rings"
    | "diamond"
    | "stars"
    | "dots"
    | "branch"
    | "medallion"
    | "rule"
    | "mandala"
    | "arch"
    | "grid";
  x: number;
  y: number;
  w: number;
  h: number;
  token?: PaletteToken;
  color?: string;
  opacity?: number;
  rotate?: number;
  flip?: "x" | "y" | "both";
};

export type TextLayer = {
  id: string;
  type: "text";
  role: TextRole;
  x: number;
  y: number;
  w: number;
  h: number;
  fontFamily: StudioFont | string;
  fontSize: number;
  token?: PaletteToken;
  color?: string;
  align: "right" | "center" | "left";
  weight?: number;
  letterSpacing?: number;
  lineHeight?: number;
};

export type ImageLayer = {
  id: string;
  type: "image";
  role: "photo" | "background";
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
  frameToken?: PaletteToken;
};

export type StudioLayer = ShapeLayer | OrnamentLayer | TextLayer | ImageLayer;

export type StudioFormats = {
  static: true;
  digital: true;
  animated: boolean;
  /** Video export is not implemented and must not be offered for purchase. */
  video: false;
};

export type StudioFontFace = {
  family: string;
  dataUrl: string;
};

export type StudioTemplate = {
  id: string;
  name: string;
  category: StudioCategory;
  style: StudioStyle;
  description: string;
  free: boolean;
  published: boolean;
  sort: number;
  version: number;
  width: number;
  height: number;
  motion: StudioMotion;
  formats: StudioFormats;
  palette: StudioPalette;
  background: "solid" | "wash";
  defaultContent: StudioContent;
  defaultImages?: StudioImages;
  fontFace?: StudioFontFace | null;
  layers: StudioLayer[];
};

export type LayerOverrides = Record<string, Partial<StudioLayer>>;

export type StudioImages = {
  photo?: string;
  background?: string;
};

export type StudioSnapshot = {
  capturedAt: string;
  templateId: string;
  templateVersion: number;
  name: string;
  category: StudioCategory;
  style: StudioStyle;
  free: boolean;
  width: number;
  height: number;
  motion: StudioMotion;
  formats: StudioFormats;
  background: "solid" | "wash";
  palette: StudioPalette;
  layers: StudioLayer[];
  content: StudioContent;
  layerOverrides: LayerOverrides;
  images: StudioImages;
  personalGreeting: boolean;
  fontFace?: StudioFontFace | null;
};

export type RenderModel = {
  width: number;
  height: number;
  motion: StudioMotion;
  background: "solid" | "wash";
  palette: StudioPalette;
  fontFace?: StudioFontFace | null;
  layers: Array<StudioLayer & { text?: string; href?: string }>;
};

export const CATEGORY_LABELS: Record<StudioCategory, string> = {
  wedding: "חתונות",
  henna: "חינות",
  bnai: "בר ובת מצווה",
  brit: "בריתות ובריתות לבנות",
  birthday: "ימי הולדת",
  business: "אירועים עסקיים",
};

export const STYLE_LABELS: Record<StudioStyle, string> = {
  luxury: "יוקרתי",
  classic: "קלאסי",
  modern: "מודרני",
  romantic: "רומנטי",
  floral: "פרחוני",
  minimal: "מינימליסטי",
  gold: "זהב",
  black: "שחור",
  white: "לבן",
  pastel: "פסטל",
};
