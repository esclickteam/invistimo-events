/**
 * Regression: wedding-website (/w/) personal links in WhatsApp templates, exact missing-variable
 * reporting, SMS4Free response interpretation and the /invite → /w redirect.
 * `fetch` is stubbed in every provider test — nothing is sent.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  extractInviteSuffixForButton,
  sendRsvpTemplateMedia,
  TemplateVariableError,
} from "../../lib/whatsapp/sendRsvpTemplateMedia";
import { classifyWhatsappSendError } from "../../lib/whatsapp/roundDeliveryTracking";
import { interpretSms4FreeResponse, sendSmsDetailed } from "../../lib/sendSMS";
import { getPersonalSiteRedirectPath } from "../../lib/guestInviteUrl";
import {
  countChannelFilters,
  getGuestChannelView,
  matchesChannelFilter,
} from "../../lib/whatsapp/guestChannelView";

type Captured = { url: string; body: any };

async function withFetch<T>(
  impl: (url: string, init: any) => Promise<Response>,
  run: (calls: Captured[]) => Promise<T>
) {
  const original = globalThis.fetch;
  const calls: Captured[] = [];
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
    return impl(String(url), init);
  }) as typeof fetch;
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

const okMeta = async () =>
  new Response(JSON.stringify({ messages: [{ id: "wamid.TEST" }] }), { status: 200 });

const baseInput = {
  to: "0526850711",
  headerImageUrl: "https://www.invistimo.com/header.jpg",
  eventTitle: "בדיקה",
  eventDate: "14.10.2026",
  eventLocation: "אולם",
};

function buttonParam(body: any) {
  const button = body.template.components.find((c: any) => c.type === "button");
  return button?.parameters?.[0]?.text;
}

test("button suffix is extracted from both /invite/ and /w/ personal links", () => {
  assert.equal(
    extractInviteSuffixForButton("https://www.invistimo.com/invite/abc123?token=T1"),
    "abc123?token=T1"
  );
  assert.equal(
    extractInviteSuffixForButton("https://www.invistimo.com/w/hHasbtHimb?token=Q73wxg4f5iS6"),
    "hHasbtHimb?token=Q73wxg4f5iS6"
  );
  assert.equal(extractInviteSuffixForButton("https://www.invistimo.com/other/abc"), "");
  assert.equal(extractInviteSuffixForButton("not a url"), "");
});

test("round 1 template with a /w/ rsvpLink (no urlSuffix) sends the correct button param", async () => {
  process.env.WHATSAPP_API_KEY = "test-key";
  await withFetch(okMeta, async (calls) => {
    const result = await sendRsvpTemplateMedia({
      ...baseInput,
      templateName: "rsvp_invitation_media",
      rsvpLink: "https://www.invistimo.com/w/hHasbtHimb?token=Q73wxg4f5iS6",
    });
    assert.equal(calls.length, 1);
    assert.equal(buttonParam(calls[0].body), "hHasbtHimb?token=Q73wxg4f5iS6");
    assert.equal(result.buttonUrlParam, "hHasbtHimb?token=Q73wxg4f5iS6");
    const body = calls[0].body.template.components.find((c: any) => c.type === "body");
    assert.equal(body.parameters.length, 3);
  });
});

test("explicit urlSuffix wins over rsvpLink (queue payload path) for rounds 2/3", async () => {
  process.env.WHATSAPP_API_KEY = "test-key";
  await withFetch(okMeta, async (calls) => {
    await sendRsvpTemplateMedia({
      ...baseInput,
      templateName: "rsvp_reminder_invistimo",
      rsvpLink: "https://www.invistimo.com/w/hHasbtHimb?token=1a5E_FO5N8NO",
      urlSuffix: "hHasbtHimb?token=1a5E_FO5N8NO",
    });
    assert.equal(buttonParam(calls[0].body), "hHasbtHimb?token=1a5E_FO5N8NO");
  });
});

test("underivable button param throws TemplateVariableError before calling Meta", async () => {
  process.env.WHATSAPP_API_KEY = "test-key";
  await withFetch(okMeta, async (calls) => {
    await assert.rejects(
      sendRsvpTemplateMedia({
        ...baseInput,
        templateName: "rsvp_invitation_media",
        rsvpLink: "https://www.invistimo.com/other/hHasbtHimb?token=x",
      }),
      (err: any) => {
        assert.ok(err instanceof TemplateVariableError);
        assert.equal(err.code, "MISSING_TEMPLATE_VARIABLE");
        assert.equal(err.templateVariable.component, "button");
        assert.equal(err.templateVariable.variable, "{{1}}");
        assert.equal(err.templateVariable.templateName, "rsvp_invitation_media");
        return true;
      }
    );
    assert.equal(calls.length, 0, "provider must not be called");
  });
});

test("empty event title → body {{1}} is reported as the missing variable", async () => {
  process.env.WHATSAPP_API_KEY = "test-key";
  await withFetch(okMeta, async (calls) => {
    await assert.rejects(
      sendRsvpTemplateMedia({
        ...baseInput,
        eventTitle: " ",
        templateName: "rsvp_reminder_invistimo",
        urlSuffix: "abc?token=t",
      }),
      (err: any) => {
        assert.equal(err.templateVariable.component, "body");
        assert.equal(err.templateVariable.variable, "{{1}}");
        assert.equal(err.templateVariable.source, "invitation.title");
        return true;
      }
    );
    assert.equal(calls.length, 0);
  });
});

test("classifier keeps the exact missing variable (NOT_SENT, never reached Meta)", () => {
  const err = new TemplateVariableError({
    templateName: "rsvp_invitation_media",
    component: "button",
    index: 0,
    variable: "{{1}}",
    source: "personalLink (invitation.shareId + guest.token)",
    detail: "could not derive shareId",
  });
  const outcome = classifyWhatsappSendError(err);
  assert.equal(outcome.status, "NOT_SENT");
  assert.equal(outcome.reasonCode, "MISSING_TEMPLATE_VARIABLE");
  assert.match(outcome.reasonMessage, /כפתור URL \{\{1\}\}/);
  assert.match(outcome.reasonMessage, /personalLink/);
  assert.equal(outcome.templateVariable?.component, "button");
  assert.match(outcome.errorMessage, /rsvp_invitation_media button\[0\]/);
});

test("SMS4Free response interpretation: accepted / rejected / ambiguous / http error", () => {
  assert.equal(interpretSms4FreeResponse(200, '{"status":1,"message":"ok"}').kind, "accepted");
  assert.equal(interpretSms4FreeResponse(200, '{"status":0,"message":"no credit"}').kind, "rejected");
  assert.equal(interpretSms4FreeResponse(200, '{"status":-2,"message":"bad"}').kind, "rejected");
  assert.equal(interpretSms4FreeResponse(200, "<html>gateway</html>").kind, "ambiguous");
  assert.equal(interpretSms4FreeResponse(200, "").kind, "ambiguous");
  assert.equal(interpretSms4FreeResponse(200, '{"message":"ok"}').kind, "ambiguous");
  assert.equal(interpretSms4FreeResponse(503, "unavailable").kind, "http_error");
});

function setSmsEnv() {
  process.env.SMS4FREE_KEY = "k";
  process.env.SMS4FREE_USER = "u";
  process.env.SMS4FREE_PASS = "p";
  process.env.SMS4FREE_SENDER = "s";
}

test("sendSmsDetailed: accepted stores recipient, HTTP status and raw response", async () => {
  setSmsEnv();
  await withFetch(
    async () => new Response('{"status":1,"message":"sent"}', { status: 200 }),
    async (calls) => {
      const result = await sendSmsDetailed({ to: "0505855327", message: "hi" });
      assert.equal(result.ok, true);
      assert.equal(result.recipient, "972505855327");
      assert.equal(result.httpStatus, 200);
      assert.equal(result.rawResponse, '{"status":1,"message":"sent"}');
      assert.equal(calls[0].body.recipient, "972505855327");
    }
  );
});

test("sendSmsDetailed: HTTP 200 without a status is OUTCOME_UNKNOWN, never SENT", async () => {
  setSmsEnv();
  await withFetch(
    async () => new Response("<html>proxy</html>", { status: 200 }),
    async () => {
      const result = await sendSmsDetailed({ to: "0505855327", message: "hi" });
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.errorCode, "PROVIDER_OUTCOME_UNKNOWN");
      assert.equal(result.outcomeUnknown, true);
      assert.equal(result.retryable, false);
      assert.equal(result.rawResponse, "<html>proxy</html>");
    }
  );
});

test("sendSmsDetailed: connection never made → UNREACHABLE; dropped mid-request → OUTCOME_UNKNOWN", async () => {
  setSmsEnv();
  await withFetch(
    async () => {
      throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
    },
    async () => {
      const result = await sendSmsDetailed({ to: "0505855327", message: "hi" });
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.errorCode, "PROVIDER_UNREACHABLE");
      assert.equal(result.outcomeUnknown, false);
    }
  );
  await withFetch(
    async () => {
      throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } });
    },
    async () => {
      const result = await sendSmsDetailed({ to: "0505855327", message: "hi" });
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.errorCode, "PROVIDER_OUTCOME_UNKNOWN");
      assert.equal(result.outcomeUnknown, true);
    }
  );
});

test("/invite → /w redirect only for published personal-site invitations (token kept)", () => {
  const personal = { invitationSettings: { rsvpSiteMode: "personal" } };
  assert.equal(
    getPersonalSiteRedirectPath({
      invitation: personal,
      shareId: "hHasbtHimb",
      search: "?token=Q73wxg4f5iS6",
    }),
    "/w/hHasbtHimb?token=Q73wxg4f5iS6"
  );
  assert.equal(
    getPersonalSiteRedirectPath({ invitation: personal, shareId: "hHasbtHimb", search: "" }),
    "/w/hHasbtHimb"
  );
  assert.equal(
    getPersonalSiteRedirectPath({
      invitation: { invitationSettings: {} },
      shareId: "abc",
      search: "?token=t",
    }),
    null,
    "regular invitations stay on /invite"
  );
  assert.equal(
    getPersonalSiteRedirectPath({
      invitation: { ...personal, weddingWebsite: { published: false } },
      shareId: "abc",
      search: "?token=t",
    }),
    null,
    "unpublished site would 404 — keep the invitation page"
  );
  assert.equal(
    getPersonalSiteRedirectPath({ invitation: personal, shareId: "abc", search: "", isStaffPreview: true }),
    null
  );
  assert.equal(
    getPersonalSiteRedirectPath({ invitation: personal, shareId: "abc", search: "?preview=staff" }),
    null
  );
  assert.equal(getPersonalSiteRedirectPath({ invitation: null, shareId: "abc" }), null);
});

test("guest view: OUTCOME_UNKNOWN is its own SMS status + filter, with provider evidence", () => {
  const unknown = getGuestChannelView(
    [
      {
        roundKey: "rsvp:1",
        status: "not_sent",
        tracked: true,
        notSentReason: "חסר משתנה חובה בתבנית: כפתור URL {{1}}",
        sms: {
          status: "OUTCOME_UNKNOWN",
          reasonText: "לא ידוע אם הספק קיבל",
          errorCode: "PROVIDER_OUTCOME_UNKNOWN",
          unknownAt: "2026-09-27T10:00:00Z",
          phone: "972505855327",
        },
      },
    ],
    "rsvp:1"
  );
  assert.equal(unknown.whatsapp.status, "NOT_SENT");
  assert.match(String(unknown.whatsapp.reason), /כפתור URL/);
  assert.equal(unknown.sms.status, "OUTCOME_UNKNOWN");
  assert.equal(unknown.sms.label, "תוצאה לא ידועה");
  assert.equal(unknown.sms.errorCode, "PROVIDER_OUTCOME_UNKNOWN");
  assert.equal(unknown.sms.evidence?.phone, "972505855327");
  assert.ok(matchesChannelFilter(unknown, "sms_unknown"));
  assert.ok(!matchesChannelFilter(unknown, "sms_sent"));
  assert.ok(!matchesChannelFilter(unknown, "sms_failed"));

  const sent = getGuestChannelView(
    [
      {
        roundKey: "rsvp:1",
        status: "failed",
        tracked: true,
        sms: {
          status: "SENT",
          sentAt: "2026-09-27T10:00:00Z",
          phone: "972526850711",
          providerStatus: "1",
          providerResponse: '{"status":1}',
          httpStatus: 200,
        },
      },
    ],
    "rsvp:1"
  );
  assert.equal(sent.sms.status, "SENT");
  assert.deepEqual(sent.sms.evidence, {
    phone: "972526850711",
    providerStatus: "1",
    providerResponse: '{"status":1}',
    httpStatus: 200,
  });
  const counts = countChannelFilters([unknown, sent]);
  assert.equal(counts.sms_unknown, 1);
  assert.equal(counts.sms_sent, 1);
});
