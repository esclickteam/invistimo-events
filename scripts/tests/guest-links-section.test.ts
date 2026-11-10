import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";

import {
  GUEST_LINKS_DEFAULT_TITLE,
  normalizeGuestLinksSection,
  resolveVisibleGuestLinks,
  sanitizeGuestLinkUrl,
  shouldShowGuestLinksSection,
} from "../../lib/eventDetails/guestLinksSection";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("sanitizeGuestLinkUrl allows only http/https", () => {
  assert.equal(sanitizeGuestLinkUrl("https://example.com/path"), "https://example.com/path");
  assert.equal(sanitizeGuestLinkUrl("http://example.com"), "http://example.com/");
  assert.equal(sanitizeGuestLinkUrl("javascript:alert(1)"), "");
  assert.equal(sanitizeGuestLinkUrl("data:text/html,hi"), "");
  assert.equal(sanitizeGuestLinkUrl("ftp://example.com"), "");
  assert.equal(sanitizeGuestLinkUrl("not a url"), "");
});

test("normalizeGuestLinksSection defaults keep existing events unchanged", () => {
  const empty = normalizeGuestLinksSection(null);
  assert.equal(empty.enabled, false);
  assert.equal(empty.title, GUEST_LINKS_DEFAULT_TITLE);
  assert.equal(empty.subtitle, "");
  assert.deepEqual(empty.links, []);

  const normalized = normalizeGuestLinksSection({
    enabled: true,
    title: "קישורים שימושיים",
    subtitle: "כל מה שצריך",
    links: [
      {
        id: "a",
        label: "לאתר",
        url: "https://wedding.example",
        visibility: "personal",
        enabled: true,
        order: 1,
      },
      {
        id: "b",
        label: "לתפריט",
        url: "https://menu.example",
        visibility: "public",
        enabled: true,
        order: 0,
      },
      {
        id: "c",
        label: "מוסתר",
        url: "https://hidden.example",
        visibility: "both",
        enabled: false,
        order: 2,
      },
      {
        id: "bad",
        label: "רע",
        url: "javascript:alert(1)",
        visibility: "both",
        enabled: true,
        order: 3,
      },
    ],
  });

  assert.equal(normalized.enabled, true);
  assert.equal(normalized.links[0].id, "b");
  assert.equal(normalized.links[0].order, 0);
  assert.equal(normalized.links[1].id, "a");
  assert.equal(normalized.links.find((l) => l.id === "bad")?.url, "");
});

test("visibility filters personal vs public and hides when disabled", () => {
  const section = {
    enabled: true,
    title: "מידע נוסף לאורחים",
    subtitle: "",
    links: [
      {
        id: "1",
        label: "אישי",
        url: "https://a.example",
        visibility: "personal",
        enabled: true,
        order: 0,
      },
      {
        id: "2",
        label: "ציבורי",
        url: "https://b.example",
        visibility: "public",
        enabled: true,
        order: 1,
      },
      {
        id: "3",
        label: "שניהם",
        url: "https://c.example",
        visibility: "both",
        enabled: true,
        order: 2,
      },
    ],
  };

  const personal = resolveVisibleGuestLinks(section, "personal").links.map((l) => l.id);
  const publicLinks = resolveVisibleGuestLinks(section, "public").links.map((l) => l.id);

  assert.deepEqual(personal, ["1", "3"]);
  assert.deepEqual(publicLinks, ["2", "3"]);

  assert.equal(
    shouldShowGuestLinksSection({ ...section, enabled: false }, "personal"),
    false
  );
  assert.equal(shouldShowGuestLinksSection({ enabled: true, links: [] }, "personal"), false);
});

test("guest links are wired into settings, personal invite, and public page", () => {
  const form = read("app/components/EventDetailsForm.tsx");
  const rsvp = read("components/rsvp/GuestRsvpForm.tsx");
  const invite = read("app/invite/[shareId]/page.tsx");
  const publicPage = read("app/e/[shareId]/page.tsx");
  const invitationApi = read("app/api/invitations/[id]/route.ts");
  const inviteApi = read("app/api/invite/[shareId]/route.ts");
  const schema = read("models/Invitation.ts");

  assert.match(form, /קישורים נוספים לאורחים/);
  assert.match(form, /guestLinksSection/);
  assert.match(form, /הוספת קישור/);

  assert.match(rsvp, /GuestLinksSection/);
  assert.match(rsvp, /page="personal"/);

  assert.match(invite, /guestLinksSection/);
  assert.match(publicPage, /page="public"/);
  assert.match(publicPage, /GuestLinksSection/);

  assert.match(invitationApi, /normalizeGuestLinksSection/);
  assert.match(inviteApi, /normalizeGuestLinksSection/);
  assert.match(schema, /guestLinksSection/);
});
