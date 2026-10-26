import { STUDIO_PLATES, type StudioPlate } from "@/lib/invitationStudio/plates";

export type PlateOverride = {
  key: string;
  hidden?: boolean;
  free?: boolean | null;
  sort?: number | null;
  name?: string | null;
  description?: string | null;
  defaultMusic?: boolean | null;
};

export function mergePlates(overrides: PlateOverride[] = []): Array<StudioPlate & { published: boolean }> {
  const byKey = new Map(overrides.map((item) => [item.key, item]));
  return STUDIO_PLATES.map((plate) => {
    const override = byKey.get(plate.id);
    if (!override) return { ...plate, published: true };
    return {
      ...plate,
      name: override.name || plate.name,
      description: override.description || plate.description,
      free: override.free == null ? plate.free : Boolean(override.free),
      sort: override.sort == null ? plate.sort : Number(override.sort),
      defaultMusic:
        override.defaultMusic == null ? Boolean(plate.defaultMusic) : Boolean(override.defaultMusic),
      published: !override.hidden,
    };
  }).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "he"));
}

export function publicPlates(overrides: PlateOverride[] = []) {
  return mergePlates(overrides).filter((item) => item.published && item.listed !== false);
}
