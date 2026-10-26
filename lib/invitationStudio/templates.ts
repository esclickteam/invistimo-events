import { presetContent } from "@/lib/invitationStudio/content";
import {
  STUDIO_HEIGHT,
  STUDIO_WIDTH,
  type ImageLayer,
  type OrnamentLayer,
  type ShapeLayer,
  type StudioCategory,
  type StudioFont,
  type StudioLayer,
  type StudioPalette,
  type StudioStyle,
  type StudioTemplate,
  type TextLayer,
  type TextRole,
} from "@/lib/invitationStudio/types";

type Spec = {
  id: string;
  name: string;
  category: StudioCategory;
  style: StudioStyle;
  description: string;
  free?: boolean;
  sort: number;
  motion?: "none" | "soft";
  palette: StudioPalette;
  background?: "solid" | "wash";
  layers: StudioLayer[];
  content?: Partial<ReturnType<typeof presetContent>>;
};

function template(spec: Spec): StudioTemplate {
  const motion = spec.motion || "none";
  return {
    id: spec.id,
    name: spec.name,
    category: spec.category,
    style: spec.style,
    description: spec.description,
    free: Boolean(spec.free),
    published: true,
    sort: spec.sort,
    version: 1,
    width: STUDIO_WIDTH,
    height: STUDIO_HEIGHT,
    motion,
    formats: {
      static: true,
      digital: true,
      animated: motion === "soft",
      video: false,
    },
    palette: spec.palette,
    background: spec.background || "solid",
    defaultContent: presetContent(spec.category, spec.content),
    layers: spec.layers,
  };
}

function shape(partial: Omit<ShapeLayer, "type">): ShapeLayer {
  return { type: "shape", ...partial };
}
function ornament(partial: Omit<OrnamentLayer, "type">): OrnamentLayer {
  return { type: "ornament", ...partial };
}
function text(
  role: TextRole,
  partial: Omit<TextLayer, "type" | "role">
): TextLayer {
  return { type: "text", role, weight: 500, ...partial };
}
function photo(partial: Omit<ImageLayer, "type" | "role">): ImageLayer {
  return { type: "image", role: "photo", ...partial };
}

const paper = (hex: string, ink: string, accent: string, muted: string, deep: string): StudioPalette => ({
  paper: hex,
  ink,
  accent,
  muted,
  deep,
});

function framed(options: {
  inset?: number;
  nameSize?: number;
  font?: StudioFont;
  corners?: OrnamentLayer["motif"];
  centerpiece?: OrnamentLayer["motif"];
  photo?: boolean;
}): StudioLayer[] {
  const inset = options.inset ?? 56;
  const font = options.font || "Frank Ruhl Libre";
  const layers: StudioLayer[] = [
    shape({ id: "frame-outer", shape: "rect", x: inset, y: inset, w: 1080 - inset * 2, h: 1920 - inset * 2, fill: "none", strokeToken: "accent", strokeWidth: 2, radius: 8 }),
    shape({ id: "frame-inner", shape: "rect", x: inset + 18, y: inset + 18, w: 1080 - (inset + 18) * 2, h: 1920 - (inset + 18) * 2, fill: "none", strokeToken: "accent", strokeWidth: 1, radius: 4 }),
  ];
  if (options.corners) {
    const motif = options.corners;
    layers.push(
      ornament({ id: "c1", motif, x: 78, y: 78, w: 150, h: 150, token: "accent" }),
      ornament({ id: "c2", motif, x: 852, y: 78, w: 150, h: 150, token: "accent", flip: "x" }),
      ornament({ id: "c3", motif, x: 78, y: 1690, w: 150, h: 150, token: "accent", flip: "y" }),
      ornament({ id: "c4", motif, x: 852, y: 1690, w: 150, h: 150, token: "accent", flip: "both" })
    );
  }
  if (options.centerpiece) {
    layers.push(ornament({ id: "centerpiece", motif: options.centerpiece, x: 450, y: 210, w: 180, h: 180, token: "accent" }));
  }
  if (options.photo) {
    layers.push(photo({ id: "photo", x: 390, y: 250, w: 300, h: 300, radius: 150, frameToken: "accent" }));
  }
  const nameY = options.photo ? 620 : options.centerpiece ? 430 : 360;
  layers.push(
    text("kicker", { id: "kicker", x: 160, y: nameY - 90, w: 760, h: 50, fontFamily: font, fontSize: 28, token: "accent", align: "center", letterSpacing: 4 }),
    text("hostNames", { id: "hostNames", x: 120, y: nameY, w: 840, h: 180, fontFamily: font, fontSize: options.nameSize || 86, token: "ink", align: "center", weight: 700 }),
    ornament({ id: "rule", motif: "rule", x: 340, y: nameY + 190, w: 400, h: 28, token: "accent" }),
    text("eventType", { id: "eventType", x: 160, y: nameY + 250, w: 760, h: 70, fontFamily: font, fontSize: 36, token: "deep", align: "center" }),
    text("wording", { id: "wording", x: 170, y: nameY + 360, w: 740, h: 160, fontFamily: "Assistant", fontSize: 30, token: "ink", align: "center", lineHeight: 1.45 }),
    text("hebrewDate", { id: "hebrewDate", x: 160, y: nameY + 560, w: 760, h: 60, fontFamily: font, fontSize: 32, token: "ink", align: "center" }),
    text("gregorianDate", { id: "gregorianDate", x: 160, y: nameY + 630, w: 760, h: 50, fontFamily: "Assistant", fontSize: 26, token: "muted", align: "center" }),
    text("receptionTime", { id: "receptionTime", x: 140, y: nameY + 740, w: 380, h: 50, fontFamily: "Assistant", fontSize: 26, token: "ink", align: "center" }),
    text("ceremonyTime", { id: "ceremonyTime", x: 560, y: nameY + 740, w: 380, h: 50, fontFamily: "Assistant", fontSize: 26, token: "ink", align: "center" }),
    text("venueName", { id: "venueName", x: 160, y: nameY + 860, w: 760, h: 60, fontFamily: font, fontSize: 36, token: "deep", align: "center" }),
    text("venueAddress", { id: "venueAddress", x: 160, y: nameY + 930, w: 760, h: 50, fontFamily: "Assistant", fontSize: 26, token: "muted", align: "center" }),
    text("guestGreeting", { id: "guestGreeting", x: 160, y: 1680, w: 760, h: 50, fontFamily: "Assistant", fontSize: 24, token: "accent", align: "center" })
  );
  return layers;
}

