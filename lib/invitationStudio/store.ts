import { connectDB } from "@/lib/db";
import InvitationStudioSettings from "@/models/InvitationStudioSettings";
import InvitationStudioTemplate from "@/models/InvitationStudioTemplate";
import {
  DEFAULT_DESIGNED_INVITATION_PRICE_ILS,
  sanitizeCatalogPrice,
} from "@/lib/invitationStudio/entitlement";
import { mergeCatalog, publicCatalog, type TemplateOverride } from "@/lib/invitationStudio/catalog";
import { mergePlates, publicPlates, type PlateOverride } from "@/lib/invitationStudio/plateCatalog";

export type StudioMusicLibrary = {
  cueId: string;
  label: string;
  dataUrl: string;
  fileName: string;
  rightsConfirmed: boolean;
};

const DEFAULT_MUSIC: StudioMusicLibrary = {
  cueId: "evening-motif",
  label: "מוטיב ערב",
  dataUrl: "",
  fileName: "",
  rightsConfirmed: true,
};

function sanitizeMusic(raw: Partial<StudioMusicLibrary> | null | undefined): StudioMusicLibrary {
  const dataUrl = String(raw?.dataUrl || "");
  const allowed =
    !dataUrl ||
    /^data:audio\/(mpeg|wav|webm|mp4|x-m4a);base64,[a-z0-9+/=\s]+$/i.test(dataUrl);
  const safeUrl = allowed && dataUrl.length < 2_200_000 ? dataUrl : "";
  return {
    cueId: String(raw?.cueId || DEFAULT_MUSIC.cueId).slice(0, 40) || DEFAULT_MUSIC.cueId,
    label: String(raw?.label || DEFAULT_MUSIC.label).slice(0, 80) || DEFAULT_MUSIC.label,
    dataUrl: safeUrl,
    fileName: String(raw?.fileName || "").slice(0, 120),
    rightsConfirmed: safeUrl ? Boolean(raw?.rightsConfirmed) : true,
  };
}

function sanitizePlateOverrides(raw: unknown): PlateOverride[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as PlateOverride;
      return {
        key: String(row?.key || "").slice(0, 64),
        hidden: Boolean(row?.hidden),
        free: row?.free == null ? null : Boolean(row.free),
        sort: row?.sort == null || !Number.isFinite(Number(row.sort)) ? null : Number(row.sort),
        name: row?.name ? String(row.name).slice(0, 80) : null,
        description: row?.description ? String(row.description).slice(0, 240) : null,
        defaultMusic: row?.defaultMusic == null ? null : Boolean(row.defaultMusic),
      };
    })
    .filter((item) => item.key);
}

export async function readStudioSettings() {
  await connectDB();
  const doc = await InvitationStudioSettings.findOne({ key: "designedInvitation" }).lean();
  return {
    priceIls: sanitizeCatalogPrice(doc?.priceIls ?? DEFAULT_DESIGNED_INVITATION_PRICE_ILS),
    plates: sanitizePlateOverrides(doc?.plates),
    music: sanitizeMusic(doc?.music as StudioMusicLibrary | undefined),
  };
}

export async function writeStudioPrice(priceIls: number) {
  await connectDB();
  const price = sanitizeCatalogPrice(priceIls);
  await InvitationStudioSettings.findOneAndUpdate(
    { key: "designedInvitation" },
    { $set: { priceIls: price, key: "designedInvitation" } },
    { upsert: true, new: true }
  );
  return readStudioSettings();
}

export async function writePlateOverride(patch: PlateOverride) {
  await connectDB();
  const settings = await readStudioSettings();
  const next = settings.plates.filter((item) => item.key !== patch.key);
  next.push({
    key: patch.key,
    hidden: Boolean(patch.hidden),
    free: patch.free == null ? null : Boolean(patch.free),
    sort: patch.sort == null || !Number.isFinite(Number(patch.sort)) ? null : Number(patch.sort),
    name: patch.name ? String(patch.name).slice(0, 80) : null,
    description: patch.description ? String(patch.description).slice(0, 240) : null,
    defaultMusic: patch.defaultMusic == null ? null : Boolean(patch.defaultMusic),
  });
  await InvitationStudioSettings.findOneAndUpdate(
    { key: "designedInvitation" },
    { $set: { plates: next, key: "designedInvitation" } },
    { upsert: true, new: true }
  );
  return readStudioSettings();
}

export async function writeMusicLibrary(patch: Partial<StudioMusicLibrary>) {
  await connectDB();
  const current = await readStudioSettings();
  const music = sanitizeMusic({ ...current.music, ...patch });
  if (music.dataUrl && !music.rightsConfirmed) {
    throw new Error("MUSIC_LICENSE_REQUIRED");
  }
  await InvitationStudioSettings.findOneAndUpdate(
    { key: "designedInvitation" },
    { $set: { music, key: "designedInvitation" } },
    { upsert: true, new: true }
  );
  return readStudioSettings();
}

export async function clearMusicLibraryUpload() {
  return writeMusicLibrary({ dataUrl: "", fileName: "", rightsConfirmed: true });
}

export async function readOverrides(): Promise<TemplateOverride[]> {
  await connectDB();
  const docs = await InvitationStudioTemplate.find({}).lean();
  return docs.map((doc) => ({
    key: String(doc.key),
    source: doc.source === "custom" ? "custom" : "catalog",
    hidden: Boolean(doc.hidden),
    free: doc.free == null ? null : Boolean(doc.free),
    sort: doc.sort == null ? null : Number(doc.sort),
    name: doc.name || null,
    category: (doc.category || null) as TemplateOverride["category"],
    style: (doc.style || null) as TemplateOverride["style"],
    description: doc.description || null,
    template: doc.template || null,
  }));
}

export async function readMergedCatalog(options?: { includeHidden?: boolean }) {
  const overrides = await readOverrides();
  return options?.includeHidden ? mergeCatalog(overrides) : publicCatalog(overrides);
}

export async function readMergedPlates(options?: { includeHidden?: boolean }) {
  const settings = await readStudioSettings();
  return options?.includeHidden ? mergePlates(settings.plates) : publicPlates(settings.plates);
}
