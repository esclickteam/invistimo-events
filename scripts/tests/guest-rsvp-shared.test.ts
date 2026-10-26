import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";

import {
  RSVP_COPY,
  buildRespondByTokenPayload,
  formStateFromGuest,
  getActiveMenuOptions,
  nextArrivedCount,
  normalizeNotes,
  normalizeRsvp,
} from "../../lib/rsvp/guestRsvpLogic";
import { getRsvpAppearance, RSVP_APPEARANCES } from "../../components/rsvp/rsvpAppearances";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("RSVP helpers match personal invitation rules", () => {
  assert.equal(normalizeRsvp("yes"), "yes");
  assert.equal(normalizeRsvp("no"), "no");
  assert.equal(normalizeRsvp("pending"), "pending");
  assert.equal(normalizeRsvp("other"), "pending");

  assert.deepEqual(normalizeNotes("צמחוני, כשר"), ["צמחוני", "כשר"]);
  assert.deepEqual(normalizeNotes([" טבעוני ", ""]), ["טבעוני"]);

  const loaded = formStateFromGuest({
    rsvp: "yes",
    arrivedCount: 2,
    notes: "צמחוני, מנת ילדים",
  });
  assert.equal(loaded.rsvp, "yes");
  assert.equal(loaded.arrivedCount, 2);
  assert.deepEqual(loaded.notes, ["צמחוני", "מנת ילדים"]);

  assert.equal(nextArrivedCount("yes", 0), 1);
  assert.equal(nextArrivedCount("yes", 4), 4);
  assert.equal(nextArrivedCount("no", 8), 0);

  const payload = buildRespondByTokenPayload({
    rsvp: "yes",
    arrivedCount: 3,
    notes: ["כשר"],
  });
  assert.deepEqual(payload, {
    rsvp: "yes",
    status: "yes",
    arrivedCount: 3,
    amount: 3,
    notes: ["כשר"],
  });

  const menu = getActiveMenuOptions({
    vegetarian: true,
    vegan: false,
    transportation: true,
  });
  assert.deepEqual(
    menu.map((item) => item.label),
    ["צמחוני", "הסעות"]
  );
});

test("personal invite and wedding website share one RSVP core", () => {
  const invite = read("app/invite/[shareId]/page.tsx");
  const ww = read("app/w/[shareId]/page.tsx");
  const form = read("components/rsvp/GuestRsvpForm.tsx");
  const controller = read("lib/rsvp/useGuestRsvpController.ts");
  const templatesDir = fs.readdirSync(path.join(root, "components/wedding-website/templates"));

  assert.match(invite, /useGuestRsvpController/);
  assert.match(invite, /GuestRsvpForm/);
  assert.match(invite, /successMode: "personal"/);
  assert.match(ww, /useGuestRsvpController/);
  assert.match(ww, /successMode: "inline"/);
  assert.match(ww, /WeddingTemplateSiteRenderer/);
  assert.doesNotMatch(ww, /WeddingGuestActions/);
  assert.doesNotMatch(ww, /querySelectorAll\("#rsvp/);
  assert.match(form, /handleSubmit/);
  assert.match(controller, /\/api\/invite\/\$\{shareId\}/);
  assert.match(controller, /invitationGuests\/respondByToken/);
  assert.match(form, /RSVP_COPY\.yesLabel/);
  assert.match(form, /RSVP_COPY\.noLabel/);
  assert.match(form, /RSVP_COPY\.submit/);
  assert.match(form, /RSVP_COPY\.countLabel/);
  assert.equal(RSVP_COPY.yesLabel, "מגיע/ה");
  assert.equal(RSVP_COPY.noLabel, "לא מגיע/ה");
  assert.equal(RSVP_COPY.submit, "שליחת אישור הגעה");
  assert.match(controller, /arrivedCount: prev\.arrivedCount \+ 1/);
  assert.doesNotMatch(controller, /Math\.min\(maxGuests/);

  for (const file of templatesDir) {
    if (!file.endsWith("Site.tsx")) continue;
    const src = read(`components/wedding-website/templates/${file}`);
    assert.match(src, /WeddingTemplateRsvp/, `${file} should render shared RSVP`);
    assert.doesNotMatch(src, /useRsvpDemo/, `${file} still uses demo RSVP logic`);
  }

  assert.equal(Object.keys(RSVP_APPEARANCES).length, 11);
  assert.equal(getRsvpAppearance("eternal-gold").id, "eternal-gold");
  assert.equal(getRsvpAppearance("personal").id, "personal");
});

test("wedding website chrome is hidden on public and demo routes", () => {
  const header = read("app/components/Header.tsx");
  const footer = read("app/components/Footer.tsx");
  const shell = read("app/ClientShell.tsx");
  const publicShell = read("app/PublicPageShell.tsx");
  const wLayout = read("app/w/layout.tsx");
  const demoLayout = read("app/wedding-website/[templateId]/layout.tsx");

  assert.match(header, /isWeddingWebsite/);
  assert.match(footer, /isWeddingWebsite/);
  assert.match(shell, /isWeddingWebsite/);
  assert.match(publicShell, /isWeddingWebsiteRoute/);
  assert.match(wLayout, /display: none/);
  assert.match(demoLayout, /display: none/);
});
