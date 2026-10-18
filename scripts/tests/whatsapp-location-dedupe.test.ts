import test from "node:test";
import assert from "node:assert/strict";

import { buildEventLocationLabel } from "../../lib/messages/liveEventDetails";
import { buildInvitationLocationLabel } from "../../lib/messages/invitationOnlyDetails";
import {
  addressRemainder,
  composeGuestLocationLabel,
  dedupeGuestLocationText,
  sanitizeStoredLocationText,
} from "../../lib/messages/locationText";
import { prepareEventLocation } from "../../lib/eventLocation";
import {
  sendRsvpTemplateMedia,
  whatsappLocationParameter,
} from "../../lib/whatsapp/sendRsvpTemplateMedia";
import { resolveEventInvitationVariables } from "../../lib/whatsapp/approvedTemplates";

const KAHI = "קאי ריזורט | Kahi Events Resort";
const DIRTY =
  "קאי ריזורט | Kahi Events Resort, קאי ריזורט | Kahi Events Resort, Kahi Events Resort, אירועים, ישראל";

test("bilingual hall name is kept once when the address repeats Hebrew and English", () => {
  const label = buildEventLocationLabel({
    location: {
      name: KAHI,
      placeName: KAHI,
      address: "Kahi Events Resort, אירועים, ישראל",
      formattedAddress: DIRTY,
      lat: 32.4,
      lng: 34.91,
      wazeUrl: "https://waze.com/ul?ll=32.4,34.91&navigate=yes",
    },
  });

  assert.equal(label, `${KAHI}, אירועים`);
  assert.equal(label.split(KAHI).length - 1, 1);
  assert.doesNotMatch(label, /Kahi Events Resort, Kahi/);
  assert.equal(buildInvitationLocationLabel({ location: { name: KAHI, address: DIRTY } }), label);
});

test("an address that already contains the full name twice is not returned as-is", () => {
  assert.equal(dedupeGuestLocationText(DIRTY), `${KAHI}, אירועים`);
  assert.equal(whatsappLocationParameter(DIRTY), `${KAHI}, אירועים`);
});

test("duplicate address parts are collapsed and an empty address leaves the hall name", () => {
  assert.equal(
    composeGuestLocationLabel(
      "אולם דני",
      "רחוב הרצל 5, תל אביב, רחוב הרצל 5, תל אביב, ישראל"
    ),
    "אולם דני, רחוב הרצל 5, תל אביב"
  );

  assert.equal(
    buildEventLocationLabel({
      location: { name: "אולם דני", address: "" },
    }),
    "אולם דני"
  );
});

test("a manually typed location is shown once", () => {
  const typed = "המקום שלנו ליד הים, רחוב הגל 2, הרצליה";
  assert.equal(
    buildEventLocationLabel({
      location: { name: typed, address: typed },
    }),
    typed
  );
  assert.equal(dedupeGuestLocationText(`${typed}, ${typed}`), typed);
});

test("stored text drops repeated hall names and keeps the unique address and country", () => {
  const stored = sanitizeStoredLocationText({
    name: `${KAHI}, ${KAHI}`,
    address: DIRTY,
    placeName: "Kahi Events Resort",
    formattedAddress: `${KAHI}, אירועים, ישראל`,
  });

  assert.equal(stored.name, KAHI);
  assert.equal(stored.address, "אירועים, ישראל");
  assert.equal(stored.formattedAddress, "אירועים, ישראל");
  assert.equal(
    addressRemainder([stored.name], DIRTY),
    "אירועים, ישראל"
  );
});

