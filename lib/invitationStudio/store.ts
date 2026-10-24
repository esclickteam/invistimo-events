import { connectDB } from "@/lib/db";
import InvitationStudioSettings from "@/models/InvitationStudioSettings";
import InvitationStudioTemplate from "@/models/InvitationStudioTemplate";
import {
  DEFAULT_DESIGNED_INVITATION_PRICE_ILS,
  sanitizeCatalogPrice,
} from "@/lib/invitationStudio/entitlement";
import { mergeCatalog, publicCatalog, type TemplateOverride } from "@/lib/invitationStudio/catalog";

export async function readStudioSettings() {
  await connectDB();
  const doc = await InvitationStudioSettings.findOne({ key: "designedInvitation" }).lean();
  return {
    priceIls: sanitizeCatalogPrice(
      doc?.priceIls ?? DEFAULT_DESIGNED_INVITATION_PRICE_ILS
    ),
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
  return { priceIls: price };
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
