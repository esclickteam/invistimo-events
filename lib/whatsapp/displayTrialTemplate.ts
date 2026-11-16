import { WHATSAPP_HEADER_PROBE_IMAGE_URL } from "@/lib/whatsapp/headerProbe";

/**
 * Submits one new template. It does not edit rsvp_invitation_media and it
 * does not send a WhatsApp message.
 *
 * Evently360's source shows an IMAGE header, three body variables, and one
 * URL button, sent later as image.link. That source does not record a Meta
 * category. The trial is submitted as UTILITY because 360dialog documents
 * tappable image headers for marketing templates, and the image.link send on
 * the current template still rendered small on iPhone.
 */

export const DISPLAY_TRIAL_TEMPLATE_NAME = "rsvp_invitation_display_trial";
export const ACTIVE_RSVP_TEMPLATE_NAME = "rsvp_invitation_media";

const TEMPLATES_URL = "https://waba-v2.360dialog.io/v1/configs/templates?limit=1000";
const CREATE_URL = "https://waba-v2.360dialog.io/v1/configs/templates";

const FALLBACK_BODY =
  "משפחה וחברים יקרים,\n" +
  "הנכם מוזמנים ל- {{1}}\n" +
  "תאריך: {{2}}\n" +
  "מיקום: {{3}}\n" +
  "לאישור הגעה לחצו על הכפתור למטה";

const DEFAULT_BUTTON_URL = "https://www.invistimo.com/invite/{{1}}";
const DEFAULT_BUTTON_TEXT = "אישור הגעה";

export const EVENTLY_TEMPLATE_REFERENCE = {
  source: "evently360 src/lib/invistimo-whatsapp-templates.ts",
  name: "evently_rsvp_invitation_image_v3",
  provider: "bizuply",
  headerFormat: "IMAGE",
  bodyVariables: 3,
  buttonType: "URL",
  buttonUrl: "https://evently360.com/invite/{{1}}",
  buttonParameter: "guest token only",
  sendTimeHeader: "image.link",
  categoryInSource: "",
} as const;

export type TemplateFacts = {
  name: string;
  language: string;
  status: string;
  category: string;
  headerFormat: string;
  bodyText: string;
  bodyVariables: number;
  buttonType: string;
  buttonText: string;
  buttonUrl: string;
};

export type DisplayTrialSubmission = {
  name: string;
  language: string;
  category: "UTILITY";
  allow_category_change: false;
  components: Array<Record<string, unknown>>;
};

function asList(payload: any) {
  if (Array.isArray(payload?.waba_templates)) return payload.waba_templates;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function component(template: any, type: string) {
  const components = Array.isArray(template?.components) ? template.components : [];
  return components.find(
    (item: any) => String(item?.type || "").toUpperCase() === type
  );
}

export function describeTemplate(template: any): TemplateFacts {
  const header = component(template, "HEADER");
  const body = component(template, "BODY");
  const buttons = component(template, "BUTTONS");
  const buttonList = Array.isArray(buttons?.buttons) ? buttons.buttons : [];
  const urlButton =
    buttonList.find((button: any) => String(button?.type || "").toUpperCase() === "URL") ||
    null;
  const bodyText = String(body?.text || "");
  return {
    name: String(template?.name || ""),
    language: String(template?.language || ""),
    status: String(template?.status || ""),
    category: String(template?.category || "").toUpperCase(),
    headerFormat: String(header?.format || "NONE").toUpperCase(),
    bodyText,
    bodyVariables: (bodyText.match(/\{\{\d+\}\}/g) || []).length,
    buttonType: String(urlButton?.type || "").toUpperCase(),
    buttonText: String(urlButton?.text || ""),
    buttonUrl: String(urlButton?.url || "").split("?")[0],
  };
}

export function findNamedTemplate(payload: unknown, name: string) {
  return asList(payload).find((template: any) => String(template?.name || "") === name) || null;
}

export function buildDisplayTrialSubmission(live: any | null): DisplayTrialSubmission {
  const facts = live ? describeTemplate(live) : null;
  const bodyText =
    facts && facts.bodyVariables === 3 && facts.bodyText ? facts.bodyText : FALLBACK_BODY;
  const buttonUrl =
    facts?.buttonUrl.includes("{{1}}") && facts.buttonUrl.startsWith("https://www.invistimo.com/")
      ? facts.buttonUrl
      : DEFAULT_BUTTON_URL;
  const buttonText = facts?.buttonText || DEFAULT_BUTTON_TEXT;
  return {
    name: DISPLAY_TRIAL_TEMPLATE_NAME,
    language: facts?.language || "he",
    category: "UTILITY",
    allow_category_change: false,
    components: [
      {
        type: "HEADER",
        format: "IMAGE",
        example: { header_handle: [WHATSAPP_HEADER_PROBE_IMAGE_URL] },
      },
      {
        type: "BODY",
        text: bodyText,
        example: { body_text: [["בדיקת תצוגה", "16.11.2026", "בדיקה"]] },
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "URL",
            text: buttonText,
            url: buttonUrl,
            example: ["header-probe?token=display"],
          },
        ],
      },
    ],
  };
}