function archLayout(font: StudioFont, nameSize: number): StudioLayer[] {
  return [
    shape({ id: "sky", shape: "rect", x: 0, y: 0, w: 1080, h: 760, fillToken: "deep" }),
    shape({ id: "arch", shape: "arch", x: 90, y: 120, w: 900, h: 980, fillToken: "paper", strokeToken: "accent", strokeWidth: 3 }),
    ornament({ id: "arch-line", motif: "arch", x: 140, y: 180, w: 800, h: 520, token: "accent" }),
    text("kicker", { id: "kicker", x: 180, y: 430, w: 720, h: 50, fontFamily: font, fontSize: 26, token: "accent", align: "center", letterSpacing: 3 }),
    text("hostNames", { id: "hostNames", x: 140, y: 520, w: 800, h: 200, fontFamily: font, fontSize: nameSize, token: "ink", align: "center", weight: 700 }),
    text("eventType", { id: "eventType", x: 180, y: 760, w: 720, h: 70, fontFamily: font, fontSize: 34, token: "deep", align: "center" }),
    text("wording", { id: "wording", x: 180, y: 1120, w: 720, h: 140, fontFamily: "Assistant", fontSize: 30, token: "ink", align: "center" }),
    text("hebrewDate", { id: "hebrewDate", x: 180, y: 1300, w: 720, h: 56, fontFamily: font, fontSize: 32, token: "ink", align: "center" }),
    text("gregorianDate", { id: "gregorianDate", x: 180, y: 1370, w: 720, h: 48, fontFamily: "Assistant", fontSize: 24, token: "muted", align: "center" }),
    ornament({ id: "rule", motif: "rule", x: 360, y: 1460, w: 360, h: 24, token: "accent" }),
    text("receptionTime", { id: "receptionTime", x: 140, y: 1520, w: 380, h: 48, fontFamily: "Assistant", fontSize: 26, token: "ink", align: "center" }),
    text("ceremonyTime", { id: "ceremonyTime", x: 560, y: 1520, w: 380, h: 48, fontFamily: "Assistant", fontSize: 26, token: "ink", align: "center" }),
    text("venueName", { id: "venueName", x: 160, y: 1620, w: 760, h: 56, fontFamily: font, fontSize: 34, token: "deep", align: "center" }),
    text("venueAddress", { id: "venueAddress", x: 160, y: 1690, w: 760, h: 46, fontFamily: "Assistant", fontSize: 24, token: "muted", align: "center" }),
    text("guestGreeting", { id: "guestGreeting", x: 160, y: 1780, w: 760, h: 44, fontFamily: "Assistant", fontSize: 22, token: "accent", align: "center" }),
  ];
}

