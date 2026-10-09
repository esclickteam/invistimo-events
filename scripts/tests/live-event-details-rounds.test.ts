import test from "node:test";
import assert from "node:assert/strict";

import {
  MESSAGE_ROUNDS,
  applyLiveEventPlaceholders,
  overlayLiveEventDetailsOnWhatsappPayload,
  pickSmsTemplateWithPlaceholders,
  resolveLiveEventMessageDetails,
  rewriteBakedEventDetails,
} from "../../lib/messages/liveEventDetails";
import { getRsvpSmsRoundTemplate, ROUND_SMS_TEMPLATES } from "../../lib/sms/roundSmsTemplates";
import {
  REMINDER_WITH_TABLE_SERVER_TEMPLATE,
  buildReminderSmsTemplateForGuest,
} from "../../lib/messages/resolveReminderSmsTemplate";
import { sendRsvpTemplateMedia } from "../../lib/whatsapp/sendRsvpTemplateMedia";
import { coupleNamesFromTitle, buildWeddingChallengesSms } from "../../lib/weddingChallenges/sms";

const OLD_INVITATION = {
  title: "חתונת ישן",
  shareId: "OLDSHARE",
  eventDate: "2026-05-01T00:00:00.000Z",
  eventTime: "19:00",
  venueHallName: "אולם ישן",
  location: { name: "אולם ישן", address: "רחוב ישן 1, תל אביב, ישראל" },
  headerImageUrl: "https://cdn.example.com/old.png",
};

const NEW_INVITATION = {
  title: "חתונת חדש",
  shareId: "NEWSHARE",
  eventDate: "2026-11-20T00:00:00.000Z",
  eventTime: "21:30",
  venueHallName: "אולם חדש",
  location: { name: "אולם חדש", address: "שדרות חדש 9, חיפה, ישראל" },
  headerImageUrl: "https://cdn.example.com/new.png",
};

function snapshotPayload(invitation: any) {
  const live = resolveLiveEventMessageDetails(invitation);
  return {
    languageCode: "he",
    eventTitle: live.eventTitle,
    eventDate: live.eventDateTime,
    eventLocation: live.eventLocation,
    headerImageUrl: live.headerImageUrl,
    rsvpLink: "{{rsvpLink}}",
    name: "{{name}}",
    templateVariables: {
      saveTheDateTitle: live.eventTitle,
      invitationTitle: live.eventTitle,
      eventDate: live.eventDateTime,
      eventLocation: live.eventLocation,
    },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: live.eventTitle },
          { type: "text", text: live.eventDateTime },
          { type: "text", text: live.eventLocation },
        ],
      },
    ],
  };
}

test("catalog lists every guest message round in the product", () => {
  const keys = MESSAGE_ROUNDS.map((r) => r.key);
  assert.deepEqual(keys, [
    "save_the_date",
    "invitation_only",
    "rsvp_1",
    "rsvp_2",
    "rsvp_3",
    "reminder",
    "thankyou",
    "wedding_challenges_sms",
  ]);
});

test("live details ignore Event placeholder title/date/time when invitation is real", () => {
  const live = resolveLiveEventMessageDetails(
    {
      title: "דויד חיים מלול - בר מצווה",
      shareId: "h_BnzL2Nis",
      eventDate: "2026-10-11T00:00:00.000Z",
      eventTime: "19:30",
      location: { name: "יסמין", address: "חיפה" },
    },
    {
      title: "הזמנה חדשה",
      date: "2026-08-18",
      time: "00:00",
    }
  );
  assert.equal(live.eventTitle, "דויד חיים מלול - בר מצווה");
  assert.equal(live.eventTime, "19:30");
  assert.doesNotMatch(live.eventTitle, /הזמנה חדשה/);
  assert.doesNotMatch(live.eventDateTime, /00:00/);
  assert.doesNotMatch(live.eventDate, /18\.08\.2026/);
});

test("live details prefer the current invitation over a stale snapshot", () => {
  const live = resolveLiveEventMessageDetails(NEW_INVITATION);
  assert.equal(live.eventTitle, "חתונת חדש");
  assert.match(live.eventDateTime, /21:30/);
  assert.match(live.eventLocation, /אולם חדש/);
  assert.match(live.eventLocation, /שדרות חדש 9/);
  assert.doesNotMatch(live.eventLocation, /ישראל/);
});