export function templateDifferences(live: TemplateFacts | null, trial: DisplayTrialSubmission) {
  const trialFacts = describeTemplate(trial);
  return {
    name: { from: live?.name || "", to: trial.name },
    category: {
      from: live?.category || "",
      to: trial.category,
      reason:
        "UTILITY is the trial. Evently360's source does not name a category. Marketing templates have tappable image headers.",
    },
    allowCategoryChange: { from: "", to: false },
    headerFormat: { from: live?.headerFormat || "", to: trialFacts.headerFormat },
    bodyVariables: { from: live?.bodyVariables ?? null, to: trialFacts.bodyVariables },
    bodyTextSame: live?.bodyText ? live.bodyText === trialFacts.bodyText : false,
    buttonType: { from: live?.buttonType || "", to: trialFacts.buttonType },
    buttonText: { from: live?.buttonText || "", to: trialFacts.buttonText },
    buttonUrl: { from: live?.buttonUrl || "", to: trialFacts.buttonUrl },
    evently: EVENTLY_TEMPLATE_REFERENCE,
  };
}

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

export async function createDisplayTrialTemplate(
  fetchImpl: typeof fetch = fetch,
  apiKey = process.env.WHATSAPP_API_KEY || process.env.D360_API_KEY || ""
) {
  const key = String(apiKey).trim();
  if (!key) {
    return { ok: false as const, status: 0, error: "KEY_MISSING", facts: null, submission: null };
  }
  const headers = { "D360-API-KEY": key, "Content-Type": "application/json" };
  const listed = await fetchImpl(TEMPLATES_URL, { method: "GET", headers });
  const listedBody = await readJson(listed);
  if (!listed.ok) {
    return {
      ok: false as const,
      status: listed.status,
      error: "TEMPLATES_UNAVAILABLE",
      facts: null,
      submission: null,
    };
  }
  const live = findNamedTemplate(listedBody, ACTIVE_RSVP_TEMPLATE_NAME);
  const already = findNamedTemplate(listedBody, DISPLAY_TRIAL_TEMPLATE_NAME);
  const liveFacts = live ? describeTemplate(live) : null;
  if (already) {
    return {
      ok: true as const,
      status: listed.status,
      error: "",
      created: false,
      facts: liveFacts,
      trial: describeTemplate(already),
      differences: templateDifferences(liveFacts, buildDisplayTrialSubmission(live)),
      submission: null,
    };
  }
  const submission = buildDisplayTrialSubmission(live);
  let response = await fetchImpl(CREATE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(submission),
  });
  let body = await readJson(response);
  const errorText = JSON.stringify(body?.error || body || "");
  if (!response.ok && /allow_category_change/i.test(errorText)) {
    const { allow_category_change: _ignored, ...withoutFlag } = submission;
    response = await fetchImpl(CREATE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(withoutFlag),
    });
    body = await readJson(response);
  }
  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      error: String(body?.error?.message || body?.meta?.developer_message || body?.error || "CREATE_FAILED").slice(0, 240),
      facts: liveFacts,
      submission,
      differences: templateDifferences(liveFacts, submission),
    };
  }
  const created = body?.waba_template || body?.data || body;
  return {
    ok: true as const,
    status: response.status,
    error: "",
    created: true,
    facts: liveFacts,
    trial: describeTemplate({ ...submission, ...created, name: DISPLAY_TRIAL_TEMPLATE_NAME }),
    differences: templateDifferences(liveFacts, submission),
    submission,
  };
}
