import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { WEDDING_TEMPLATES } from "../../config/weddingWebsite/templates";
import { WEDDING_TEMPLATE_PALETTE } from "../../config/weddingWebsite/templatePalette.generated";
import { WEDDING_DEMO_CONTENT } from "../../config/weddingWebsite/demoContent";
import {
  buildWeddingThemeCss,
  escapeClassSelector,
  hasWeddingThemeOverride,
  resolveWeddingPalette,
  sanitizeWeddingThemeOverride,
  weddingThemeRoleCoverage,
} from "../../lib/weddingWebsite/editorTheme";
import {
  buildMobileCss,
  buildSectionStyleCss,
  buildTextStyleCss,
} from "../../lib/weddingWebsite/siteCss";
import {
  EDITOR_SECTIONS,
  canHideSection,
  editorSectionLabel,
  moveInOrder,
  resolveSectionOrder,
} from "../../lib/weddingWebsite/editorSections";
import { collectEditorWarnings } from "../../lib/weddingWebsite/editorWarnings";
import { countContentChanges } from "../../lib/weddingWebsite/editorDiff";
import { contrastRatio } from "../../lib/weddingWebsite/styles";
import { sanitizeSectionStyle } from "../../lib/weddingWebsite/styles";
import { mergeWeddingWebsiteContent } from "../../lib/weddingWebsite/content";
import { normalizeWeddingMediaSlot } from "../../lib/weddingWebsite/media";
import type { WeddingDemoContent } from "../../types/weddingWebsite";

