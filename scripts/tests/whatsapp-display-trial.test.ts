import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ACTIVE_RSVP_TEMPLATE_NAME,
  buildDisplayTrialSubmission,
  createDisplayTrialTemplate,
  describeTemplate,
  DISPLAY_TRIAL_TEMPLATE_NAME,
} from "../../lib/whatsapp/displayTrialTemplate";
import { WHATSAPP_HEADER_PROBE_IMAGE_URL } from "../../lib/whatsapp/headerProbe";

const liveList = {
  waba_templates: [
    {
      name: "rsvp_invitation_media",
      language: "he",
      status: "approved",
      category: "MARKETING",
      components: [
        { type: "HEADER", format: "IMAGE" },
        {
          type: "BODY",
          text: "הזמנה ל- {{1}}\nבתאריך {{2}}\nב{{3}}\nלאישור הגעה לחצו על הכפתור",
        },
        {
          type: "BUTTONS",
          buttons: [
            {
              type: "URL",
              text: "אישור הגעה",
              url: "https://www.invistimo.com/invite/{{1}}",
            },
          ],
        },
      ],
    },
  ],
};

test("the trial keeps the image, three variables, and the RSVP button", () => {
  const live = liveList.waba_templates[0];
  const submission = buildDisplayTrialSubmission(live);
  const facts = describeTemplate(submission);
  assert.equal(submission.name, DISPLAY_TRIAL_TEMPLATE_NAME);
  assert.notEqual(submission.name, ACTIVE_RSVP_TEMPLATE_NAME);
  assert.equal(submission.category, "UTILITY");
  assert.equal(submission.allow_category_change, false);
  assert.equal(facts.headerFormat, "IMAGE");
  assert.equal(facts.bodyVariables, 3);
  assert.equal(facts.buttonType, "URL");
  assert.equal(facts.buttonText, "אישור הגעה");
  assert.equal(facts.buttonUrl, "https://www.invistimo.com/invite/{{1}}");
  assert.equal(facts.bodyText, live.components[1].text);
});

test("submission reads the live template and posts the new name only", async () => {
  const calls: Array<{ url: string; method: string; body?: any }> = [];
  const result = await createDisplayTrialTemplate(
    (async (url, init) => {
      const method = init?.method || "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url: String(url), method, body });
      if (method === "GET") return new Response(JSON.stringify(liveList), { status: 200 });
      return new Response(
        JSON.stringify({ status: "submitted", category: "UTILITY", name: DISPLAY_TRIAL_TEMPLATE_NAME }),
        { status: 201 }
      );
    }) as typeof fetch,
    "live-key"
  );
  assert.equal(result.ok, true);
  assert.equal(calls.some((call) => call.url.includes("/messages")), false);
  assert.equal(calls.filter((call) => call.method === "POST").length, 1);
  assert.equal(calls[1].body.name, DISPLAY_TRIAL_TEMPLATE_NAME);
  assert.equal(calls[1].body.category, "UTILITY");
  assert.equal(
    calls[1].body.components[0].example.header_handle[0],
    WHATSAPP_HEADER_PROBE_IMAGE_URL
  );
  assert.equal(JSON.stringify(result).includes("live-key"), false);
  const route = readFileSync("app/api/cron/whatsapp-display-trial/route.ts", "utf8");
  assert.doesNotMatch(route, /x-vercel-cron|sendLinkDisplayExperiment|sendRsvpTemplateMedia/);
  const customer = readFileSync("lib/whatsapp/sendRsvpTemplateMedia.ts", "utf8");
  assert.doesNotMatch(customer, /displayTrial|rsvp_invitation_display_trial/);
});
