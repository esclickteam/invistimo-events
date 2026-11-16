import { dedupeGuestLocationText } from "@/lib/messages/locationText";
import { describeWhatsAppHeaderFile } from "@/lib/whatsapp/invitationImage";
import { loadVerifiedWhatsappHeader } from "@/lib/whatsapp/prepareInvitationImage";
import {
  forgetWhatsAppHeaderMediaId,
  uploadWhatsAppHeaderMedia,
} from "@/lib/whatsapp/uploadHeaderMedia";
import {
  EVENT_INVITATION_TEMPLATE_NAME,
  SAVE_THE_DATE_TEMPLATE_NAME,
  eventInvitationBodyParameters,
  resolveEventInvitationVariables,
  resolveSaveTheDateVariables,
  resolveWhatsappSendTemplateName,
  saveTheDateBodyParameters,
} from "@/lib/whatsapp/approvedTemplates";
import { toWhatsappDigits } from "@/lib/phones/international";

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
  /** Queue / schedule type. invitation_only is always remapped to the approved invitation template. */
  messageType?: string;
  languageCode?: "he" | "he_IL" | string;

  /**
   * תמיכה בתבניות WhatsApp כלליות.
   * לדוגמה:
   * save_the_date_image_he
   * event_invitation
   */
  templateVariables?: {
    saveTheDateTitle?: string;
    invitationTitle?: string;
    eventDate?: string;
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

const SAVE_THE_DATE_TEMPLATE = SAVE_THE_DATE_TEMPLATE_NAME;
const EVENT_INVITATION_TEMPLATE = EVENT_INVITATION_TEMPLATE_NAME;

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

/** Location body param exactly as it is placed on the Meta template payload. */
export function whatsappLocationParameter(value: unknown, fallback = "מיקום יישלח בהמשך") {
  return safeTemplateText(dedupeGuestLocationText(value), fallback);
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
  return toWhatsappDigits(phone);
}

function isPreRsvpTemplate(templateName: string) {
  return (
    templateName === SAVE_THE_DATE_TEMPLATE ||
    templateName === EVENT_INVITATION_TEMPLATE ||
    templateName === "event_invitation_image_he"
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

function resolveSendTemplateName(input: SendRsvpTemplateMediaInput) {
  return (
    resolveWhatsappSendTemplateName({
      type: input.messageType,
      templateName: input.templateName,
    }) || DEFAULT_TEMPLATE_NAME
  );
}

function assertRequiredFields(input: SendRsvpTemplateMediaInput): void {
  if (!isNonEmptyString(input.to)) {
    throw new Error("Missing field: to");
  }

  if (!isNonEmptyString(input.headerImageUrl)) {
    throw new Error("Missing field: headerImageUrl");
  }

  const templateName = resolveSendTemplateName(input);

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
      requireBody(
        whatsappLocationParameter(
          input.templateVariables?.eventLocation || input.eventLocation,
          ""
        ),
        3,
        "event.location"
      );
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

async function verifiedHeaderMediaId(value: string, apiKey: string) {
  const header = await loadVerifiedWhatsappHeader(value);
  return uploadWhatsAppHeaderMedia(
    {
      bytes: header.bytes,
      mime: header.mime,
      context: {
        sourceUrl: header.sourceUrl,
        normalized: header.normalized,
        contentType: header.delivery.contentType,
        contentLength: header.delivery.contentLength,
        contentDisposition: header.delivery.contentDisposition,
        cacheControl: header.delivery.cacheControl,
        etag: header.delivery.etag,
        redirected: header.delivery.redirected,
        finalUrl: header.delivery.finalUrl,
        structure: describeWhatsAppHeaderFile(header.bytes),
      },
    },
    { apiKey }
  );
}

function acceptedMessageId(body: any) {
  if (!body || typeof body !== "object" || body.error) return "";
  const id = body.messages?.[0]?.id;
  if (id == null) return "";
  return String(id).trim();
}

/** True only when 360dialog rejected the media id itself, so a fresh upload is safe. */
function isRejectedMediaId(status: number, body: any) {
  const error = body?.error && typeof body.error === "object" ? body.error : {};
  const code = String(error.code ?? "");
  const text = [error.message, error.error_data?.details, error.error_user_msg, body?.raw]
    .filter((part) => part != null && String(part).trim())
    .join(" ")
    .toLowerCase();
  if (code === "131053") return true;
  if (!/media|image\['id'\]|image\.id|param image/.test(text)) return false;
  return (
    status === 404 ||
    /expir|invalid|not a valid|does not exist|not found|deleted|unknown|no longer/.test(text)
  );
}

function buildHeaderComponent(mediaId: string) {
  return {
    type: "header",
    parameters: [
      {
        type: "image",
        image: {
          id: mediaId,
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

  const templateName = resolveSendTemplateName(input);
  const languageCode = (input.languageCode || DEFAULT_LANGUAGE_CODE).trim();

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const built = await assembleTemplate(input, templateName, apiKey);
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components: built.components,
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
    const messageId = res.ok ? acceptedMessageId(providerResponse) : "";
    if (messageId) {
      return {
        success: true as const,
        to,
        templateName,
        languageCode,
        buttonUrlParam: built.buttonUrlParam,
        messageId,
        providerResponse,
      };
    }

    const error: any = new Error(
      res.ok
        ? "WhatsApp template send was not accepted"
        : `WhatsApp template send failed (${res.status}): ${JSON.stringify(providerResponse)}`
    );
    error.httpStatus = res.status;
    error.providerResponse = providerResponse;
    const retryWithFreshMedia =
      attempt === 0 &&
      built.mediaId &&
      isRejectedMediaId(res.status, providerResponse);
    if (!retryWithFreshMedia) throw error;
    forgetWhatsAppHeaderMediaId(built.mediaId);
    lastError = error;
  }

  throw lastError ?? new Error("WhatsApp template send was not accepted");
}

async function assembleTemplate(
  input: SendRsvpTemplateMediaInput,
  templateName: string,
  apiKey: string
) {
  const customComponents = Array.isArray(input.components) ? input.components : null;
  let buttonUrlParam = "";

  /*
    חשוב מאוד:
    תבניות RSVP של סבבים 1/2/3 תמיד נבנות כאן לפי templateName.
    לא משתמשים ב-components שמגיעים מבחוץ,
    כדי שלא יישלח payload ישן/שגוי עם מספר משתנים לא תואם.
  */

  if (templateName === ROUND1_TEMPLATE) {
    buttonUrlParam = resolveButtonSuffix(input, templateName);
    const headerMediaId = await verifiedHeaderMediaId(input.headerImageUrl, apiKey);
    return {
      buttonUrlParam,
      mediaId: headerMediaId,
      components: [
        buildHeaderComponent(headerMediaId),
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
              text: whatsappLocationParameter(input.eventLocation),
            },
          ],
        },
        buildUrlButtonComponent(buttonUrlParam),
      ],
    };
  }

  if (templateName === ROUND2_TEMPLATE || templateName === ROUND3_TEMPLATE) {
    buttonUrlParam = resolveButtonSuffix(input, templateName);
    const headerMediaId = await verifiedHeaderMediaId(input.headerImageUrl, apiKey);
    return {
      buttonUrlParam,
      mediaId: headerMediaId,
      components: [
        buildHeaderComponent(headerMediaId),
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
      ],
    };
  }

  if (templateName === SAVE_THE_DATE_TEMPLATE) {
    const vars = resolveSaveTheDateVariables({
      saveTheDateTitle: input.templateVariables?.saveTheDateTitle || input.eventTitle,
      eventDate: input.templateVariables?.eventDate || input.eventDate,
    });
    const headerMediaId = await verifiedHeaderMediaId(input.headerImageUrl, apiKey);
    return {
      buttonUrlParam,
      mediaId: headerMediaId,
      components: [
        buildHeaderComponent(headerMediaId),
        {
          type: "body",
          parameters: saveTheDateBodyParameters({
            saveTheDateTitle: safeTemplateText(vars.saveTheDateTitle, "—"),
            eventDate: safeTemplateText(vars.eventDate, "תאריך יעודכן בהמשך"),
          }),
        },
      ],
    };
  }

  if (templateName === EVENT_INVITATION_TEMPLATE) {
    const vars = resolveEventInvitationVariables({
      invitationTitle: input.templateVariables?.invitationTitle || input.eventTitle,
      eventDate: input.templateVariables?.eventDate || input.eventDate,
      eventLocation: input.templateVariables?.eventLocation || input.eventLocation,
    });
    const headerMediaId = await verifiedHeaderMediaId(input.headerImageUrl, apiKey);
    return {
      buttonUrlParam,
      mediaId: headerMediaId,
      components: [
        buildHeaderComponent(headerMediaId),
        {
          type: "body",
          parameters: eventInvitationBodyParameters({
            invitationTitle: safeTemplateText(vars.invitationTitle, "—"),
            eventDate: safeTemplateText(vars.eventDate, "תאריך יעודכן בהמשך"),
            eventLocation: whatsappLocationParameter(
              vars.eventLocation,
              "מיקום יישלח בהמשך"
            ),
          }),
        },
      ],
    };
  }

  if (customComponents && customComponents.length > 0) {
    /*
      רק לתבניות אחרות בעתיד.
      לא עבור RSVP סבבים.
    */
    return { buttonUrlParam, mediaId: "", components: customComponents };
  }

  throw new Error(`Unsupported templateName "${templateName}"`);
}