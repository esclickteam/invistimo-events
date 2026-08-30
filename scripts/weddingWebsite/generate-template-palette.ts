/**
 * Builds config/weddingWebsite/templatePalette.generated.ts.
 *
 * Every wedding template hard-codes its palette as Tailwind arbitrary values
 * (`bg-[#C9A962]`, `border-[#C9A962]/30`, ...). Those hex values are the same
 * ones the template already declares in `WEDDING_TEMPLATES[].theme`, so we can
 * map each class token back to a theme role. The editor then re-colors a whole
 * template by emitting a small override stylesheet instead of rewriting markup.
 *
 * Run with: npm run weddingWebsite:palette
 */
import fs from "node:fs";
import path from "node:path";

import { WEDDING_TEMPLATES } from "../../config/weddingWebsite/templates";
import {
  WEDDING_PALETTE_UTILS,
  WEDDING_THEME_ROLES,
  type WeddingPaletteRule,
  type WeddingPaletteUtil,
  type WeddingThemeRole,
} from "../../lib/weddingWebsite/themeRoles";

const TEMPLATE_FILES: Record<string, string> = {
  "eternal-gold": "EternalGoldSite.tsx",
  "midnight-velvet": "MidnightVelvetSite.tsx",
  "garden-bloom": "GardenBloomSite.tsx",
  "coastal-breeze": "CoastalBreezeSite.tsx",
  "desert-rose": "DesertRoseSite.tsx",
  "minimal-noir": "MinimalNoirSite.tsx",
  "royal-ivory": "RoyalIvorySite.tsx",
  "sunset-blush": "SunsetBlushSite.tsx",
  "forest-enchanted": "ForestEnchantedSite.tsx",
  "modern-glass": "ModernGlassSite.tsx",
};

const TEMPLATES_DIR = path.join(process.cwd(), "components/wedding-website/templates");
const OUTPUT = path.join(process.cwd(), "config/weddingWebsite/templatePalette.generated.ts");

const CLASS_PATTERN = new RegExp(
  `\\b(${WEDDING_PALETTE_UTILS.join("|")})-\\[(#[0-9A-Fa-f]{6})\\](?:/(\\d{1,3}))?`,
  "g"
);

/**
 * The monochrome templates reach for Tailwind's built-in neutrals instead of
 * arbitrary values, so those names need resolving too.
 */
const NAMED_COLORS: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",
  "neutral-50": "#FAFAFA",
  "neutral-100": "#F5F5F5",
  "neutral-200": "#E5E5E5",
  "neutral-300": "#D4D4D4",
  "neutral-400": "#A3A3A3",
  "neutral-500": "#737373",
  "neutral-600": "#525252",
  "neutral-700": "#404040",
  "neutral-800": "#262626",
  "neutral-900": "#171717",
  "neutral-950": "#0A0A0A",
};

const NAMED_CLASS_PATTERN = new RegExp(
  `\\b(${WEDDING_PALETTE_UTILS.join("|")})-(${Object.keys(NAMED_COLORS).join("|")})(?:/(\\d{1,3}))?\\b`,
  "g"
);

/** Named colors only snap to a role when they are visually indistinguishable. */
const NAMED_MATCH_TOLERANCE = 20;