function sideBand(font: StudioFont): StudioLayer[] {
  return [
    shape({ id: "band", shape: "rect", x: 760, y: 0, w: 320, h: 1920, fillToken: "deep" }),
    shape({ id: "gold-line", shape: "rect", x: 742, y: 0, w: 18, h: 1920, fillToken: "accent" }),
    ornament({ id: "medallion", motif: "medallion", x: 820, y: 160, w: 200, h: 200, token: "accent" }),
    ornament({ id: "branch", motif: "branch", x: 80, y: 120, w: 280, h: 90, token: "accent" }),
    text("kicker", { id: "kicker", x: 80, y: 280, w: 620, h: 50, fontFamily: "Assistant", fontSize: 24, token: "accent", align: "right", letterSpacing: 3 }),
    text("hostNames", { id: "hostNames", x: 70, y: 380, w: 640, h: 220, fontFamily: font, fontSize: 78, token: "ink", align: "right", weight: 700 }),
    text("eventType", { id: "eventType", x: 80, y: 640, w: 620, h: 70, fontFamily: font, fontSize: 36, token: "deep", align: "right" }),
    text("wording", { id: "wording", x: 80, y: 760, w: 620, h: 180, fontFamily: "Assistant", fontSize: 30, token: "ink", align: "right", lineHeight: 1.5 }),
    shape({ id: "hairline", shape: "line", x: 80, y: 980, w: 560, h: 0, strokeToken: "accent", strokeWidth: 1 }),
    text("hebrewDate", { id: "hebrewDate", x: 80, y: 1040, w: 620, h: 56, fontFamily: font, fontSize: 32, token: "ink", align: "right" }),
    text("gregorianDate", { id: "gregorianDate", x: 80, y: 1110, w: 620, h: 48, fontFamily: "Assistant", fontSize: 24, token: "muted", align: "right" }),
    text("receptionTime", { id: "receptionTime", x: 80, y: 1240, w: 620, h: 48, fontFamily: "Assistant", fontSize: 28, token: "ink", align: "right" }),
    text("ceremonyTime", { id: "ceremonyTime", x: 80, y: 1310, w: 620, h: 48, fontFamily: "Assistant", fontSize: 28, token: "ink", align: "right" }),
    text("venueName", { id: "venueName", x: 80, y: 1460, w: 620, h: 60, fontFamily: font, fontSize: 36, token: "deep", align: "right" }),
    text("venueAddress", { id: "venueAddress", x: 80, y: 1540, w: 620, h: 48, fontFamily: "Assistant", fontSize: 26, token: "muted", align: "right" }),
    text("guestGreeting", { id: "guestGreeting", x: 80, y: 1720, w: 620, h: 50, fontFamily: "Assistant", fontSize: 24, token: "accent", align: "right" }),
  ];
}

function splitBlock(font: StudioFont, nameSize: number): StudioLayer[] {
  return [
    shape({ id: "top", shape: "rect", x: 0, y: 0, w: 1080, h: 860, fillToken: "deep" }),
    shape({ id: "slab", shape: "rect", x: 80, y: 180, w: 920, h: 8, fillToken: "accent" }),
    text("kicker", { id: "kicker", x: 100, y: 240, w: 880, h: 50, fontFamily: "Assistant", fontSize: 24, token: "accent", align: "right", letterSpacing: 4 }),
    text("hostNames", { id: "hostNames", x: 90, y: 340, w: 900, h: 240, fontFamily: font, fontSize: nameSize, token: "paper", align: "right", weight: 700 }),
    text("eventType", { id: "eventType", x: 100, y: 640, w: 880, h: 70, fontFamily: font, fontSize: 36, token: "accent", align: "right" }),
    text("wording", { id: "wording", x: 110, y: 960, w: 860, h: 160, fontFamily: "Assistant", fontSize: 32, token: "ink", align: "right" }),
    text("hebrewDate", { id: "hebrewDate", x: 110, y: 1180, w: 860, h: 56, fontFamily: font, fontSize: 34, token: "ink", align: "right" }),
    text("gregorianDate", { id: "gregorianDate", x: 110, y: 1260, w: 860, h: 48, fontFamily: "Assistant", fontSize: 26, token: "muted", align: "right" }),
    ornament({ id: "dots", motif: "dots", x: 140, y: 1360, w: 800, h: 30, token: "accent" }),
    text("receptionTime", { id: "receptionTime", x: 110, y: 1440, w: 400, h: 50, fontFamily: "Assistant", fontSize: 26, token: "ink", align: "right" }),
    text("ceremonyTime", { id: "ceremonyTime", x: 540, y: 1440, w: 420, h: 50, fontFamily: "Assistant", fontSize: 26, token: "ink", align: "right" }),
    text("venueName", { id: "venueName", x: 110, y: 1560, w: 860, h: 56, fontFamily: font, fontSize: 36, token: "deep", align: "right" }),
    text("venueAddress", { id: "venueAddress", x: 110, y: 1640, w: 860, h: 46, fontFamily: "Assistant", fontSize: 26, token: "muted", align: "right" }),
    text("guestGreeting", { id: "guestGreeting", x: 110, y: 1760, w: 860, h: 46, fontFamily: "Assistant", fontSize: 24, token: "accent", align: "right" }),
  ];
}