function read(rel: string) {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

const ETERNAL_GOLD = WEDDING_TEMPLATES.find((template) => template.id === "eternal-gold")!;

test("the generated palette maps template classes back to real theme colors", () => {
  for (const template of WEDDING_TEMPLATES) {
    const rules = WEDDING_TEMPLATE_PALETTE[template.id];
    assert.ok(Array.isArray(rules), `missing palette for ${template.id}`);
    for (const rule of rules) {
      const hex = /\[(#[0-9A-Fa-f]{6})\]/.exec(rule.cls)?.[1];
      if (!hex) continue; // named Tailwind colors are matched by proximity
      assert.equal(
        hex.toLowerCase(),
        String(template.theme[rule.role]).toLowerCase(),
        `${template.id}: ${rule.cls} claims role ${rule.role}`
      );
    }
  }
});

test("every template can be recolored without editing template markup", () => {
  for (const template of WEDDING_TEMPLATES) {
    const coverage = weddingThemeRoleCoverage(template.id);
    assert.ok(coverage.size > 0, `${template.id} exposes no themeable role`);
    const css = buildWeddingThemeCss(template, { colors: { accent: "#123456" } });
    if (!coverage.has("accent")) continue;
    assert.match(css, /#123456|rgb\(18 52 86/, `${template.id} did not repaint its accent`);
    assert.match(css, /^\.ww-themed /m, `${template.id} theme css must stay scoped`);
  }
});

test("theme css outranks Tailwind classes and preserves opacity modifiers", () => {
  const css = buildWeddingThemeCss(ETERNAL_GOLD, { colors: { accent: "#3D8BBA" } });

  // Two classes in the selector beat Tailwind's single-class utility.
  assert.match(css, /\.ww-themed \.bg-\\\[\\#C9A962\\\]\{background-color:#3D8BBA\}/);
  assert.match(css, /\.border-\\\[\\#C9A962\\\]\\\/30\{border-color:rgb\(61 139 186 \/ 0\.3\)\}/);
  // Gradient stops go through Tailwind's custom properties, not plain colors.
  assert.match(css, /--tw-gradient-from:#3D8BBA var\(--tw-gradient-from-position\)/);
  assert.doesNotMatch(css, /!important/);
});

test("changing the text colour does not repaint hero scrims or dark panels", () => {
  // Eternal Gold reuses its ink hex (#2A2118) for the hero gradient and for a
  // dark section background, so the text role must stay limited to `color`.
  const css = buildWeddingThemeCss(ETERNAL_GOLD, { colors: { text: "#B91C1C" } });
  assert.match(css, /\.text-\\\[\\#2A2118\\\]\{color:#B91C1C\}/);
  assert.doesNotMatch(css, /--tw-gradient-from/);
  assert.doesNotMatch(css, /background-color:#B91C1C/);

  // Accent colours are meant to carry through borders and gradients.
  const accent = buildWeddingThemeCss(ETERNAL_GOLD, { colors: { accent: "#B91C1C" } });
  assert.match(accent, /--tw-gradient-from:#B91C1C/);
  assert.match(accent, /border-color:#B91C1C/);
  assert.match(accent, /background-color:#B91C1C/);
});

test("theme fonts apply site-wide but stay beatable by a single-element override", () => {
  const css = buildWeddingThemeCss(ETERNAL_GOLD, {
    headingFont: "Frank Ruhl Libre",
    bodyFont: "Assistant",
  });
  assert.match(css, /\.ww-themed \.wedding-website-root,\.ww-themed \[class\*="font-\['"\]/);
  assert.match(css, /Frank Ruhl Libre/);
  assert.match(css, /Assistant/);

  const pathCss = buildTextStyleCss({ coupleNames: { fontFamily: "'Heebo', sans-serif" } });
  // `.ww-site [data-ww-path]` is (0,2,0) and emitted after the theme block, so a
  // per-element font wins over the global heading font.
  assert.match(pathCss, /^\.ww-site \[data-ww-path="coupleNames"\]\{font-family:'Heebo', sans-serif\}$/);
});

test("radius and spacing presets never touch editor chrome", () => {
  const css = buildWeddingThemeCss(ETERNAL_GOLD, { radius: "sharp", spacing: "airy" });
  assert.match(css, /\[class\*="rounded"\]:not\(\[class\*="rounded-full"\]\):not\(\.ww-editor-ui\)/);
  assert.match(css, /section\[id\]:not\(#hero\):not\(#footer\)/);
  assert.equal(buildWeddingThemeCss(ETERNAL_GOLD, { radius: "template", spacing: "template" }), "");
});

test("theme overrides are sanitized before they reach the database", () => {
  assert.equal(sanitizeWeddingThemeOverride(null), undefined);
  assert.equal(sanitizeWeddingThemeOverride({ colors: { accent: "red" } }), undefined);
  assert.equal(
    sanitizeWeddingThemeOverride({ headingFont: "<script>alert(1)</script>" }),
    undefined
  );
  assert.deepEqual(sanitizeWeddingThemeOverride({ colors: { accent: "#abc" } }), {
    colors: { accent: "#AABBCC" },
  });
  assert.deepEqual(sanitizeWeddingThemeOverride({ radius: "nope" as never }), undefined);
  assert.equal(hasWeddingThemeOverride({ radius: "template" }), false);
  assert.equal(hasWeddingThemeOverride({ colors: { bg: "#ffffff" } }), true);
});

test("theme survives a save round trip and overrides the template palette", () => {
  const merged = mergeWeddingWebsiteContent(WEDDING_DEMO_CONTENT, {
    theme: { colors: { accent: "#6B9E78" }, bodyFont: "Rubik", radius: "round" },
  });
  assert.equal(merged.theme?.colors?.accent, "#6B9E78");
  assert.equal(merged.theme?.bodyFont, "Rubik");
  assert.equal(merged.theme?.radius, "round");

  const palette = resolveWeddingPalette(ETERNAL_GOLD, merged.theme);
  assert.equal(palette.accent, "#6B9E78");
  assert.equal(palette.text, ETERNAL_GOLD.theme.text);
});

test("editor and published site render through the same stylesheet builder", () => {
  const hydrator = read("components/wedding-website/editable/SiteHydrator.tsx");
  const renderer = read("components/wedding-website/WeddingTemplateSiteRenderer.tsx");

  assert.match(hydrator, /buildWeddingThemeCss/);
  assert.match(hydrator, /buildSectionStyleCss/);
  assert.match(hydrator, /buildTextStyleCss/);
  assert.match(hydrator, /@media \(max-width: 767px\)/);
  // The editor's mobile canvas is narrow but the viewport is not, so mobile
  // tweaks also need a container query to preview correctly.
  assert.match(hydrator, /@container \(max-width: 700px\)/);
  assert.match(renderer, /WEDDING_THEME_SCOPE/);
  assert.match(renderer, /weddingThemeCssVars/);
});

test("section design settings compile to css for both devices", () => {
  const content = {
    sectionStyles: {
      gallery: { columns: 4, gap: "16px", radius: "32px", imageFit: "contain", align: "center" },
      hero: { heroHeight: 90, heroHeightMobile: 70, overlayOpacity: 60 },
    },
    mobileStyles: { coupleNames: { fontSize: "28px" } },
    media: { hero: { type: "image", src: "https://x/y.jpg", positionMobile: "30% 20%" } },
  } as unknown as WeddingDemoContent;

  const css = buildSectionStyleCss(content);
  assert.match(css, /#gallery \[class\*="grid-cols"\]\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}/);
  assert.match(css, /#gallery \[class\*="columns-"\]\{columns:4\}/);
  assert.match(css, /#gallery \[class\*="gap-"\]\{gap:16px\}/);
  assert.match(css, /object-fit:contain/);
  assert.match(css, /#hero\{min-height:90svh\}/);
  assert.match(css, /#hero \[class\*="bg-gradient-to"\]\{opacity:0\.6\}/);

  const mobile = buildMobileCss(content);
  assert.match(mobile, /\[data-ww-path="coupleNames"\]\{font-size:28px\}/);
  assert.match(mobile, /#hero\{min-height:70svh\}/);
  assert.match(mobile, /\[data-ww-slot="hero"\]\{object-position:30% 20%\}/);
});

test("mobile focal points reach real devices, not only the editor preview", () => {
  const media = read("components/wedding-website/editable/WeddingMedia.tsx");
  assert.match(media, /data-ww-slot=\{slotId \|\| undefined\}/);
  const slot = normalizeWeddingMediaSlot({
    type: "image",
    src: "https://res.cloudinary.com/demo/image/upload/a.jpg",
    positionMobile: "10% 90%",
  });
  assert.equal(slot?.positionMobile, "10% 90%");
});

test("section style values are clamped and rejected when nonsense", () => {
  const clean = sanitizeSectionStyle({
    columns: 99,
    gap: "16px; background:url(javascript:alert(1))",
    radius: "12px",
    align: "middle",
    heroHeight: 5000,
    overlayOpacity: -20,
    imageFit: "weird",
  });
  assert.equal(clean.columns, 6);
  assert.equal(clean.gap, undefined);
  assert.equal(clean.radius, "12px");
  assert.equal(clean.align, undefined);
  assert.equal(clean.heroHeight, 130);
  assert.equal(clean.overlayOpacity, 0);
  assert.equal(clean.imageFit, undefined);
});

test("class selectors are escaped so arbitrary Tailwind values stay valid css", () => {
  assert.equal(escapeClassSelector("border-[#C9A962]/30"), "border-\\[\\#C9A962\\]\\/30");
  assert.equal(escapeClassSelector("bg-black"), "bg-black");
});

test("the section registry covers every renderable section and protects core ones", () => {
  const ids = EDITOR_SECTIONS.map((section) => section.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ["hero", "countdown", "invitation", "our-story", "how-we-met", "proposal",
    "gallery", "video", "event-details", "schedule", "location", "dress-code", "accommodations",
    "transportation", "faq", "rsvp", "guestbook"] as const) {
    assert.ok(ids.includes(id), `missing section ${id}`);
  }

  assert.equal(canHideSection("hero"), false);
  assert.equal(canHideSection("rsvp"), false);
  assert.equal(canHideSection("location"), false);
  assert.equal(canHideSection("gallery"), true);
  assert.equal(editorSectionLabel("guestbook"), "הודעה לזוג");

  // RSVP exposes design only; guest limits and statuses stay in the real system.
  const rsvp = EDITOR_SECTIONS.find((section) => section.id === "rsvp")!;
  assert.deepEqual(rsvp.settings, ["background", "spacing", "align", "radius", "typography"]);
});

test("a stale saved order can never hide or duplicate a section", () => {
  const order = resolveSectionOrder({
    sectionOrder: ["gallery", "hero", "not-a-section"],
  } as unknown as WeddingDemoContent);
  assert.equal(order[0], "gallery");
  assert.equal(order[1], "hero");
  assert.equal(new Set(order).size, order.length);
  assert.equal(order.length, EDITOR_SECTIONS.length);
  assert.ok(!order.includes("not-a-section" as never));

  assert.deepEqual(moveInOrder(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
  assert.deepEqual(moveInOrder(["a", "b", "c"], 0, 9), ["a", "b", "c"]);
});

test("responsive warnings fire without blocking the edit", () => {
  const warnings = collectEditorWarnings(
    {
      ...WEDDING_DEMO_CONTENT,
      coupleNames: "אלכסנדרה־מרי ובנימין־יהונתן משפחת רוזנברג",
      styles: { heroSubtitle: { fontSize: "72px" } },
      heroSubtitle: "משפט פתיחה ארוך במיוחד שיישבר במובייל",
      media: { hero: { type: "image", src: "https://x/y.jpg", zoom: 2.4 } },
      galleryImages: [],
      sections: { ...WEDDING_DEMO_CONTENT.sections, rsvp: false },
    } as unknown as WeddingDemoContent,
    ETERNAL_GOLD
  );

  const ids = warnings.map((warning) => warning.id);
  assert.ok(ids.includes("long-couple-names"));
  assert.ok(ids.includes("huge-font-heroSubtitle"));
  assert.ok(ids.includes("zoom-hero"));
  assert.ok(ids.includes("empty-gallery"));
  assert.ok(ids.includes("rsvp-hidden"));
  assert.equal(
    warnings.find((warning) => warning.id === "rsvp-hidden")?.level,
    "warning"
  );

  const clean = collectEditorWarnings(WEDDING_DEMO_CONTENT, ETERNAL_GOLD);
  assert.ok(!clean.some((warning) => warning.id === "long-couple-names"));
});

test("weak contrast is reported against the actual section background", () => {
  const warnings = collectEditorWarnings(
    {
      ...WEDDING_DEMO_CONTENT,
      sectionStyles: { invitation: { backgroundColor: "#2A2118" } },
    } as unknown as WeddingDemoContent,
    ETERNAL_GOLD
  );
  assert.ok(warnings.some((warning) => warning.id === "contrast-invitation"));
  assert.ok(contrastRatio("#2A2118", "#2A2118") < 3);
  assert.ok(contrastRatio("#111111", "#ffffff") > 4.5);
});

test("publish counts real changes so the button can name them", () => {
  const published = { ...WEDDING_DEMO_CONTENT };
  assert.equal(countContentChanges(published, published), 0);

  const draft = {
    ...published,
    heroSubtitle: "משפט חדש",
    styles: { ...(published.styles || {}), coupleNames: { color: "#123456" } },
    media: { hero: { type: "image", src: "https://x/new.jpg" } },
  } as unknown as WeddingDemoContent;
  assert.equal(countContentChanges(draft, published), 3);

  // Event-owned fields are mirrored, not edited, so they never count.
  assert.equal(
    countContentChanges({ ...published, venueName: "אולם אחר" } as WeddingDemoContent, published),
    0
  );
});

test("the editor chrome speaks Hebrew and is grouped into view / edit / publish", () => {
  const topBar = read("components/wedding-website/editor/EditorTopBar.tsx");
  assert.match(topBar, /<EditorGroup title="תצוגה">/);
  assert.match(topBar, /<EditorGroup title="עריכה">/);
  assert.match(topBar, /<EditorGroup title="פרסום">/);
  assert.match(topBar, /label="מחשב"/);
  assert.match(topBar, /label="נייד"/);
  assert.match(topBar, /תצוגה מקדימה/);
  assert.match(topBar, /פרסום \$\{unpublishedCount\} שינויים/);
  assert.match(topBar, /האתר מעודכן/);

  // No English chrome left in the user-facing strings.
  assert.doesNotMatch(topBar, />\s*Publish\s*</);
  assert.doesNotMatch(topBar, />\s*Desktop\s*</);
  assert.doesNotMatch(topBar, />\s*Mobile\s*</);

  // Switching template moved out of the undo/redo row.
  assert.doesNotMatch(topBar, /החלפת תבנית/);
});

test("the section list is a real drag and drop list with an arrow fallback", () => {
  const list = read("components/wedding-website/editor/EditorSectionList.tsx");
  assert.match(list, /@dnd-kit\/core/);
  assert.match(list, /@dnd-kit\/sortable/);
  assert.match(list, /useSortable/);
  assert.match(list, /KeyboardSensor/);
  assert.match(list, /sortableKeyboardCoordinates/);
  assert.match(list, /העלאה למעלה/);
  assert.match(list, /הורדה למטה/);
  assert.match(list, /aria-label=\{visible \? `הסתרת המקטע/);
  assert.match(list, /מוסתר/);
  // Section duplication is intentionally not offered yet.
  assert.doesNotMatch(list, /שכפול/);
});

test("editor controls are keyboard reachable and labelled", () => {
  const ui = read("components/wedding-website/editor/EditorUI.tsx");
  assert.match(ui, /aria-label/);
  assert.match(ui, /aria-pressed/);
  assert.match(ui, /focus-visible:outline/);
  assert.match(ui, /min-h-\[36px\]/);
  assert.match(ui, /role="dialog"/);
  assert.match(ui, /aria-modal="true"/);
  assert.match(ui, /event\.key === "Escape"/);
  assert.match(ui, /event\.key !== "Tab"/);
});

test("keyboard shortcuts cover undo, redo, save and deselect", () => {
  const editor = read("components/wedding-website/editor/WeddingVisualEditor.tsx");
  assert.match(editor, /event\.key === "Escape"/);
  assert.match(editor, /setSelection\(null\)/);
  assert.match(editor, /key === "z"/);
  assert.match(editor, /event\.shiftKey\) redo\(\)/);
  assert.match(editor, /key === "s"/);
  assert.match(editor, /saveNow\(\)/);
  assert.match(editor, /AUTOSAVE_DELAY_MS/);
});

test("zoom, collapse and a calm canvas replace the old black frame", () => {
  const editor = read("components/wedding-website/editor/WeddingVisualEditor.tsx");
  const topBar = read("components/wedding-website/editor/EditorTopBar.tsx");
  const sidebar = read("components/wedding-website/editor/EditorSidebar.tsx");

  assert.match(topBar, /EDITOR_ZOOM_OPTIONS/);
  assert.match(topBar, /"50%"/);
  assert.match(topBar, /"75%"/);
  assert.match(topBar, /"100%"/);
  assert.match(topBar, /התאמה/);
  assert.match(editor, /zoom === "fit"/);
  assert.match(editor, /DESKTOP_CANVAS_WIDTH/);
  assert.match(editor, /MOBILE_CANVAS_WIDTH/);
  // Device frame only for the mobile canvas.
  assert.match(editor, /device === "mobile" \? "rounded-\[28px\] ring-8 ring-black\/40"/);
  assert.match(sidebar, /פתיחת פאנל המקטעים/);
  assert.match(editor, /setSidebarOpen/);

  // The dashboard header is not a fixed height, so the editor measures it
  // rather than assuming one and overlapping it.
  assert.match(editor, /header:not\(\[data-ww-chrome\]\)/);
  assert.match(editor, /style=\{\{ top: chromeHeight \}\}/);
  assert.doesNotMatch(editor, /fixed inset-x-0 bottom-0 top-16/);
});

test("preview shows the draft while the live link shows what guests see", () => {
  const preview = read("app/dashboard/wedding-website/preview/page.tsx");
  const topBar = read("components/wedding-website/editor/EditorTopBar.tsx");

  assert.match(preview, /\?draft=1/);
  assert.match(preview, /WeddingTemplateSiteRenderer/);
  assert.doesNotMatch(preview, /mode="editor"/);
  assert.doesNotMatch(preview, /EditorOverlay/);
  assert.match(preview, /האורחים עדיין רואים את הגרסה שפורסמה/);
  assert.match(topBar, /האתר החי/);
  assert.match(topBar, /livePath/);
});

test("publishing asks once, clearly, and only when something changed", () => {
  const dialogs = read("components/wedding-website/editor/EditorDialogs.tsx");
  assert.match(dialogs, /האתר יעודכן עבור כל האורחים/);
  assert.match(dialogs, /אין שינויים חדשים לפרסום/);
  assert.match(dialogs, /PublishDialog/);
  const topBar = read("components/wedding-website/editor/EditorTopBar.tsx");
  assert.match(topBar, /disabled=\{unpublishedCount === 0\}/);
});

test("destructive actions confirm, ordinary edits do not", () => {
  const themePanel = read("components/wedding-website/editor/EditorThemePanel.tsx");
  const list = read("components/wedding-website/editor/EditorSectionList.tsx");
  const toolbar = read("components/wedding-website/editor/EditorSelectionToolbar.tsx");

  assert.match(themePanel, /confirm\(\{/);
  assert.match(themePanel, /חזרה לעיצוב המקורי/);
  assert.match(list, /איפוס המקטע לעיצוב התבנית/);
  assert.match(toolbar, /הסרת מדיה/);
  // Style tweaks apply immediately.
  assert.doesNotMatch(toolbar, /confirm\(\{[\s\S]{0,200}עיצוב טקסט/);
});

test("event-owned fields are shown as dynamic instead of copied into the site", () => {
  const toolbar = read("components/wedding-website/editor/EditorSelectionToolbar.tsx");
  const list = read("components/wedding-website/editor/EditorSectionList.tsx");
  const settings = read("components/wedding-website/editor/EditorSectionSettings.tsx");

  assert.match(toolbar, /LOCKED_EVENT_PATHS/);
  assert.match(toolbar, /מידע זה מגיע מפרטי האירוע/);
  assert.match(toolbar, /עריכת פרטי האירוע/);
  assert.match(list, /דינמי/);
  assert.match(settings, /עריכת פרטי האירוע/);

  const dynamicSections = EDITOR_SECTIONS.filter((section) => section.dynamic).map(
    (section) => section.id
  );
  assert.deepEqual(dynamicSections.sort(), ["event-details", "location"]);
});

test("autoplay video stays muted so it plays on mobile", () => {
  const toolbar = read("components/wedding-website/editor/EditorSelectionToolbar.tsx");
  assert.match(toolbar, /muted: event\.target\.checked \? true : current\.muted/);
  const slot = normalizeWeddingMediaSlot({
    type: "video",
    src: "https://res.cloudinary.com/demo/video/upload/a.mp4",
    autoplay: true,
    muted: false,
  });
  assert.equal(slot?.muted, true);
});

test("the media library can be searched, reused and cleaned up safely", () => {
  const dialogs = read("components/wedding-website/editor/EditorDialogs.tsx");
  const api = read("app/api/wedding-website/media/route.ts");

  assert.match(dialogs, /MediaLibraryDialog/);
  assert.match(dialogs, /type="search"/);
  assert.match(dialogs, /חיפוש לפי שם קובץ/);
  assert.match(dialogs, /method: "DELETE"/);

  assert.match(api, /export async function DELETE/);
  // A crafted publicId must not reach another customer's folder.
  assert.match(api, /publicId\.startsWith\(`\$\{folder\}\/`\)/);
  assert.match(api, /FORBIDDEN/);
});

test("hidden sections disappear from the site navigation", () => {
  const menu = read("components/wedding-website/WeddingSiteMenu.tsx");
  assert.match(menu, /isSectionVisible/);
});
