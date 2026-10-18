import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  EVENT_INVITATION_BODY,
  EVENT_INVITATION_TEMPLATE_NAME,
  eventInvitationBodyParameters,
  formatWhatsappDateVariable,
  formatWhatsappLocationVariable,
  renderEventInvitationPreview,
  resolveEventInvitationVariables,
  resolveWhatsappSendTemplateName,
} from "../../lib/whatsapp/approvedTemplates";
import { sendRsvpTemplateMedia } from "../../lib/whatsapp/sendRsvpTemplateMedia";

const APPROVED_BODY = `ההזמנה שלנו כבר כאן 🤍

נשמח להזמין אתכם לאירוע:
{{1}}

בתאריך:
{{2}}

מיקום האירוע:
{{3}}

פרטים נוספים יישלחו בקרוב 🤍`;

test("approved invitation body matches the live Meta template exactly", () => {
  assert.equal(EVENT_INVITATION_BODY, APPROVED_BODY);
  assert.equal(EVENT_INVITATION_TEMPLATE_NAME, "event_invitation_image_he");
  assert.match(EVENT_INVITATION_BODY, /\{\{1\}\}/);
  assert.match(EVENT_INVITATION_BODY, /\{\{2\}\}/);
  assert.match(EVENT_INVITATION_BODY, /\{\{3\}\}/);
  assert.match(EVENT_INVITATION_BODY, /ההזמנה שלנו כבר כאן/);
  assert.match(EVENT_INVITATION_BODY, /פרטים נוספים יישלחו בקרוב/);
  assert.doesNotMatch(EVENT_INVITATION_BODY, /שמחים ונרגשים להזמינכם לחגוג/);
});

test("preview substitutes Meta variables without adding extra sentences", () => {
  const vars = resolveEventInvitationVariables({
    invitationTitle: "החתונה של בן והדר",
    eventDate: "25.11.2026 20:00",
    eventLocation: "Kahi Events Resort | קאי ריזורט אירועים",
  });

  assert.deepEqual(vars, {
    invitationTitle: "החתונה של בן והדר",
    eventDate: "25.11.2026",
    eventLocation: "קאי ריזורט אירועים",
  });

  const preview = renderEventInvitationPreview(vars);
  assert.equal(
    preview,
    `ההזמנה שלנו כבר כאן 🤍

נשמח להזמין אתכם לאירוע:
החתונה של בן והדר

בתאריך:
25.11.2026

מיקום האירוע:
קאי ריזורט אירועים

פרטים נוספים יישלחו בקרוב 🤍`
  );
});

test("location variable drops bilingual duplicates", () => {
  assert.equal(
    formatWhatsappLocationVariable("Kahi Events Resort | קאי ריזורט אירועים"),
    "קאי ריזורט אירועים"
  );
  assert.equal(formatWhatsappDateVariable("11.11.2026 19:30"), "11.11.2026");
});