function toRgb(hex: string) {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function channelDistance(a: string, b: string) {
  const left = toRgb(a);
  const right = toRgb(b);
  return Math.max(...left.map((value, index) => Math.abs(value - right[index])));
}

function roleIndex(template: (typeof WEDDING_TEMPLATES)[number]) {
  const byHex = new Map<string, WeddingThemeRole>();
  for (const role of WEDDING_THEME_ROLES) {
    const value = template.theme[role];
    if (typeof value !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(value)) continue;
    // First role wins so a duplicated hex keeps its most meaningful role.
    if (!byHex.has(value.toUpperCase())) byHex.set(value.toUpperCase(), role);
  }
  return byHex;
}

function nearestRole(byHex: Map<string, WeddingThemeRole>, hex: string) {
  const exact = byHex.get(hex.toUpperCase());
  if (exact) return exact;
  let best: { role: WeddingThemeRole; distance: number } | null = null;
  for (const [candidate, role] of byHex) {
    const distance = channelDistance(candidate, hex);
    if (distance > NAMED_MATCH_TOLERANCE) continue;
    if (!best || distance < best.distance) best = { role, distance };
  }
  return best?.role;
}

function collect(templateId: string) {
  const template = WEDDING_TEMPLATES.find((item) => item.id === templateId);
  if (!template) throw new Error(`Unknown template: ${templateId}`);

  const file = TEMPLATE_FILES[templateId];
  const source = fs.readFileSync(path.join(TEMPLATES_DIR, file), "utf8");
  const byHex = roleIndex(template);

  const rules = new Map<string, WeddingPaletteRule>();
  let unmatched = 0;
  let matched = 0;
  let match: RegExpExecArray | null;

  function record(cls: string, util: WeddingPaletteUtil, role: WeddingThemeRole, alpha?: number) {
    matched += 1;
    if (rules.has(cls)) return;
    rules.set(cls, alpha === undefined ? { cls, util, role } : { cls, util, role, alpha });
  }

  while ((match = CLASS_PATTERN.exec(source))) {
    const util = match[1] as WeddingPaletteUtil;
    const hex = match[2];
    const alpha = match[3] ? Number(match[3]) : undefined;
    const role = byHex.get(hex.toUpperCase());
    if (!role) {
      unmatched += 1;
      continue;
    }
    record(`${util}-[${hex}]${alpha === undefined ? "" : `/${alpha}`}`, util, role, alpha);
  }

  while ((match = NAMED_CLASS_PATTERN.exec(source))) {
    const util = match[1] as WeddingPaletteUtil;
    const name = match[2];
    const alpha = match[3] ? Number(match[3]) : undefined;
    const role = nearestRole(byHex, NAMED_COLORS[name]);
    if (!role) {
      unmatched += 1;
      continue;
    }
    record(`${util}-${name}${alpha === undefined ? "" : `/${alpha}`}`, util, role, alpha);
  }

  const sorted = Array.from(rules.values()).sort((a, b) => a.cls.localeCompare(b.cls));
  return { templateId, rules: sorted, matched, unmatched };
}

function serialize(rule: WeddingPaletteRule) {
  const alpha = rule.alpha === undefined ? "" : `, alpha: ${rule.alpha}`;
  return `    { cls: ${JSON.stringify(rule.cls)}, util: ${JSON.stringify(rule.util)}, role: ${JSON.stringify(rule.role)}${alpha} },`;
}

function main() {
  const results = Object.keys(TEMPLATE_FILES).map(collect);

  const body = results
    .map(({ templateId, rules }) => {
      if (!rules.length) return `  ${JSON.stringify(templateId)}: [],`;
      return [`  ${JSON.stringify(templateId)}: [`, ...rules.map(serialize), "  ],"].join("\n");
    })
    .join("\n");

  const file = `// AUTO-GENERATED by scripts/weddingWebsite/generate-template-palette.ts
// Run \`npm run weddingWebsite:palette\` after changing template colors.
import type { WeddingTemplateId } from "@/types/weddingWebsite";
import type { WeddingPaletteRule } from "@/lib/weddingWebsite/themeRoles";

/**
 * Tailwind arbitrary-color classes each template renders, keyed by the theme
 * role they belong to. Used to build a scoped override stylesheet so a global
 * theme change repaints the whole site without touching template markup.
 */
export const WEDDING_TEMPLATE_PALETTE: Record<WeddingTemplateId, WeddingPaletteRule[]> = {
${body}
};
`;

  fs.writeFileSync(OUTPUT, file, "utf8");

  for (const result of results) {
    const total = result.matched + result.unmatched;
    const coverage = total ? Math.round((result.matched / total) * 100) : 100;
    console.log(
      `${result.templateId.padEnd(18)} ${String(result.rules.length).padStart(3)} rules  ${coverage}% of color classes mapped to theme roles`
    );
  }
  console.log(`\nWrote ${path.relative(process.cwd(), OUTPUT)}`);
}

main();