function editorial(font: StudioFont): StudioLayer[] {
  return [
    shape({ id: "tick", shape: "rect", x: 120, y: 140, w: 64, h: 4, fillToken: "accent" }),
    text("kicker", { id: "kicker", x: 120, y: 180, w: 840, h: 40, fontFamily: "Assistant", fontSize: 22, token: "accent", align: "right", letterSpacing: 6 }),
    text("hostNames", { id: "hostNames", x: 90, y: 320, w: 900, h: 280, fontFamily: font, fontSize: 96, token: "ink", align: "right", weight: 700, lineHeight: 1.05 }),
    text("eventType", { id: "eventType", x: 120, y: 680, w: 840, h: 60, fontFamily: font, fontSize: 32, token: "deep", align: "right" }),
    text("wording", { id: "wording", x: 120, y: 820, w: 700, h: 180, fontFamily: "Assistant", fontSize: 30, token: "ink", align: "right", lineHeight: 1.5 }),
    shape({ id: "hair", shape: "line", x: 120, y: 1080, w: 280, h: 0, strokeToken: "accent", strokeWidth: 1 }),
    text("hebrewDate", { id: "hebrewDate", x: 120, y: 1160, w: 840, h: 50, fontFamily: font, fontSize: 30, token: "ink", align: "right" }),
    text("gregorianDate", { id: "gregorianDate", x: 120, y: 1230, w: 840, h: 44, fontFamily: "Assistant", fontSize: 22, token: "muted", align: "right" }),
    text("receptionTime", { id: "receptionTime", x: 120, y: 1380, w: 840, h: 44, fontFamily: "Assistant", fontSize: 26, token: "ink", align: "right" }),
    text("ceremonyTime", { id: "ceremonyTime", x: 120, y: 1450, w: 840, h: 44, fontFamily: "Assistant", fontSize: 26, token: "ink", align: "right" }),
    text("venueName", { id: "venueName", x: 120, y: 1600, w: 840, h: 56, fontFamily: font, fontSize: 34, token: "deep", align: "right" }),
    text("venueAddress", { id: "venueAddress", x: 120, y: 1680, w: 840, h: 44, fontFamily: "Assistant", fontSize: 24, token: "muted", align: "right" }),
    text("guestGreeting", { id: "guestGreeting", x: 120, y: 1800, w: 840, h: 40, fontFamily: "Assistant", fontSize: 22, token: "accent", align: "right" }),
  ];
}

function floralWash(font: StudioFont, withPhoto: boolean): StudioLayer[] {
  const layers: StudioLayer[] = [
    ornament({ id: "b1", motif: "botanical", x: 40, y: 40, w: 220, h: 320, token: "accent" }),
    ornament({ id: "b2", motif: "botanical", x: 820, y: 40, w: 220, h: 320, token: "accent", flip: "x" }),
    ornament({ id: "b3", motif: "branch", x: 80, y: 1580, w: 420, h: 140, token: "muted" }),
    ornament({ id: "b4", motif: "branch", x: 580, y: 1620, w: 420, h: 120, token: "accent", flip: "x" }),
  ];
  if (withPhoto) {
    layers.push(photo({ id: "photo", x: 340, y: 220, w: 400, h: 400, radius: 200, frameToken: "accent" }));
  }
  const y = withPhoto ? 680 : 360;
  layers.push(
    text("kicker", { id: "kicker", x: 150, y, w: 780, h: 46, fontFamily: font, fontSize: 26, token: "accent", align: "center" }),
    text("hostNames", { id: "hostNames", x: 120, y: y + 80, w: 840, h: 180, fontFamily: font, fontSize: 80, token: "ink", align: "center", weight: 700 }),
    text("eventType", { id: "eventType", x: 160, y: y + 280, w: 760, h: 60, fontFamily: font, fontSize: 34, token: "deep", align: "center" }),
    text("wording", { id: "wording", x: 180, y: y + 380, w: 720, h: 140, fontFamily: "Miriam Libre", fontSize: 30, token: "ink", align: "center" }),
    text("hebrewDate", { id: "hebrewDate", x: 160, y: y + 560, w: 760, h: 50, fontFamily: font, fontSize: 30, token: "ink", align: "center" }),
    text("gregorianDate", { id: "gregorianDate", x: 160, y: y + 630, w: 760, h: 44, fontFamily: "Assistant", fontSize: 24, token: "muted", align: "center" }),
    text("receptionTime", { id: "receptionTime", x: 140, y: y + 740, w: 380, h: 46, fontFamily: "Assistant", fontSize: 24, token: "ink", align: "center" }),
    text("ceremonyTime", { id: "ceremonyTime", x: 560, y: y + 740, w: 380, h: 46, fontFamily: "Assistant", fontSize: 24, token: "ink", align: "center" }),
    text("venueName", { id: "venueName", x: 160, y: y + 840, w: 760, h: 52, fontFamily: font, fontSize: 32, token: "deep", align: "center" }),
    text("venueAddress", { id: "venueAddress", x: 160, y: y + 910, w: 760, h: 44, fontFamily: "Assistant", fontSize: 24, token: "muted", align: "center" }),
    text("guestGreeting", { id: "guestGreeting", x: 160, y: 1760, w: 760, h: 44, fontFamily: "Assistant", fontSize: 22, token: "accent", align: "center" })
  );
  return layers;
}