test("send payload for event_invitation_image_he matches preview variables", async () => {
  process.env.WHATSAPP_API_KEY = "test-key";

  const vars = resolveEventInvitationVariables({
    invitationTitle: "דור ועומר החתונה",
    eventDate: "11.11.2026 20:00",
    eventLocation: "Kahi Events Resort | קאי ריזורט אירועים",
  });

  const preview = renderEventInvitationPreview(vars);
  const captured: any[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (_url: any, init: any) => {
    captured.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ messages: [{ id: "wamid.test" }] }), {
      status: 200,
    });
  }) as typeof fetch;

  try {
    await sendRsvpTemplateMedia({
      to: "0526850711",
      templateName: EVENT_INVITATION_TEMPLATE_NAME,
      headerImageUrl: "https://cdn.example.com/invite.png",
      eventTitle: vars.invitationTitle,
      eventDate: "11.11.2026 20:00",
      eventLocation: "Kahi Events Resort | קאי ריזורט אירועים",
      templateVariables: {
        invitationTitle: "דור ועומר החתונה",
        eventDate: "11.11.2026 20:00",
        eventLocation: "Kahi Events Resort | קאי ריזורט אירועים",
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(captured.length, 1);
  const payload = captured[0];
  assert.equal(payload.type, "template");
  assert.equal(payload.template.name, "event_invitation_image_he");
  assert.equal(payload.template.language.code, "he");

  const body = payload.template.components.find((c: any) => c.type === "body");
  const texts = (body?.parameters || []).map((p: any) => p.text);
  assert.deepEqual(texts, eventInvitationBodyParameters(vars).map((p) => p.text));
  assert.equal(texts[0], "דור ועומר החתונה");
  assert.equal(texts[1], "11.11.2026");
  assert.equal(texts[2], "קאי ריזורט אירועים");

  const filledFromPayload = renderEventInvitationPreview({
    invitationTitle: texts[0],
    eventDate: texts[1],
    eventLocation: texts[2],
  });
  assert.equal(filledFromPayload, preview);
});

test("dashboard preview no longer hardcodes a different invitation body", () => {
  const page = readFileSync(
    join(process.cwd(), "app/dashboard/messages/new/page.tsx"),
    "utf8"
  );
  const tab = readFileSync(
    join(process.cwd(), "app/dashboard/messages/new/tabs/PreRsvpTab.tsx"),
    "utf8"
  );

  for (const source of [page, tab]) {
    assert.match(source, /renderEventInvitationPreview/);
    assert.match(source, /resolveEventInvitationVariables/);
    assert.doesNotMatch(source, /ההזמנה שלנו כבר כאן/);
    assert.doesNotMatch(source, /פרטים נוספים יישלחו בהמשך/);
  }
});

test("invitation_only always remaps to event_invitation_image_he", () => {
  assert.equal(
    resolveWhatsappSendTemplateName({
      type: "invitation_only",
      templateName: "rsvp_invitation_media",
    }),
    "event_invitation_image_he"
  );
  assert.equal(
    resolveWhatsappSendTemplateName({
      type: "rsvp",
      templateName: "rsvp_invitation_media",
    }),
    "rsvp_invitation_media"
  );
  assert.equal(
    resolveWhatsappSendTemplateName({
      type: "rsvp",
      templateName: "rsvp_reminder_invistimo",
    }),
    "rsvp_reminder_invistimo"
  );
});

test("invitation_only payload never keeps an RSVP template name or button", async () => {
  process.env.WHATSAPP_API_KEY = "test-key";
  const captured: any[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (_url: any, init: any) => {
    captured.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ messages: [{ id: "wamid.test" }] }), {
      status: 200,
    });
  }) as typeof fetch;

  try {
    await sendRsvpTemplateMedia({
      to: "0526850711",
      messageType: "invitation_only",
      templateName: "rsvp_invitation_media",
      headerImageUrl: "https://cdn.example.com/invite.png",
      eventTitle: "דור ועומר החתונה",
      eventDate: "11.11.2026",
      eventLocation: "קאי ריזורט אירועים",
      templateVariables: {
        invitationTitle: "דור ועומר החתונה",
        eventDate: "11.11.2026",
        eventLocation: "קאי ריזורט אירועים",
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(captured[0].template.name, "event_invitation_image_he");
  assert.equal(
    captured[0].template.components.some((c: any) => c.type === "button"),
    false
  );
});

test("invitation send routes and workers lock the approved template", () => {
  const files = [
    "app/api/messages/pre-rsvp/whatsapp/route.ts",
    "app/api/admin/users/[id]/send-invitation-only/route.ts",
    "app/api/cron/whatsapp/route.ts",
    "workers/sendScheduledSms.ts",
  ].map((file) => readFileSync(join(process.cwd(), file), "utf8"));

  assert.match(files[0], /EVENT_INVITATION_TEMPLATE_NAME/);
  assert.match(files[1], /EVENT_INVITATION_TEMPLATE_NAME/);
  assert.match(files[2], /resolveWhatsappSendTemplateName/);
  assert.match(files[3], /resolveWhatsappSendTemplateName/);
});
