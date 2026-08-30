import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { mergeWeddingWebsiteContent, serializeWeddingWebsite } from "../../lib/weddingWebsite/content";
import { WEDDING_DEMO_CONTENT } from "../../config/weddingWebsite/demoContent";
import { overlayWeddingTemplateImages, repairWeddingImageUrl } from "../../lib/weddingWebsite/images";
import { applyMediaToContent, mediaSlotFromImageUrl, resolveMediaSlot } from "../../lib/weddingWebsite/media";
import {
  buildTextIndex,
  isSectionVisible,
  matchTextField,
  sectionTitleFields,
  setByPath,
} from "../../lib/weddingWebsite/editorSchema";
import { resolveWeddingGifts } from "../../lib/weddingWebsite/gifts";
import type { WeddingTemplate } from "../../types/weddingWebsite";

function read(rel: string) {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

test("visual editor overlays the existing renderer instead of copying templates", () => {
  const editor = read("components/wedding-website/editor/WeddingVisualEditor.tsx");
  const overlay = read("components/wedding-website/editor/EditorOverlay.tsx");
  const renderer = read("components/wedding-website/WeddingTemplateSiteRenderer.tsx");
  const media = read("components/wedding-website/editable/WeddingMedia.tsx");
  const hydrator = read("components/wedding-website/editable/SiteHydrator.tsx");

  assert.match(editor, /WeddingTemplateSiteRenderer/);
  assert.match(editor, /mode="editor"/);
  assert.match(overlay, /data-ww-edit/);
  assert.match(hydrator, /contentEditable = "true"/);
  assert.match(overlay, /insertLineBreak/);
  assert.match(renderer, /WeddingSiteProvider/);
  assert.match(media, /type === "video"/);
  assert.doesNotMatch(editor, /eternal-gold-editor/);
});

test("draft autosave does not publish the live site", () => {
  const api = read("app/api/wedding-website/route.ts");
  const publish = read("app/api/wedding-website/publish/route.ts");
  const publicApi = read("app/api/w/[shareId]/route.ts");
  const editor = read("components/wedding-website/editor/WeddingVisualEditor.tsx");

  assert.match(api, /weddingWebsite\.draftContent/);
  assert.match(api, /searchParams.get\("draft"\) === "1"/);
  assert.match(publish, /weddingWebsite\.published": true/);
  assert.match(publicApi, /UNPUBLISHED/);
  assert.match(editor, /שומר/);
  assert.match(editor, /Undo/);
  assert.match(editor, /beforeunload/);
  assert.match(editor, /\?draft=1/);
});

test("RSVP business logic stays locked away from the visual editor", () => {
  const overlay = read("components/wedding-website/editor/EditorOverlay.tsx");
  const schema = read("lib/weddingWebsite/editorSchema.ts");
  assert.match(overlay, /data-rsvp-core/);
  assert.match(schema, /RSVP_LOGIC_LOCK/);
  assert.doesNotMatch(overlay, /guestCount/);
  assert.doesNotMatch(overlay, /menuOptions/);
});

test("text index maps live content and static headings", () => {
  const index = buildTextIndex(WEDDING_DEMO_CONTENT);
  const hero = matchTextField(WEDDING_DEMO_CONTENT.heroSubtitle, index);
  const rsvp = matchTextField("אישור הגעה", index);
  assert.equal(hero?.path, "heroSubtitle");
  assert.equal(rsvp?.path, "copy.rsvp");

  const next = setByPath(WEDDING_DEMO_CONTENT, "heroSubtitle", "שלום");
  assert.equal(next.heroSubtitle, "שלום");
  const locked = setByPath(WEDDING_DEMO_CONTENT, "weddingDate", "not-a-date");
  assert.equal(locked.weddingDate, WEDDING_DEMO_CONTENT.weddingDate);
});

test("media slots support image and video without persisting template demo URLs", () => {
  const merged = mergeWeddingWebsiteContent(WEDDING_DEMO_CONTENT, {
    media: {
      hero: {
        type: "video",
        src: "https://res.cloudinary.com/demo/video/upload/hero.mp4",
        autoplay: true,
        muted: true,
        loop: true,
      },
    },
  });
  const slot = resolveMediaSlot("hero", merged);
  assert.equal(slot?.type, "video");
  assert.match(slot?.src || "", /hero\.mp4/);

  const withImage = applyMediaToContent(merged, "gallery.0", mediaSlotFromImageUrl("https://res.cloudinary.com/demo/image/upload/g1.jpg"));
  assert.equal(withImage.galleryImages?.[0], "https://res.cloudinary.com/demo/image/upload/g1.jpg");

  const template = {
    id: "eternal-gold",
    name: "Eternal",
    tagline: "",
    description: "",
    previewImage: "https://example.com/preview.jpg",
    heroImage: "https://example.com/demo-hero.jpg",
    galleryImages: ["https://example.com/demo-1.jpg"],
    theme: {} as WeddingTemplate["theme"],
    mood: "romantic",
  } as WeddingTemplate;
  const live = overlayWeddingTemplateImages(template, merged);
  assert.ok(live?.heroImage);
});

test("unique media slots keep story images independent from the gallery", () => {
  const eternal = read("components/wedding-website/templates/EternalGoldSite.tsx");
  const desert = read("components/wedding-website/templates/DesertRoseSite.tsx");
  const royal = read("components/wedding-website/templates/RoyalIvorySite.tsx");
  const sunset = read("components/wedding-website/templates/SunsetBlushSite.tsx");
  const forest = read("components/wedding-website/templates/ForestEnchantedSite.tsx");
  const noir = read("components/wedding-website/templates/MinimalNoirSite.tsx");
  const glass = read("components/wedding-website/templates/ModernGlassSite.tsx");
  assert.match(eternal, /slot="how-we-met"/);
  assert.match(eternal, /slot="proposal"/);
  assert.match(desert, /slot="how-we-met"/);
  assert.match(desert, /slot="proposal"/);
  assert.match(royal, /slot="hero"/);
  assert.match(royal, /slot="how-we-met"/);
  assert.match(royal, /slot="proposal"/);
  assert.match(sunset, /slot="proposal"/);
  assert.match(forest, /slot="proposal"/);
  assert.match(noir, /slot="proposal"/);
  assert.match(glass, /slot="proposal"/);

  const withStory = applyMediaToContent(WEDDING_DEMO_CONTENT, "how-we-met", {
    type: "image",
    src: "https://res.cloudinary.com/demo/image/upload/story.jpg",
  });
  assert.equal(withStory.media?.["how-we-met"]?.src, "https://res.cloudinary.com/demo/image/upload/story.jpg");
  assert.notEqual(withStory.galleryImages?.[0], "https://res.cloudinary.com/demo/image/upload/story.jpg");
});

test("empty custom gallery falls back to template images instead of leaving holes", () => {
  const template = {
    id: "eternal-gold",
    name: "Eternal",
    tagline: "",
    description: "",
    previewImage: "https://example.com/preview.jpg",
    heroImage: "https://example.com/demo-hero.jpg",
    galleryImages: ["https://example.com/demo-1.jpg", "https://example.com/demo-2.jpg"],
    theme: {} as WeddingTemplate["theme"],
    mood: "romantic",
  } as WeddingTemplate;
  const live = overlayWeddingTemplateImages(template, { galleryImages: [] });
  assert.equal(live?.galleryImages.length, 2);
  assert.equal(live?.galleryImages[0], "https://example.com/demo-1.jpg");
});

test("inline text helpers keep line breaks and skip hydrating while typing", () => {
  const overlay = read("components/wedding-website/editor/EditorOverlay.tsx");
  const hydrator = read("components/wedding-website/editable/SiteHydrator.tsx");
  const textEditing = read("lib/weddingWebsite/textEditing.ts");
  assert.match(overlay, /insertLineBreak/);
  assert.match(overlay, /pointerEvents: "none"/);
  assert.doesNotMatch(overlay, /innerText\.trim\(\)/);
  assert.match(hydrator, /isActivelyEditingText/);
  assert.match(hydrator, /contenteditable='true'/);
  assert.match(textEditing, /<br/);
});

test("serialize exposes draft separately from published content", () => {
  const serialized = serializeWeddingWebsite({
    title: "עמית & בן",
    weddingWebsite: {
      templateId: "eternal-gold",
      published: false,
      content: { heroSubtitle: "פורסם" },
      draftContent: { heroSubtitle: "טיוטה" },
    },
  });
  assert.equal(serialized.content.heroSubtitle, "פורסם");
  assert.equal(serialized.publishedContent.heroSubtitle, "פורסם");
  assert.equal(serialized.draftContent.heroSubtitle, "טיוטה");
  assert.equal(serialized.hasSite, true);
  assert.equal(serialized.published, false);

  const draft = serializeWeddingWebsite(
    {
      title: "עמית & בן",
      weddingWebsite: {
        templateId: "eternal-gold",
        published: false,
        content: { heroSubtitle: "פורסם" },
        draftContent: { heroSubtitle: "טיוטה" },
      },
    },
    { draft: true }
  );
  assert.equal(draft.content.heroSubtitle, "טיוטה");
});

test("editor text stays selectable and the color picker includes a spectrum", () => {
  const overlay = read("components/wedding-website/editor/EditorOverlay.tsx");
  const hydrator = read("components/wedding-website/editable/SiteHydrator.tsx");
  const toolbar = read("components/wedding-website/editor/EditorSelectionToolbar.tsx");
  assert.match(hydrator, /contentEditable = "true"/);
  assert.match(hydrator, /overflow-anchor: none/);
  assert.match(hydrator, /user-select:text/);
  assert.doesNotMatch(overlay, /el\.focus\(\)/);
  assert.doesNotMatch(overlay, /contentEditable = "false"/);
  assert.match(toolbar, /type="color"/);
  assert.match(toolbar, /פלטת צבעים/);
});

test("gifts reuse invitation Bit, credit, and PayBox settings", () => {
  const gifts = resolveWeddingGifts({
    giftOptions: {
      creditEnabled: true,
      creditUrl: "https://pay.example/credit",
      payboxEnabled: false,
      payboxUrl: "https://pay.example/ignored",
    },
    publicEventPage: {
      gifts: {
        payboxUrl: "paybox.example/gift",
        bitPhone: "0501234567",
        bitUrl: "",
      },
    },
  });
  assert.equal(gifts.creditUrl, "https://pay.example/credit");
  assert.equal(gifts.payboxUrl, "https://paybox.example/gift");
  assert.equal(gifts.bitPhone, "0501234567");

  const eternal = read("components/wedding-website/templates/EternalGoldSite.tsx");
  const actions = read("components/wedding-website/WeddingGiftActions.tsx");
  assert.match(eternal, /WeddingGiftActions/);
  assert.doesNotMatch(eternal, /Bit —/);
  assert.match(actions, /label="Bit"/);
  assert.match(actions, /label="אשראי"/);
  assert.match(actions, /label="PayBox"/);
});

test("broken unsplash urls are repaired and guest messages stay visible", () => {
  const broken =
    "https://images.unsplash.com/photo-1465495976277-4387d110b3ca?w=800&q=80";
  const truncated =
    "https://images.unsplash.com/photo-1523438885200-e635ba2c371?w=1920&q=85";
  assert.match(repairWeddingImageUrl(broken), /1519741497674-611481863552/);
  assert.match(repairWeddingImageUrl(truncated), /1519225421980-715cb0215aed/);

  const templates = read("config/weddingWebsite/templates.ts");
  const demo = read("config/weddingWebsite/demoContent.ts");
  assert.doesNotMatch(templates, /1465495976277-4387d110b3ca/);
  assert.doesNotMatch(templates, /photo-1523438885200-e635ba2c371\?/);
  assert.doesNotMatch(demo, /1465495976277-4387d110b3ca/);

  assert.equal(
    isSectionVisible({ ...WEDDING_DEMO_CONTENT, sections: { guestbook: false, "guest-message": true } }, "guestbook"),
    true
  );

  const publicPage = read("app/w/[shareId]/page.tsx");
  const publish = read("app/api/wedding-website/publish/route.ts");
  const publicApi = read("app/api/w/[shareId]/route.ts");
  assert.match(publicPage, /WeddingGuestMessageForm/);
  assert.doesNotMatch(publicPage, /guestMessagesEnabled/);
  assert.match(publish, /weddingWebsite\.content": draft\.draftContent/);
  assert.match(publicApi, /serializeWeddingWebsite\(invitation\)/);
  assert.match(publicApi, /UNPUBLISHED/);
});

test("countdown units stay days-first from the left on every template", () => {
  const grid = read("components/wedding-website/shared/WeddingCountdownGrid.tsx");
  assert.match(grid, /dir="ltr"/);
  assert.match(grid, /data-ww-countdown="units"/);
  const daysIdx = grid.indexOf('label: "ימים"');
  const hoursIdx = grid.indexOf('label: "שעות"');
  const minutesIdx = grid.indexOf('label: "דקות"');
  const secondsIdx = grid.indexOf('label: "שניות"');
  assert.ok(daysIdx > 0 && daysIdx < hoursIdx && hoursIdx < minutesIdx && minutesIdx < secondsIdx);

  const templateFiles = [
    "components/wedding-website/templates/EternalGoldSite.tsx",
    "components/wedding-website/templates/MidnightVelvetSite.tsx",
    "components/wedding-website/templates/GardenBloomSite.tsx",
    "components/wedding-website/templates/CoastalBreezeSite.tsx",
    "components/wedding-website/templates/DesertRoseSite.tsx",
    "components/wedding-website/templates/ForestEnchantedSite.tsx",
    "components/wedding-website/templates/SunsetBlushSite.tsx",
    "components/wedding-website/templates/MinimalNoirSite.tsx",
    "components/wedding-website/templates/ModernGlassSite.tsx",
    "components/wedding-website/templates/RoyalIvorySite.tsx",
    "components/wedding-website/WeddingWebsiteSections.tsx",
  ];
  for (const file of templateFiles) {
    const src = read(file);
    assert.match(src, /WeddingCountdownGrid/);
    assert.doesNotMatch(src, /useCountdownTimer/);
    assert.doesNotMatch(src, /formatCountdown/);
  }
});

test("section titles including countdown are editable copy fields", () => {
  const hydrator = read("components/wedding-website/editable/SiteHydrator.tsx");
  const schema = read("lib/weddingWebsite/editorSchema.ts");
  const overlay = read("components/wedding-website/editor/EditorOverlay.tsx");
  assert.match(hydrator, /hydrateSectionTitles/);
  assert.match(hydrator, /sectionTitleFields/);
  assert.match(hydrator, /querySelector\("h1, h2, h3"\)/);
  assert.match(schema, /match: "הספירה לאחור"/);
  assert.match(schema, /match: "הספירה"/);
  assert.match(overlay, /data-ww-edit="text"/);

  const index = buildTextIndex(WEDDING_DEMO_CONTENT);
  assert.equal(matchTextField("הספירה לאחור", index)?.path, "copy.countdown");
  assert.equal(matchTextField("הספירה", index)?.path, "copy.countdown");
  assert.equal(matchTextField("הספירה לאחור", index)?.label, "כותרת ספירה");

  const titles = sectionTitleFields();
  const countdown = titles.find((field) => field.sectionId === "countdown");
  assert.equal(countdown?.path, "copy.countdown");
  assert.equal(countdown?.label, "כותרת ספירה");
  assert.equal(new Set(titles.map((field) => field.sectionId)).size, titles.length);
});

test("the hero block can be replaced with an image or a looping video", () => {
  const toolbar = read("components/wedding-website/editor/EditorSelectionToolbar.tsx");
  const media = read("components/wedding-website/editable/WeddingMedia.tsx");
  const api = read("app/api/wedding-website/media/route.ts");
  const effects = read("components/wedding-website/effects/WeddingEffects.tsx");
  const eternal = read("components/wedding-website/templates/EternalGoldSite.tsx");
  const noir = read("components/wedding-website/templates/MinimalNoirSite.tsx");
  const glass = read("components/wedding-website/templates/ModernGlassSite.tsx");

  assert.match(toolbar, /id === "hero"/);
  assert.match(toolbar, /slotId="hero"/);
  assert.match(toolbar, /העלאת סרטון/);
  assert.match(toolbar, /העלאת תמונה/);
  assert.match(toolbar, /accept="video\/mp4,video\/webm,video\/quicktime"/);
  assert.match(media, /הוסיפו תמונה או סרטון/);
  assert.match(api, /ALLOWED_VIDEO_TYPES/);
  assert.match(api, /resourceType: isVideo \? "video" : "image"/);
  assert.match(effects, /slot="hero"/);
  assert.match(eternal, /pointer-events-none absolute inset-0 bg-gradient-to-t/);
  assert.match(noir, /slot="hero"/);
  assert.match(glass, /slot="hero" src=\{VIDEOS\.couple\}/);

  const withVideo = applyMediaToContent(WEDDING_DEMO_CONTENT, "hero", {
    type: "video",
    src: "https://res.cloudinary.com/demo/video/upload/hero.mp4",
    autoplay: true,
    muted: true,
    loop: true,
  });
  assert.equal(withVideo.media?.hero?.type, "video");
  assert.equal(withVideo.heroImage, "");

  const withImage = applyMediaToContent(WEDDING_DEMO_CONTENT, "hero", mediaSlotFromImageUrl(
    "https://res.cloudinary.com/demo/image/upload/hero.jpg"
  ));
  assert.equal(withImage.media?.hero?.type, "image");
  assert.equal(withImage.heroImage, "https://res.cloudinary.com/demo/image/upload/hero.jpg");
});

test("editor selection targets inner text and countdown instead of the whole section", () => {
  const overlay = read("components/wedding-website/editor/EditorOverlay.tsx");
  const hydrator = read("components/wedding-website/editable/SiteHydrator.tsx");
  const grid = read("components/wedding-website/shared/WeddingCountdownGrid.tsx");
  const toolbar = read("components/wedding-website/editor/EditorSelectionToolbar.tsx");

  assert.match(overlay, /data-ww-edit="countdown"/);
  assert.match(overlay, /clampRect/);
  assert.match(overlay, /addEventListener\("scroll"/);
  assert.match(overlay, /selectedElRef/);
  assert.match(hydrator, /ww-section-handle/);
  assert.match(hydrator, /data-ww-section/);
  assert.match(grid, /data-ww-edit="countdown"/);
  assert.match(grid, /data-ww-path="countdown"/);
  assert.match(toolbar, /selection.type === "countdown"/);
});

test("editor canvas has a single scrollbar and can switch templates", () => {
  const editor = read("components/wedding-website/editor/WeddingVisualEditor.tsx");
  assert.match(editor, /overflow-x-hidden overflow-y-auto/);
  assert.match(editor, /ww-editor-canvas mx-auto overflow-x-hidden/);
  assert.doesNotMatch(editor, /ww-editor-canvas mx-auto overflow-auto/);
  assert.match(editor, /החלפת תבנית/);
  assert.match(editor, /חזרה לעורך/);
  assert.match(editor, /setPickerOpen\(true\)/);
  assert.match(editor, /setPickerOpen\(false\)/);
});

test("site navigation is a hamburger on desktop and mobile", () => {
  const menu = read("components/wedding-website/WeddingSiteMenu.tsx");
  const nav = read("components/wedding-website/WeddingNav.tsx");
  assert.match(menu, /aria-label="תפריט"/);
  assert.doesNotMatch(menu, /overflow-x-auto/);
  assert.match(nav, /WeddingSiteMenu/);
  assert.doesNotMatch(nav, /hidden lg:flex/);

  const templates = [
    "components/wedding-website/templates/EternalGoldSite.tsx",
    "components/wedding-website/templates/MidnightVelvetSite.tsx",
    "components/wedding-website/templates/GardenBloomSite.tsx",
    "components/wedding-website/templates/CoastalBreezeSite.tsx",
    "components/wedding-website/templates/DesertRoseSite.tsx",
    "components/wedding-website/templates/ForestEnchantedSite.tsx",
    "components/wedding-website/templates/SunsetBlushSite.tsx",
    "components/wedding-website/templates/MinimalNoirSite.tsx",
    "components/wedding-website/templates/ModernGlassSite.tsx",
    "components/wedding-website/templates/RoyalIvorySite.tsx",
  ];
  for (const file of templates) {
    const src = read(file);
    assert.match(src, /WeddingSiteMenu/);
    assert.doesNotMatch(src, /{!embed && <StickyNav \/>}/);
    assert.doesNotMatch(src, /if \(embed\) return null/);
  }
});