test("WhatsApp overlay replaces snapshotted date, time, hall, address and title", () => {
  const stale = snapshotPayload(OLD_INVITATION);
  stale.name = "דני";
  stale.rsvpLink = "https://www.invistimo.com/invite/OLDSHARE?token=abc";
  stale.urlSuffix = "OLDSHARE?token=abc";

  const live = resolveLiveEventMessageDetails(NEW_INVITATION);
  const next = overlayLiveEventDetailsOnWhatsappPayload(stale, live);

  assert.equal(next.eventTitle, "חתונת חדש");
  assert.match(String(next.eventDate), /21:30/);
  assert.doesNotMatch(String(next.eventDate), /19:00/);
  assert.match(String(next.eventLocation), /אולם חדש/);
  assert.match(String(next.eventLocation), /שדרות חדש 9/);
  assert.doesNotMatch(String(next.eventLocation), /אולם ישן/);
  assert.equal(next.templateVariables.invitationTitle, "חתונת חדש");
  assert.equal(next.templateVariables.saveTheDateTitle, "חתונת חדש");
  assert.equal(next.headerImageUrl, "https://cdn.example.com/new.png");
  assert.equal(next.name, "דני");
  assert.equal(next.rsvpLink, "https://www.invistimo.com/invite/OLDSHARE?token=abc");

  const bodyTexts = JSON.stringify(next.components);
  assert.match(bodyTexts, /חתונת חדש/);
  assert.match(bodyTexts, /21:30/);
  assert.match(bodyTexts, /אולם חדש/);
  assert.doesNotMatch(bodyTexts, /חתונת ישן/);
  assert.doesNotMatch(bodyTexts, /אולם ישן/);
  assert.match(String(next.eventDate), /21:30/);
});

test("every RSVP SMS round interpolates live event details even if the schedule baked the old title", () => {
  const live = resolveLiveEventMessageDetails(NEW_INVITATION);
  const previous = resolveLiveEventMessageDetails(OLD_INVITATION);

  for (const round of [1, 2, 3]) {
    const baked = applyLiveEventPlaceholders(getRsvpSmsRoundTemplate(round), previous, {
      name: "נועה",
      rsvpLink: "{{rsvpLink}}",
    });
    const schedule = {
      type: "rsvp",
      round,
      messageContent: baked,
      messageOverride: getRsvpSmsRoundTemplate(round),
    };
    const template = pickSmsTemplateWithPlaceholders(schedule);
    const text = applyLiveEventPlaceholders(template, live, {
      name: "נועה",
      rsvpLink: "https://invistimo.com/invite/NEWSHARE?token=t",
    });
    assert.match(text, /חתונת חדש/);
    assert.doesNotMatch(text, /חתונת ישן/);
    assert.match(text, /NEWSHARE/);
  }
});

test("reminder / thank-you SMS use live title after an event change", () => {
  const live = resolveLiveEventMessageDetails(NEW_INVITATION);
  const reminder = buildReminderSmsTemplateForGuest({
    body: REMINDER_WITH_TABLE_SERVER_TEMPLATE,
    guest: { tableName: "שולחן 4", tableNumber: 4 },
  });
  const reminderText = applyLiveEventPlaceholders(reminder.template, live, {
    tableName: reminder.tableName,
    navigationLink: "https://www.invistimo.com/e/NEWSHARE",
  });
  assert.match(reminderText, /חתונת חדש/);
  assert.match(reminderText, /שולחן 4/);

  const thanks = applyLiveEventPlaceholders(
    ROUND_SMS_TEMPLATES.thankyou.content || "",
    live,
    { name: "אור" }
  );
  assert.match(thanks, /חתונת חדש/);
  assert.doesNotMatch(thanks, /חתונת ישן/);
});

