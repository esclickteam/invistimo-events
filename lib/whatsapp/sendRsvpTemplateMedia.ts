export type SendRsvpTemplateMediaInput = {
  to: string;

  // BODY VARIABLES - RSVP
  eventTitle?: string; // {{1}}
  eventDate?: string; // {{2}}
  eventLocation?: string; // {{3}}

  /**
   * קישור אישי מלא, לדוגמה:
   * https://www.invistimo.com/invite/INHtag6CZG?token=tSPo8g_1x5Li
   *
   * חובה בתבניות RSVP שיש להן כפתור.
   */
  rsvpLink?: string;

  /**
   * ערך כפתור ה-URL ({{1}}) — `${shareId}?token=${token}`.
   * בסיס הכפתור בתבנית ב-Meta קבוע: https://www.invistimo.com/invite/{{1}}
   * כשמועבר, הוא גובר על חילוץ מ-rsvpLink (שיכול להיות /invite/ או /w/).
   */
  urlSuffix?: string;

  // HEADER
  headerImageUrl: string;

  templateName?: string;
  languageCode?: "he" | "he_IL" | string;

  /**
   * תמיכה בתבניות WhatsApp כלליות.
   * לדוגמה:
   * save_the_date_image_he
   * event_invitation_image_he
   */
  templateVariables?: {
    saveTheDateTitle?: string;
    invitationTitle?: string;
    eventDate?: string;
    eventTime?: string;
    eventLocation?: string;
  };

  /**
   * רכיבים מוכנים מבחוץ.
   *
   * חשוב:
   * בתבניות RSVP של סבבים 1/2/3 אנחנו לא משתמשים בזה יותר,
   * כדי שלא יישלח בטעות payload ישן עם מספר משתנים לא נכון.
   */
  components?: any[];
};

const ROUND1_TEMPLATE = "rsvp_invitation_media";
const ROUND2_TEMPLATE = "rsvp_reminder_invistimo";

/**
 * אם בעתיד יהיה לך שם תבנית נפרד לסבב 3,
 * תחליפי כאן לשם המדויק שאושר ב-Meta.
 *
 * כרגע, אם סבב 3 משתמש באותה תבנית של סבב 2,
 * זה יישלח בדיוק כמו סבב 2: Body {{1}} + Button {{1}}.
 */
const ROUND3_TEMPLATE = "rsvp_reminder_invistimo";

const SAVE_THE_DATE_TEMPLATE = "save_the_date_image_he";
const EVENT_INVITATION_TEMPLATE = "event_invitation_image_he";

const DEFAULT_TEMPLATE_NAME = ROUND1_TEMPLATE;
const DEFAULT_LANGUAGE_CODE = "he";
const D360_ENDPOINT = "https://waba-v2.360dialog.io/messages";

