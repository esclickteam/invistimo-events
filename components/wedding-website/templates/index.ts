import type { ComponentType } from "react";
import type { WeddingTemplateId } from "@/types/weddingWebsite";
import type { TemplateProps } from "../shared/weddingUtils";
import CoastalBreezeSite from "./CoastalBreezeSite";
import DesertRoseSite from "./DesertRoseSite";
import EternalGoldSite from "./EternalGoldSite";
import ForestEnchantedSite from "./ForestEnchantedSite";
import GardenBloomSite from "./GardenBloomSite";
import MidnightVelvetSite from "./MidnightVelvetSite";
import MinimalNoirSite from "./MinimalNoirSite";
import ModernGlassSite from "./ModernGlassSite";
import RoyalIvorySite from "./RoyalIvorySite";
import SunsetBlushSite from "./SunsetBlushSite";

export const WEDDING_TEMPLATE_SITES: Record<
  WeddingTemplateId,
  ComponentType<TemplateProps>
> = {
  "eternal-gold": EternalGoldSite,
  "midnight-velvet": MidnightVelvetSite,
  "garden-bloom": GardenBloomSite,
  "coastal-breeze": CoastalBreezeSite,
  "desert-rose": DesertRoseSite,
  "minimal-noir": MinimalNoirSite,
  "royal-ivory": RoyalIvorySite,
  "sunset-blush": SunsetBlushSite,
  "forest-enchanted": ForestEnchantedSite,
  "modern-glass": ModernGlassSite,
};

export function getWeddingTemplateSite(id: string) {
  return WEDDING_TEMPLATE_SITES[id as WeddingTemplateId] ?? null;
}
