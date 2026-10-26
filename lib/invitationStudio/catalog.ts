import { STUDIO_TEMPLATES } from "@/lib/invitationStudio/templates";
import type { StudioTemplate } from "@/lib/invitationStudio/types";
import { clone } from "@/lib/invitationStudio/render";

export type TemplateOverride = {
  key: string;
  source?: "catalog" | "custom";
  hidden?: boolean;
  free?: boolean | null;
  sort?: number | null;
  name?: string | null;
  category?: StudioTemplate["category"] | null;
  style?: StudioTemplate["style"] | null;
  description?: string | null;
  template?: StudioTemplate | null;
};

export function mergeCatalog(overrides: TemplateOverride[] = []): StudioTemplate[] {
  const map = new Map(STUDIO_TEMPLATES.map((item) => [item.id, clone(item)]));
  const custom: StudioTemplate[] = [];

  for (const override of overrides) {
    if (override.source === "custom" && override.template) {
      const next = clone(override.template);
      next.published = override.hidden ? false : next.published !== false;
      custom.push(next);
      continue;
    }
    const current = map.get(override.key);
    if (!current) continue;
    if (override.template) {
      const replaced = clone(override.template);
      replaced.id = current.id;
      map.set(override.key, {
        ...current,
        ...replaced,
        id: current.id,
        published: override.hidden ? false : replaced.published !== false,
      });
      continue;
    }
    map.set(override.key, {
      ...current,
      name: override.name || current.name,
      description: override.description || current.description,
      category: override.category || current.category,
      style: override.style || current.style,
      free: override.free == null ? current.free : Boolean(override.free),
      sort: override.sort == null ? current.sort : Number(override.sort),
      published: override.hidden ? false : current.published,
    });
  }

  return [...map.values(), ...custom].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "he"));
}

export function publicCatalog(overrides: TemplateOverride[] = []) {
  return mergeCatalog(overrides).filter((item) => item.published);
}
