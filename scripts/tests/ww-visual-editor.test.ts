import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { mergeWeddingWebsiteContent, serializeWeddingWebsite } from "../../lib/weddingWebsite/content";
import { WEDDING_DEMO_CONTENT } from "../../config/weddingWebsite/demoContent";
import { overlayWeddingTemplateImages } from "../../lib/weddingWebsite/images";
import { applyMediaToContent, mediaSlotFromImageUrl, resolveMediaSlot } from "../../lib/weddingWebsite/media";
import { buildTextIndex, matchTextField, setByPath } from "../../lib/weddingWebsite/editorSchema";
import type { WeddingTemplate } from "../../types/weddingWebsite";

function read(rel: string) {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

test("visual editor overlays the existing renderer instead of copying templates", () => {
  const editor = read("components/wedding-website/editor/WeddingVisualEditor.tsx");
  const overlay = read("components/wedding-website/editor/EditorOverlay.tsx");
  const renderer = read("components/wedding-website/WeddingTemplateSiteRenderer.tsx");
  const media = read("components/wedding-website/editable/WeddingMedia.tsx");

  assert.match(editor, /WeddingTemplateSiteRenderer/);
  assert.match(editor, /mode="editor"/);
  assert.match(overlay, /data-ww-edit/);
  assert.match(overlay, /contentEditable/);
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