test("rewriteBakedEventDetails patches already-filled SMS content for queued jobs", () => {
  const previous = resolveLiveEventMessageDetails(OLD_INVITATION);
  const live = resolveLiveEventMessageDetails(NEW_INVITATION);
  const baked = `הוזמנתם לאירוע ${previous.eventTitle} ב-${previous.eventDateTime} ב${previous.eventLocation}`;
  const next = rewriteBakedEventDetails(baked, previous, live);
  assert.match(next, /חתונת חדש/);
  assert.match(next, /21:30/);
  assert.match(next, /אולם חדש/);
  assert.doesNotMatch(next, /חתונת ישן/);
  assert.doesNotMatch(next, /19:00/);
});

test("Event record wins when invitation fields are empty", () => {
  const live = resolveLiveEventMessageDetails(
    { title: "", shareId: "abc" },
    {
      title: "מהאירוע",
      date: "2026-12-01",
      time: "18:00",
      venueHallName: "גן האירועים",
      location: { address: "רחוב הגן 3" },
    }
  );
  assert.equal(live.eventTitle, "מהאירוע");
  assert.match(live.eventDateTime, /18:00/);
  assert.match(live.eventLocation, /גן האירועים/);
});

type Captured = { url: string; body: any };

async function withFetch(
  impl: (url: string, init: any) => Promise<Response>,
  run: (calls: Captured[]) => Promise<void>
) {
  const original = globalThis.fetch;
  const calls: Captured[] = [];
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
    return impl(String(url), init);
  }) as typeof fetch;
  try {
    await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

function bodyParams(call: Captured) {
  const body = call.body.template.components.find((c: any) => c.type === "body");
  return (body?.parameters || []).map((p: any) => p.text);
}

test("scheduled WhatsApp jobs for every template send live details after the event is edited", async () => {
  process.env.WHATSAPP_API_KEY = "test-key";
  const stale = snapshotPayload(OLD_INVITATION);
  stale.rsvpLink = "https://www.invistimo.com/invite/NEWSHARE?token=tok";
  stale.urlSuffix = "NEWSHARE?token=tok";
  const live = resolveLiveEventMessageDetails(NEW_INVITATION);
  const payload = overlayLiveEventDetailsOnWhatsappPayload(stale, live);

  const ok = async () =>
    new Response(JSON.stringify({ messages: [{ id: "wamid.LIVE" }] }), { status: 200 });

  await withFetch(ok, async (calls) => {
    await sendRsvpTemplateMedia({
      to: "0526850711",
      templateName: "rsvp_invitation_media",
      ...(payload as any),
    });
    await sendRsvpTemplateMedia({
      to: "0526850711",
      templateName: "rsvp_reminder_invistimo",
      ...(payload as any),
    });
    await sendRsvpTemplateMedia({
      to: "0526850711",
      templateName: "save_the_date_image_he",
      ...(payload as any),
    });
    await sendRsvpTemplateMedia({
      to: "0526850711",
      templateName: "event_invitation_image_he",
      ...(payload as any),
    });

    assert.equal(calls.length, 4);

    const rsvp1 = bodyParams(calls[0]);
    assert.equal(rsvp1[0], "חתונת חדש");
    assert.match(String(rsvp1[1]), /21:30/);
    assert.match(String(rsvp1[2]), /אולם חדש/);
    assert.doesNotMatch(JSON.stringify(calls[0].body), /חתונת ישן|אולם ישן|19:00/);

    assert.equal(bodyParams(calls[1])[0], "חתונת חדש");

    const std = bodyParams(calls[2]);
    assert.equal(std[0], "חתונת חדש");
    assert.match(String(std[1]), /21:30/);

    const invite = bodyParams(calls[3]);
    assert.equal(invite[0], "חתונת חדש");
    assert.match(String(invite[1]), /21:30/);
    assert.match(String(invite[2]), /אולם חדש/);
  });
});

test("Wedding Challenges opening SMS uses the current event title at send time", () => {
  const live = resolveLiveEventMessageDetails(NEW_INVITATION);
  const text = buildWeddingChallengesSms({
    coupleNames: coupleNamesFromTitle(live.eventTitle),
    personalLink: `https://www.invistimo.com/live/${live.shareId}`,
  });
  assert.match(text, /חתונת חדש/);
  assert.doesNotMatch(text, /חתונת ישן/);
  assert.match(text, /NEWSHARE/);
});