test("prepareEventLocation cleans duplicate text without moving the Google pin or Waze link", async () => {
  const wazeUrl = "https://waze.com/ul?ll=32.41,34.92&navigate=yes";
  const prepared = await prepareEventLocation({
    input: {
      name: KAHI,
      address: DIRTY,
      lat: 32.4,
      lng: 34.91,
      placeId: "ChIJKahi",
      wazeLat: 32.41,
      wazeLng: 34.92,
      wazeUrl,
    },
    previous: {
      name: KAHI,
      address: DIRTY,
      lat: 32.4,
      lng: 34.91,
      placeId: "ChIJKahi",
      wazeLat: 32.41,
      wazeLng: 34.92,
      wazeUrl,
    },
    geocode: false,
  });

  assert.equal(prepared.location.lat, 32.4);
  assert.equal(prepared.location.lng, 34.91);
  assert.equal(prepared.location.placeId, "ChIJKahi");
  assert.equal(prepared.location.wazeLat, 32.41);
  assert.equal(prepared.location.wazeLng, 34.92);
  assert.equal(prepared.location.wazeUrl, wazeUrl);
  assert.equal(prepared.location.name, KAHI);
  assert.equal(prepared.location.address, "אירועים, ישראל");
  assert.equal(prepared.textChanged, false);
});

type Captured = { body: any };

async function captureSend(
  run: () => Promise<unknown>
) {
  const original = globalThis.fetch;
  const calls: Captured[] = [];
  globalThis.fetch = (async (_url: any, init: any) => {
    calls.push({ body: init?.body ? JSON.parse(init.body) : null });
    return new Response(JSON.stringify({ messages: [{ id: "wamid.test" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
  return calls;
}

function bodyTexts(call: Captured) {
  const body = call.body.template.components.find((c: any) => c.type === "body");
  return (body?.parameters || []).map((p: any) => p.text);
}

test("Meta payload for invitation, RSVP rounds and a dirty form value sends the hall once", async () => {
  process.env.WHATSAPP_API_KEY = "test-key";
  const headerImageUrl = "https://cdn.example.com/invite.png";
  const rsvpLink = "https://www.invistimo.com/invite/SHARE1?token=tok";

  const calls = await captureSend(async () => {
    await sendRsvpTemplateMedia({
      to: "0501234567",
      templateName: "rsvp_invitation_media",
      eventTitle: "החתונה של נועה ודני",
      eventDate: "17.10.2026 19:00",
      eventLocation: DIRTY,
      headerImageUrl,
      rsvpLink,
    });
    await sendRsvpTemplateMedia({
      to: "0501234567",
      templateName: "event_invitation_image_he",
      eventTitle: "החתונה של נועה ודני",
      eventDate: "17.10.2026",
      templateVariables: {
        invitationTitle: "החתונה של נועה ודני",
        eventDate: "17.10.2026",
        eventLocation: DIRTY,
      },
      headerImageUrl,
    });
    await sendRsvpTemplateMedia({
      to: "0501234567",
      templateName: "rsvp_reminder_invistimo",
      eventTitle: "החתונה של נועה ודני",
      eventDate: "17.10.2026 19:00",
      eventLocation: DIRTY,
      headerImageUrl,
      rsvpLink,
    });
  });

  assert.equal(calls.length, 3);

  const rsvp = calls[0].body;
  assert.equal(rsvp.messaging_product, "whatsapp");
  assert.equal(rsvp.type, "template");
  assert.equal(rsvp.template.name, "rsvp_invitation_media");
  assert.deepEqual(bodyTexts(calls[0]), [
    "החתונה של נועה ודני",
    "17.10.2026 19:00",
    `${KAHI}, אירועים`,
  ]);
  const rsvpButton = rsvp.template.components.find((c: any) => c.type === "button");
  assert.equal(rsvpButton.parameters[0].text, "SHARE1?token=tok");

  assert.equal(calls[1].body.template.name, "event_invitation");
  assert.deepEqual(bodyTexts(calls[1]), [
    "החתונה של נועה ודני",
    "17.10.2026",
    whatsappLocationParameter(
      resolveEventInvitationVariables({ eventLocation: DIRTY }).eventLocation
    ),
  ]);

  assert.equal(calls[2].body.template.name, "rsvp_reminder_invistimo");
  assert.deepEqual(bodyTexts(calls[2]), ["החתונה של נועה ודני"]);
  assert.equal(JSON.stringify(calls[2].body).includes("Kahi Events Resort"), false);
  assert.equal(JSON.stringify(calls[2].body).includes(KAHI), false);
});