/* ================= HELPERS ================= */

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeTemplateText(text: string): string {
  return String(text ?? "")
    .replace(/[\n\r\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * WhatsApp templates reject text params that are missing/empty.
 * This guarantees a non-empty string.
 */
function safeTemplateText(value: unknown, fallback = "—"): string {
  const s = normalizeTemplateText(String(value ?? ""));
  return s.length ? s : fallback;
}

function isValidHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizePhoneIL(phone: string): string {
  const p = String(phone || "").replace(/[^\d]/g, "");

  if (!p) return "";
  if (p.startsWith("972")) return p;
  if (p.startsWith("0")) return `972${p.slice(1)}`;

  return p;
}

function isPreRsvpTemplate(templateName: string) {
  return (
    templateName === SAVE_THE_DATE_TEMPLATE ||
    templateName === EVENT_INVITATION_TEMPLATE
  );
}

function isRsvpTemplate(templateName: string) {
  return (
    templateName === ROUND1_TEMPLATE ||
    templateName === ROUND2_TEMPLATE ||
    templateName === ROUND3_TEMPLATE
  );
}

export type TemplateVariableDetail = {
  templateName: string;
  component: "header" | "body" | "button";
  /** body: 1-based parameter number; button: button index */
  index: number;
  /** placeholder as written in the Meta template, e.g. "{{1}}" */
  variable: string;
  source: string;
  detail: string;
};

/** Thrown before calling the provider when a required template parameter cannot be built. */
export class TemplateVariableError extends Error {
  code = "MISSING_TEMPLATE_VARIABLE" as const;
  templateVariable: TemplateVariableDetail;

  constructor(templateVariable: TemplateVariableDetail) {
    super(
      `MISSING_TEMPLATE_VARIABLE: ${templateVariable.templateName} ${templateVariable.component}` +
        `[${templateVariable.index}] ${templateVariable.variable} (source: ${templateVariable.source}) – ${templateVariable.detail}`
    );
    this.name = "TemplateVariableError";
    this.templateVariable = templateVariable;
  }
}

/** Personal-link path segments whose next segment is the invitation shareId. */
const SHARE_PATH_SEGMENTS = new Set(["invite", "w"]);

export function extractInviteSuffixForButton(rsvpLink: string): string {
  let u: URL;
  try {
    u = new URL(rsvpLink.trim());
  } catch {
    return "";
  }
  const parts = u.pathname.split("/").filter(Boolean);
  const index = parts.findIndex((p) => SHARE_PATH_SEGMENTS.has(p.toLowerCase()));
  const shareId = index >= 0 ? parts[index + 1] : "";
  if (!shareId) return "";

  return `${shareId}${u.search || ""}`;
}

function resolveButtonSuffix(input: SendRsvpTemplateMediaInput, templateName: string) {
  const explicit = String(input.urlSuffix ?? "").trim();
  if (explicit && !explicit.includes("{{")) return explicit;

  const rsvpLink = String(input.rsvpLink ?? "").trim();
  const suffix = rsvpLink && isValidHttpsUrl(rsvpLink) ? extractInviteSuffixForButton(rsvpLink) : "";
  if (suffix) return suffix;

  throw new TemplateVariableError({
    templateName,
    component: "button",
    index: 0,
    variable: "{{1}}",
    source: "personalLink (invitation.shareId + guest.token)",
    detail: rsvpLink
      ? `could not derive shareId from rsvpLink "${rsvpLink}"`
      : "urlSuffix and rsvpLink are both missing",
  });
}

function assertRequiredFields(input: SendRsvpTemplateMediaInput): void {
  if (!isNonEmptyString(input.to)) {
    throw new Error("Missing field: to");
  }

  if (!isNonEmptyString(input.headerImageUrl)) {
    throw new Error("Missing field: headerImageUrl");
  }

  const templateName = (input.templateName || DEFAULT_TEMPLATE_NAME).trim();

  const requireBody = (value: unknown, index: number, source: string) => {
    if (isNonEmptyString(value)) return;
    throw new TemplateVariableError({
      templateName,
      component: "body",
      index,
      variable: `{{${index}}}`,
      source,
      detail: "value is empty",
    });
  };

  if (isPreRsvpTemplate(templateName)) {
    if (templateName === SAVE_THE_DATE_TEMPLATE) {
      requireBody(input.templateVariables?.saveTheDateTitle || input.eventTitle, 1, "saveTheDateTitle / invitation.title");
      requireBody(input.templateVariables?.eventDate || input.eventDate, 2, "event.date");
      return;
    }

    if (templateName === EVENT_INVITATION_TEMPLATE) {
      requireBody(input.templateVariables?.invitationTitle || input.eventTitle, 1, "invitationTitle / invitation.title");
      requireBody(input.templateVariables?.eventDate || input.eventDate, 2, "event.date");
      requireBody(input.templateVariables?.eventLocation || input.eventLocation, 3, "event.location");
      return;
    }
  }

  if (isRsvpTemplate(templateName)) {
    requireBody(input.eventTitle, 1, "invitation.title");
    resolveButtonSuffix(input, templateName);
    return;
  }

  throw new Error(`Unsupported templateName "${templateName}"`);
}

async function safeParseResponse(res: Response): Promise<any> {
  const text = await res.text().catch(() => "");

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function buildHeaderComponent(headerImageUrl: string) {
  return {
    type: "header",
    parameters: [
      {
        type: "image",
        image: {
          link: headerImageUrl,
        },
      },
    ],
  };
}

function buildUrlButtonComponent(buttonUrlParam: string) {
  return {
    type: "button",
    sub_type: "url",
    index: "0",
    parameters: [
      {
        type: "text",
        text: safeTemplateText(buttonUrlParam, "invite"),
      },
    ],
  };
}

/* ================= MAIN ================= */

export async function sendRsvpTemplateMedia(input: SendRsvpTemplateMediaInput) {
  assertRequiredFields(input);

  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!isNonEmptyString(apiKey)) {
    throw new Error("Missing env var: WHATSAPP_API_KEY");
  }

  const to = normalizePhoneIL(input.to);

  if (!isNonEmptyString(to) || to.length < 10) {
    throw new Error(`Invalid phone number: ${input.to}`);
  }

  const headerImageUrl = String(input.headerImageUrl ?? "").trim();

  if (!isValidHttpsUrl(headerImageUrl)) {
    throw new Error("Invalid headerImageUrl (must be https)");
  }

  const templateName = (input.templateName || DEFAULT_TEMPLATE_NAME).trim();
  const languageCode = (input.languageCode || DEFAULT_LANGUAGE_CODE).trim();

  const customComponents = Array.isArray(input.components)
    ? input.components
    : null;

  let buttonUrlParam = "";
  let components: any[] = [];

  /*
    חשוב מאוד:
    תבניות RSVP של סבבים 1/2/3 תמיד נבנות כאן לפי templateName.
    לא משתמשים ב-components שמגיעים מבחוץ,
    כדי שלא יישלח payload ישן/שגוי עם מספר משתנים לא תואם.
  */

  if (templateName === ROUND1_TEMPLATE) {
    buttonUrlParam = resolveButtonSuffix(input, templateName);

    components = [
      buildHeaderComponent(headerImageUrl),
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: safeTemplateText(input.eventTitle, "—"),
          },
          {
            type: "text",
            text: safeTemplateText(input.eventDate, "תאריך יעודכן בהמשך"),
          },
          {
            type: "text",
            text: safeTemplateText(input.eventLocation, "מיקום יישלח בהמשך"),
          },
        ],
      },
      buildUrlButtonComponent(buttonUrlParam),
    ];
  } else if (
    templateName === ROUND2_TEMPLATE ||
    templateName === ROUND3_TEMPLATE
  ) {
    buttonUrlParam = resolveButtonSuffix(input, templateName);

    components = [
      buildHeaderComponent(headerImageUrl),
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: safeTemplateText(input.eventTitle, "האירוע שלנו"),
          },
        ],
      },
      buildUrlButtonComponent(buttonUrlParam),
    ];
  } else if (templateName === SAVE_THE_DATE_TEMPLATE) {
    const title =
      input.templateVariables?.saveTheDateTitle || input.eventTitle;
    const date = input.templateVariables?.eventDate || input.eventDate;

    components = [
      buildHeaderComponent(headerImageUrl),
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: safeTemplateText(title, "—"),
          },
          {
            type: "text",
            text: safeTemplateText(date, "תאריך יעודכן בהמשך"),
          },
        ],
      },
    ];
  } else if (templateName === EVENT_INVITATION_TEMPLATE) {
    const title =
      input.templateVariables?.invitationTitle || input.eventTitle;
    const dateRaw = String(
      input.templateVariables?.eventDate || input.eventDate || ""
    ).trim();
    const timeRaw = String(
      input.templateVariables?.eventTime || ""
    ).trim();
    /*
      Invitation-only: label time inside the single Meta "date" body variable
      (newlines are stripped by WhatsApp). Do not change RSVP templates above.
    */
    const dateAlreadyHasTimeLine = /🕒|שעה:/.test(dateRaw);
    const date =
      dateRaw && timeRaw && !dateAlreadyHasTimeLine
        ? `${dateRaw} · 🕒 שעה: ${timeRaw}`
        : dateRaw;
    const location =
      input.templateVariables?.eventLocation || input.eventLocation;

    components = [
      buildHeaderComponent(headerImageUrl),
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: safeTemplateText(title, "—"),
          },
          {
            type: "text",
            text: safeTemplateText(date, "תאריך יעודכן בהמשך"),
          },
          {
            type: "text",
            text: safeTemplateText(location, "מיקום יישלח בהמשך"),
          },
        ],
      },
    ];
  } else if (customComponents && customComponents.length > 0) {
    /*
      רק לתבניות אחרות בעתיד.
      לא עבור RSVP סבבים.
    */
    components = customComponents;
  } else {
    throw new Error(`Unsupported templateName "${templateName}"`);
  }

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components,
    },
  };

  const res = await fetch(D360_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "D360-API-KEY": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const providerResponse = await safeParseResponse(res);

  if (!res.ok) {
    const error: any = new Error(
      `WhatsApp template send failed (${res.status}): ${JSON.stringify(
        providerResponse
      )}`
    );
    error.httpStatus = res.status;
    error.providerResponse = providerResponse;
    throw error;
  }

  const messageId = providerResponse?.messages?.[0]?.id ?? null;

  return {
    success: true,
    to,
    templateName,
    languageCode,
    buttonUrlParam,
    messageId,
    providerResponse,
  };
}