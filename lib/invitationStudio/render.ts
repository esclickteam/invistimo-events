import type {
  LayerOverrides,
  RenderModel,
  StudioContent,
  StudioImages,
  StudioLayer,
  StudioSnapshot,
  StudioTemplate,
  TextRole,
} from "@/lib/invitationStudio/types";

const CONTENT_ROLES: TextRole[] = [
  "kicker",
  "hostNames",
  "eventType",
  "wording",
  "hebrewDate",
  "gregorianDate",
  "receptionTime",
  "ceremonyTime",
  "venueName",
  "venueAddress",
  "guestGreeting",
];

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function freezeSnapshot(
  template: StudioTemplate,
  input: {
    content?: Partial<StudioContent>;
    palette?: StudioTemplate["palette"];
    layerOverrides?: LayerOverrides;
    images?: StudioImages;
    personalGreeting?: boolean;
    capturedAt?: string;
  } = {}
): StudioSnapshot {
  return {
    capturedAt: input.capturedAt || new Date().toISOString(),
    templateId: template.id,
    templateVersion: template.version,
    name: template.name,
    category: template.category,
    style: template.style,
    free: template.free,
    width: template.width,
    height: template.height,
    motion: template.motion,
    formats: { ...template.formats, video: false },
    background: template.background,
    palette: { ...(input.palette || template.palette) },
    layers: clone(template.layers),
    content: { ...template.defaultContent, ...(input.content || {}) },
    layerOverrides: clone(input.layerOverrides || {}),
    images: { ...(template.defaultImages || {}), ...(input.images || {}) },
    personalGreeting: Boolean(input.personalGreeting),
    fontFace: template.fontFace || null,
  };
}

function mergeLayer(layer: StudioLayer, override: Partial<StudioLayer> | undefined) {
  if (!override) return layer;
  const next = { ...layer, ...override, id: layer.id, type: layer.type } as StudioLayer;
  return next;
}

export function isAllowedImageSource(src: string) {
  if (!src || src.length > 1_800_000) return false;
  if (/^data:image\/(png|jpeg|jpg|webp);base64,[a-z0-9+/=\s]+$/i.test(src)) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function renderSnapshot(
  snapshot: StudioSnapshot,
  guestName?: string
): RenderModel {
  const images = snapshot.images || {};
  snapshot.images = images;
  const layers = (snapshot.layers || []).map((layer) => {
    const merged = mergeLayer(layer, snapshot.layerOverrides?.[layer.id]);
    if (merged.type === "image") {
      const href =
        merged.role === "background" ? images.background || "" : images.photo || "";
      return {
        ...merged,
        href: href && isAllowedImageSource(href) ? href : "",
      };
    }
    if (merged.type !== "text") return merged;
    if (!CONTENT_ROLES.includes(merged.role)) return { ...merged, text: "" };
    let value = snapshot.content?.[merged.role] || "";
    if (merged.role === "guestGreeting") {
      const name = String(guestName || "").trim();
      if (!snapshot.personalGreeting || !name) return { ...merged, text: "" };
      value = value.replaceAll("{name}", name);
    }
    return { ...merged, text: value };
  });

  return {
    width: snapshot.width,
    height: snapshot.height,
    motion: snapshot.motion,
    background: snapshot.background,
    palette: snapshot.palette,
    fontFace: snapshot.fontFace || null,
    layers,
  };
}

export function publicSnapshot(snapshot: StudioSnapshot) {
  const copy = clone(snapshot);
  copy.images = copy.images || {};
  if (copy.images.photo && !isAllowedImageSource(copy.images.photo)) delete copy.images.photo;
  if (copy.images.background && !isAllowedImageSource(copy.images.background)) {
    delete copy.images.background;
  }
  return copy;
}