function mandala(font: StudioFont): StudioLayer[] {
  return [
    ornament({ id: "mandala", motif: "mandala", x: 180, y: 120, w: 720, h: 720, token: "accent", opacity: 0.9 }),
    text("kicker", { id: "kicker", x: 220, y: 360, w: 640, h: 40, fontFamily: font, fontSize: 24, token: "deep", align: "center" }),
    text("hostNames", { id: "hostNames", x: 200, y: 430, w: 680, h: 160, fontFamily: font, fontSize: 68, token: "ink", align: "center", weight: 700 }),
    text("eventType", { id: "eventType", x: 220, y: 620, w: 640, h: 50, fontFamily: font, fontSize: 30, token: "deep", align: "center" }),
    text("wording", { id: "wording", x: 180, y: 920, w: 720, h: 140, fontFamily: "Assistant", fontSize: 30, token: "ink", align: "center" }),
    text("hebrewDate", { id: "hebrewDate", x: 180, y: 1120, w: 720, h: 50, fontFamily: font, fontSize: 32, token: "ink", align: "center" }),
    text("gregorianDate", { id: "gregorianDate", x: 180, y: 1190, w: 720, h: 44, fontFamily: "Assistant", fontSize: 24, token: "muted", align: "center" }),
    ornament({ id: "diamonds", motif: "diamond", x: 490, y: 1280, w: 100, h: 100, token: "accent" }),
    text("receptionTime", { id: "receptionTime", x: 140, y: 1420, w: 380, h: 46, fontFamily: "Assistant", fontSize: 26, token: "ink", align: "center" }),
    text("ceremonyTime", { id: "ceremonyTime", x: 560, y: 1420, w: 380, h: 46, fontFamily: "Assistant", fontSize: 26, token: "ink", align: "center" }),
    text("venueName", { id: "venueName", x: 160, y: 1540, w: 760, h: 54, fontFamily: font, fontSize: 34, token: "deep", align: "center" }),
    text("venueAddress", { id: "venueAddress", x: 160, y: 1620, w: 760, h: 44, fontFamily: "Assistant", fontSize: 24, token: "muted", align: "center" }),
    text("guestGreeting", { id: "guestGreeting", x: 160, y: 1760, w: 760, h: 44, fontFamily: "Assistant", fontSize: 22, token: "accent", align: "center" }),
  ];
}

function agenda(font: StudioFont): StudioLayer[] {
  return [
    shape({ id: "bar", shape: "rect", x: 0, y: 0, w: 1080, h: 220, fillToken: "deep" }),
    ornament({ id: "grid", motif: "grid", x: 80, y: 280, w: 120, h: 120, token: "accent" }),
    text("kicker", { id: "kicker", x: 80, y: 70, w: 920, h: 40, fontFamily: "Assistant", fontSize: 22, token: "accent", align: "right", letterSpacing: 4 }),
    text("hostNames", { id: "hostNames", x: 80, y: 110, w: 920, h: 80, fontFamily: font, fontSize: 48, token: "paper", align: "right", weight: 700 }),
    text("eventType", { id: "eventType", x: 230, y: 300, w: 770, h: 70, fontFamily: font, fontSize: 40, token: "ink", align: "right" }),
    text("wording", { id: "wording", x: 100, y: 460, w: 880, h: 140, fontFamily: "Assistant", fontSize: 30, token: "ink", align: "right" }),
    shape({ id: "row1", shape: "rect", x: 80, y: 680, w: 920, h: 140, fill: "none", strokeToken: "muted", strokeWidth: 1, radius: 18 }),
    text("hebrewDate", { id: "hebrewDate", x: 110, y: 710, w: 860, h: 46, fontFamily: font, fontSize: 30, token: "ink", align: "right" }),
    text("gregorianDate", { id: "gregorianDate", x: 110, y: 760, w: 860, h: 36, fontFamily: "Assistant", fontSize: 22, token: "muted", align: "right" }),
    shape({ id: "row2", shape: "rect", x: 80, y: 860, w: 440, h: 150, fill: "none", strokeToken: "muted", strokeWidth: 1, radius: 18 }),
    shape({ id: "row3", shape: "rect", x: 560, y: 860, w: 440, h: 150, fill: "none", strokeToken: "muted", strokeWidth: 1, radius: 18 }),
    text("receptionTime", { id: "receptionTime", x: 100, y: 910, w: 400, h: 70, fontFamily: "Assistant", fontSize: 26, token: "ink", align: "center" }),
    text("ceremonyTime", { id: "ceremonyTime", x: 580, y: 910, w: 400, h: 70, fontFamily: "Assistant", fontSize: 26, token: "ink", align: "center" }),
    shape({ id: "row4", shape: "rect", x: 80, y: 1060, w: 920, h: 180, fillToken: "deep", radius: 18 }),
    text("venueName", { id: "venueName", x: 110, y: 1100, w: 860, h: 56, fontFamily: font, fontSize: 34, token: "paper", align: "right" }),
    text("venueAddress", { id: "venueAddress", x: 110, y: 1170, w: 860, h: 40, fontFamily: "Assistant", fontSize: 24, token: "accent", align: "right" }),
    text("guestGreeting", { id: "guestGreeting", x: 100, y: 1360, w: 880, h: 50, fontFamily: "Assistant", fontSize: 24, token: "accent", align: "right" }),
    ornament({ id: "stars", motif: "stars", x: 160, y: 1560, w: 760, h: 80, token: "muted", opacity: 0.35 }),
  ];
}

