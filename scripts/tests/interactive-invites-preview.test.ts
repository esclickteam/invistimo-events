import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  INTERACTIVE_INVITE_TEMPLATES,
  getInteractiveInviteTemplate,
  isInteractiveInviteTemplateId,
} from "../../config/interactiveInvites/templates";
import { DEMO_EVENTS } from "../../config/interactiveInvites/demoEvents";
import { INTERACTIVE_INVITE_MUSIC } from "../../config/interactiveInvites/musicLibrary";

const root = join(process.cwd());

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("interactive invite preview exposes exactly 6 distinct templates", () => {
  assert.equal(INTERACTIVE_INVITE_TEMPLATES.length, 6);
  const ids = INTERACTIVE_INVITE_TEMPLATES.map((t) => t.id);
  assert.equal(new Set(ids).size, 6);
  const envelopes = new Set(INTERACTIVE_INVITE_TEMPLATES.map((t) => t.envelope));
  const motions = new Set(INTERACTIVE_INVITE_TEMPLATES.map((t) => t.motion));
  assert.equal(envelopes.size, 6, "each template needs a unique envelope variant");
  assert.equal(motions.size, 6, "each template needs a unique scroll motion style");
});

test("each template has demo event content and default music", () => {
  for (const tpl of INTERACTIVE_INVITE_TEMPLATES) {
    assert.ok(isInteractiveInviteTemplateId(tpl.id));
    assert.ok(DEMO_EVENTS[tpl.id]?.coupleNames);
    assert.ok(DEMO_EVENTS[tpl.id]?.galleryImages.length >= 4);
    assert.ok(INTERACTIVE_INVITE_MUSIC.some((m) => m.id === tpl.defaultMusicId));
    assert.ok(getInteractiveInviteTemplate(tpl.id));
  }
});

test("preview routes and engine exist without touching production invite APIs", () => {
  assert.match(read("app/preview/interactive-invites/page.tsx"), /InteractiveInviteGallery/);
  assert.match(
    read("app/preview/interactive-invites/[templateId]/page.tsx"),
    /InteractiveInviteSite/
  );
  assert.match(read("components/interactive-invites/envelopes/EnvelopeOpening.tsx"), /gsap/);
  assert.match(read("components/interactive-invites/engine/ScrollMotion.tsx"), /ScrollTrigger/);
  assert.match(read("components/interactive-invites/engine/MusicController.tsx"), /audio/);
  assert.match(read("components/interactive-invites/sections/InviteSections.tsx"), /Preview בלבד/);

  const inviteApi = read("app/api/wedding-website/route.ts");
  assert.doesNotMatch(inviteApi, /interactive-invites/);
});

test("preview path is marked noindex in next config", () => {
  const cfg = read("next.config.ts");
  assert.match(cfg, /\/preview/);
  assert.match(cfg, /\/preview\/:path\*/);
});
