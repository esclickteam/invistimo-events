import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { PUBLIC_VIDEO_META, getPublicVideoMeta } from "../../lib/marketing/publicVideoMeta";

const root = path.resolve(__dirname, "../..");

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const PUBLIC_VIDEO_SURFACES = [
  "components/marketing/PublicAutoplayVideo.tsx",
  "app/(marketing)/rsvp/components/MarketingVideo.tsx",
  "app/(marketing)/rsvp/chatuna/components/ChatunaVideo.tsx",
  "app/seating-explained/components/SeatingDemoVideo.tsx",
  "components/marketing/HomeMarketingSections.tsx",
  "components/marketing/PublicContentPage.tsx",
  "components/marketing/invitations/ChatunaInvitationsPage.tsx",
  "app/(marketing)/rsvp/save-the-date/SaveTheDateMarketingPage.tsx",
  "app/(marketing)/rsvp/whatsapp/WhatsappRsvpMarketingPage.tsx",
  "app/(marketing)/rsvp/hina/HinaMarketingPage.tsx",
  "app/(marketing)/info/guides/send-digital-invitation/PhoneInviteDemo.tsx",
  "app/(marketing)/info/guides/save-the-date-vs-invitation/SaveTheDateVsInvitationGuide.tsx",
  "app/components/event/EventManagementPage.jsx",
  "app/wedding-website/WeddingWebsiteMarketingPage.tsx",
] as const;

test("shared PublicAutoplayVideo enforces muted loop playsInline contain and reduced-motion", () => {
  const src = read("components/marketing/PublicAutoplayVideo.tsx");
  assert.match(src, /muted=\{muted\}/);
  assert.match(src, /\bloop\b/);
  assert.match(src, /playsInline/);
  assert.match(src, /object-contain/);
  assert.doesNotMatch(src, /object-cover/);
  assert.match(src, /prefers-reduced-motion/);
  assert.match(src, /IntersectionObserver/);
  assert.match(src, /preload=\{eager \|\| shouldLoad \? "metadata" : "none"\}/);
  assert.match(src, /השהיה/);
  assert.match(src, /ניגון/);
});

test("legacy marketing video wrappers delegate to PublicAutoplayVideo", () => {
  const marketing = read("app/(marketing)/rsvp/components/MarketingVideo.tsx");
  const chatuna = read("app/(marketing)/rsvp/chatuna/components/ChatunaVideo.tsx");
  const seating = read("app/seating-explained/components/SeatingDemoVideo.tsx");
  assert.match(marketing, /PublicAutoplayVideo/);
  assert.match(chatuna, /PublicAutoplayVideo/);
  assert.match(seating, /PublicAutoplayVideo/);
  assert.match(marketing, /prefers-reduced-motion|PublicAutoplayVideo/);
});

test("public marketing surfaces no longer mount raw cropped video players", () => {
  for (const rel of PUBLIC_VIDEO_SURFACES) {
    const src = read(rel);
    if (rel.endsWith("PublicAutoplayVideo.tsx")) continue;
    // No standalone <video with object-cover in public marketing call sites
    assert.doesNotMatch(src, /<video[\s\S]{0,400}object-cover/, rel);
  }
});

test("public video metadata covers product clips with real aspect ratios", () => {
  assert.equal(getPublicVideoMeta("/videos/rsvp-steps-wa.mp4")?.aspectRatio, "840 / 1520");
  assert.equal(getPublicVideoMeta("/marketing/videos/hero-guest-journey.webm")?.orientation, "portrait");
  assert.equal(getPublicVideoMeta("/videos/event-management/system-overview.webm")?.aspectRatio, "1280 / 800");
  assert.equal(getPublicVideoMeta("/videos/sit4.mp4")?.orientation, "square");
  assert.ok(Object.keys(PUBLIC_VIDEO_META).length >= 18);
  for (const [srcPath, meta] of Object.entries(PUBLIC_VIDEO_META)) {
    assert.ok(meta.width > 0 && meta.height > 0, srcPath);
    assert.equal(meta.aspectRatio, `${meta.width} / ${meta.height}`);
  }
});

test("home hero phone uses contain (no crop) for guest journey video", () => {
  const home = read("app/HomePageClient.tsx");
  assert.match(home, /hero-guest-journey\.webm/);
  const heroBlock = home.slice(
    home.indexOf("function HeroPhone3D"),
    home.indexOf("</motion.div>", home.indexOf("function HeroPhone3D")) + 20
  );
  assert.match(heroBlock, /object-contain object-center/);
  assert.doesNotMatch(heroBlock, /object-cover object-top/);
  assert.match(heroBlock, /autoPlay/);
  assert.match(heroBlock, /\bmuted\b/);
  assert.match(heroBlock, /\bloop\b/);
  assert.match(heroBlock, /playsInline/);
});