function blackTie(): StudioLayer[] {
  return [
    shape({ id: "mat", shape: "rect", x: 48, y: 48, w: 984, h: 1824, fill: "none", strokeToken: "accent", strokeWidth: 1 }),
    shape({ id: "mat2", shape: "rect", x: 70, y: 70, w: 940, h: 1780, fill: "none", strokeToken: "accent", strokeWidth: 0.6, opacity: 0.7 }),
    ornament({ id: "rings", motif: "rings", x: 430, y: 180, w: 220, h: 120, token: "accent" }),
    text("kicker", { id: "kicker", x: 140, y: 360, w: 800, h: 40, fontFamily: "Assistant", fontSize: 22, token: "accent", align: "center", letterSpacing: 8 }),
    text("hostNames", { id: "hostNames", x: 100, y: 460, w: 880, h: 200, fontFamily: "Frank Ruhl Libre", fontSize: 84, token: "paper", align: "center", weight: 700 }),
    ornament({ id: "rule", motif: "rule", x: 340, y: 700, w: 400, h: 24, token: "accent" }),
    text("eventType", { id: "eventType", x: 160, y: 780, w: 760, h: 60, fontFamily: "David Libre", fontSize: 34, token: "accent", align: "center" }),
    text("wording", { id: "wording", x: 180, y: 900, w: 720, h: 150, fontFamily: "Assistant", fontSize: 28, token: "paper", align: "center" }),
    text("hebrewDate", { id: "hebrewDate", x: 160, y: 1120, w: 760, h: 50, fontFamily: "David Libre", fontSize: 30, token: "paper", align: "center" }),
    text("gregorianDate", { id: "gregorianDate", x: 160, y: 1190, w: 760, h: 44, fontFamily: "Assistant", fontSize: 22, token: "muted", align: "center" }),
    text("receptionTime", { id: "receptionTime", x: 140, y: 1340, w: 380, h: 46, fontFamily: "Assistant", fontSize: 24, token: "paper", align: "center" }),
    text("ceremonyTime", { id: "ceremonyTime", x: 560, y: 1340, w: 380, h: 46, fontFamily: "Assistant", fontSize: 24, token: "paper", align: "center" }),
    text("venueName", { id: "venueName", x: 160, y: 1500, w: 760, h: 54, fontFamily: "Frank Ruhl Libre", fontSize: 34, token: "accent", align: "center" }),
    text("venueAddress", { id: "venueAddress", x: 160, y: 1580, w: 760, h: 40, fontFamily: "Assistant", fontSize: 22, token: "muted", align: "center" }),
    text("guestGreeting", { id: "guestGreeting", x: 160, y: 1720, w: 760, h: 40, fontFamily: "Assistant", fontSize: 22, token: "accent", align: "center" }),
  ];
}

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  template({
    id: "wedding-gold-frame",
    name: "מסגרת זהב",
    category: "wedding",
    style: "gold",
    description: "מסגרת כפולה, פינות וטבעות על נייר שנהב.",
    sort: 10,
    palette: paper("#fbf6ee", "#2c241c", "#b8893d", "#cbb89a", "#6d542c"),
    layers: framed({ corners: "corner", centerpiece: "rings", nameSize: 88 }),
  }),
  template({
    id: "wedding-ivory-classic",
    name: "שנהב קלאסי",
    category: "wedding",
    style: "classic",
    description: "הזמנה מסורתית עם קו כפול ומונוגרמה.",
    sort: 20,
    free: true,
    palette: paper("#f7f1e6", "#3a2c22", "#8d6a3f", "#d9cbb6", "#5c4632"),
    layers: framed({ corners: "diamond", centerpiece: "medallion", font: "David Libre", nameSize: 80, inset: 70 }),
  }),
  template({
    id: "wedding-blush-romance",
    name: "סומק רומנטי",
    category: "wedding",
    style: "romantic",
    description: "רקע ורוד, ענפים ותמונה עגולה.",
    sort: 30,
    motion: "soft",
    background: "wash",
    palette: paper("#fff5f6", "#5a3140", "#c4818d", "#f3d5db", "#8d4d5d"),
    layers: floralWash("Miriam Libre", true),
  }),
  template({
    id: "wedding-modern-split",
    name: "פס מודרני",
    category: "wedding",
    style: "modern",
    description: "פס כהה וטיפוגרפיה גדולה מיושרת לימין.",
    sort: 40,
    palette: paper("#f4f1ec", "#1d1c1a", "#9a7b4f", "#d5d0c8", "#242220"),
    layers: sideBand("Heebo"),
  }),
  template({
    id: "wedding-black-tie",
    name: "עניבה שחורה",
    category: "wedding",
    style: "black",
    description: "רקע שחור, מסגרת זהב דקה וטבעות.",
    sort: 50,
    palette: paper("#141311", "#f6f1e8", "#d4b483", "#8d8378", "#2a241c"),
    layers: blackTie(),
  }),
  template({
    id: "wedding-white-minimal",
    name: "לבן שקט",
    category: "wedding",
    style: "white",
    description: "הרבה אוויר, קו דק אחד ושמות גדולים.",
    sort: 60,
    free: true,
    palette: paper("#ffffff", "#1c1c1c", "#b7b1a8", "#e7e4df", "#3a3a3a"),
    layers: editorial("Alef"),
  }),
  template({
    id: "wedding-pastel-garden",
    name: "גן פסטל",
    category: "wedding",
    style: "pastel",
    description: "עלים רכים בפינות וטקסט ממורכז.",
    sort: 70,
    motion: "soft",
    background: "wash",
    palette: paper("#f3f7f2", "#2f4634", "#7ea184", "#d5e4d6", "#4f6b55"),
    layers: floralWash("Frank Ruhl Libre", false),
  }),
  template({
    id: "wedding-arch-luxury",
    name: "קשת יוקרתית",
    category: "wedding",
    style: "luxury",
    description: "קשת אדריכלית על רקע עמוק.",
    sort: 80,
    motion: "soft",
    palette: paper("#f8f3ea", "#2a2118", "#c6a15b", "#e6d7bf", "#3d2e22"),
    layers: archLayout("Frank Ruhl Libre", 82),
  }),
  template({
    id: "henna-burgundy",
    name: "בורדו חינה",
    category: "henna",
    style: "luxury",
    description: "בלוק בורדו ושמות בהירים.",
    sort: 90,
    palette: paper("#fbf4ef", "#f8efe6", "#e2b56a", "#e7cfc3", "#6e2433"),
    layers: splitBlock("Frank Ruhl Libre", 84),
    content: { eventType: "ערב חינה" },
  }),
  template({
    id: "henna-gold-mandala",
    name: "מנדלת זהב",
    category: "henna",
    style: "gold",
    description: "מנדלה מקורית סביב השמות.",
    sort: 100,
    motion: "soft",
    palette: paper("#fff8ee", "#4a2c16", "#c8963e", "#efd7b0", "#7a4b22"),
    layers: mandala("David Libre"),
  }),
  template({
    id: "henna-night",
    name: "ליל חינה",
    category: "henna",
    style: "black",
    description: "לילה כהה עם קו זהב וטיפוגרפיה בהירה.",
    sort: 110,
    palette: paper("#1a1214", "#f8efe8", "#e0b15a", "#a08a86", "#3a2428"),
    layers: blackTie(),
  }),
  template({
    id: "henna-cream-classic",
    name: "שמנת מסורתית",
    category: "henna",
    style: "classic",
    description: "מסגרת כפולה ופינות על נייר שמנת.",
    sort: 120,
    palette: paper("#f8f1e4", "#4b2f24", "#a36b45", "#e4d3c0", "#6a4332"),
    layers: framed({ corners: "corner", centerpiece: "diamond", font: "David Libre", inset: 64 }),
  }),
  template({
    id: "henna-rose",
    name: "ורד חינה",
    category: "henna",
    style: "floral",
    description: "ענפים ורדים ותמונה אישית.",
    sort: 130,
    background: "wash",
    palette: paper("#fff1f3", "#6a2e3c", "#d07a88", "#f6d5db", "#8d4454"),
    layers: floralWash("Miriam Libre", true),
  }),
  template({
    id: "bnai-navy",
    name: "כחול תורה",
    category: "bnai",
    style: "classic",
    description: "פס כחול עמוק וטקסט מסודר.",
    sort: 140,
    palette: paper("#f4f6f8", "#1c2a44", "#b9965a", "#c9d1dc", "#243656"),
    layers: sideBand("David Libre"),
    content: { eventType: "בר המצווה", hostNames: "איתמר לוי" },
  }),
  template({
    id: "bnai-gold-frame",
    name: "מסגרת מצווה",
    category: "bnai",
    style: "gold",
    description: "מסגרת זהב ומונוגרמה לחגיגת מצווה.",
    sort: 150,
    palette: paper("#fbf7ef", "#2d2618", "#b68b3c", "#e3d4b4", "#6a5430"),
    layers: framed({ corners: "diamond", centerpiece: "medallion", nameSize: 72 }),
  }),
  template({
    id: "bnai-line",
    name: "קו נקי",
    category: "bnai",
    style: "minimal",
    description: "מינימליזם עם שם גדול וקו דק.",
    sort: 160,
    free: true,
    palette: paper("#fbfbfb", "#20242b", "#8d93a0", "#e6e8ec", "#3c4250"),
    layers: editorial("Assistant"),
  }),
  template({
    id: "bat-blush",
    name: "בת מצווה בסומק",
    category: "bnai",
    style: "romantic",
    description: "פרחים רכים ושם במרכז.",
    sort: 170,
    motion: "soft",
    background: "wash",
    palette: paper("#fff6f8", "#5c3148", "#d392a6", "#f4d7e0", "#8a4e68"),
    layers: floralWash("Miriam Libre", false),
    content: { hostNames: "נועה שחר", eventType: "בת המצווה" },
  }),
  template({
    id: "bnai-white",
    name: "לבן של שבת",
    category: "bnai",
    style: "white",
    description: "נייר לבן, מסגרת דקה ואותיות כהות.",
    sort: 180,
    palette: paper("#ffffff", "#22262e", "#c5b89a", "#eceae4", "#3e4654"),
    layers: framed({ inset: 80, font: "Alef", nameSize: 70, corners: "corner" }),
  }),
  template({
    id: "brit-sky",
    name: "שמיים לברית",
    category: "brit",
    style: "pastel",
    description: "קשת בהירה וטקסט רגוע.",
    sort: 190,
    palette: paper("#f3f8fb", "#1e3d55", "#7ea8c4", "#d5e6f0", "#2f5874"),
    layers: archLayout("Assistant", 74),
  }),
  template({
    id: "brit-gold-soft",
    name: "ברית זהובה",
    category: "brit",
    style: "luxury",
    description: "מסגרת עדינה וטבעת מונוגרמה.",
    sort: 200,
    palette: paper("#fbf8f2", "#3d3428", "#c4a36a", "#e7dcc8", "#6d5a3e"),
    layers: framed({ centerpiece: "medallion", corners: "corner", font: "David Libre", nameSize: 72 }),
  }),
  template({
    id: "brita-blossom",
    name: "בריתה פורחת",
    category: "brit",
    style: "floral",
    description: "ענפים ושם עגול לבריתה.",
    sort: 210,
    background: "wash",
    motion: "soft",
    palette: paper("#fff7f4", "#6b3b46", "#e0a090", "#f6ddd4", "#8d554c"),
    layers: floralWash("Miriam Libre", true),
    content: { hostNames: "מאיה אור", eventType: "בריתה" },
  }),
  template({
    id: "brit-modern",
    name: "ברית מודרנית",
    category: "brit",
    style: "modern",
    description: "בלוק עליון כהה ושורות מידע נקיות.",
    sort: 220,
    palette: paper("#f7f5f2", "#f4efe8", "#c6a36a", "#ddd6cc", "#243038"),
    layers: splitBlock("Heebo", 76),
  }),
  template({
    id: "birthday-gold",
    name: "חגיגת זהב",
    category: "birthday",
    style: "luxury",
    description: "כוכבים וקו זהב ליום הולדת.",
    sort: 230,
    motion: "soft",
    palette: paper("#fffaf3", "#2e2418", "#c9973a", "#efd8b0", "#6e5424"),
    layers: [
      ...framed({ centerpiece: "stars", nameSize: 78, font: "Secular One" }),
    ],
  }),
  template({
    id: "birthday-dots",
    name: "נקודות פסטל",
    category: "birthday",
    style: "pastel",
    description: "נקודות צבעוניות ומבנה פתוח.",
    sort: 240,
    motion: "soft",
    background: "wash",
    palette: paper("#f7f4ff", "#3a315c", "#9b8ad6", "#e3dcf8", "#564b86"),
    layers: [
      ornament({ id: "dots-top", motif: "dots", x: 140, y: 160, w: 800, h: 40, token: "accent" }),
      ornament({ id: "stars", motif: "stars", x: 180, y: 240, w: 720, h: 90, token: "muted" }),
      ...editorial("Rubik").slice(2),
    ],
  }),
  template({
    id: "birthday-glam",
    name: "גלאם שחור",
    category: "birthday",
    style: "black",
    description: "רקע שחור, זהב וכוכבים.",
    sort: 250,
    palette: paper("#121212", "#f7f2ea", "#e1c27a", "#8a8176", "#2c2824"),
    layers: [
      ...blackTie().slice(0, 2),
      ornament({ id: "stars", motif: "stars", x: 300, y: 160, w: 480, h: 90, token: "accent" }),
      ...blackTie().slice(3),
    ],
  }),
  template({
    id: "birthday-garden",
    name: "גן יום הולדת",
    category: "birthday",
    style: "floral",
    description: "עלי פינה ותמונה במרכז.",
    sort: 260,
    background: "wash",
    palette: paper("#f4f8f1", "#2d4a32", "#6f9a62", "#d7e6cf", "#456848"),
    layers: floralWash("Frank Ruhl Libre", true),
  }),
  template({
    id: "birthday-white",
    name: "יום הולדת לבן",
    category: "birthday",
    style: "minimal",
    description: "לבן נקי עם שם ענק.",
    sort: 270,
    palette: paper("#fcfcfc", "#222", "#b9b3aa", "#eceae6", "#444"),
    layers: editorial("Secular One"),
  }),
  template({
    id: "business-navy",
    name: "רשת נייבי",
    category: "business",
    style: "modern",
    description: "שורות מידע ומסגרת גיאומטרית להשקה.",
    sort: 280,
    palette: paper("#f5f7fa", "#142033", "#c4a46a", "#d5dbe3", "#1c2c44"),
    layers: agenda("Assistant"),
  }),
  template({
    id: "business-summit",
    name: "פסגת זהב",
    category: "business",
    style: "gold",
    description: "בר עליון כהה ושם בזהב.",
    sort: 290,
    palette: paper("#f7f4ef", "#f6f1e7", "#c6a15a", "#ddd4c6", "#1e2430"),
    layers: splitBlock("Heebo", 70),
  }),
  template({
    id: "business-white",
    name: "לבן עסקי",
    category: "business",
    style: "white",
    description: "הזמנה עסקית מינימלית על נייר לבן.",
    sort: 300,
    free: true,
    palette: paper("#ffffff", "#1a1d22", "#9aa3af", "#e6e8eb", "#2c3138"),
    layers: editorial("Assistant"),
  }),
  template({
    id: "business-charcoal",
    name: "פחם",
    category: "business",
    style: "black",
    description: "פחם וזהב לאירוע ערב.",
    sort: 310,
    palette: paper("#1c1e22", "#f4f1ea", "#d2b074", "#8d9096", "#2e3238"),
    layers: blackTie(),
  }),
  template({
    id: "business-sage",
    name: "מרווה",
    category: "business",
    style: "classic",
    description: "פס ירוק מרווה וטקסט מסודר.",
    sort: 320,
    palette: paper("#f6f7f4", "#243129", "#8aa184", "#d5ddd2", "#314439"),
    layers: sideBand("Rubik"),
  }),
];

export function getStudioTemplate(id: string) {
  return STUDIO_TEMPLATES.find((item) => item.id === id) || null;
}
