export type SendRsvpTemplateMediaInput = {
  to: string;

  // BODY VARIABLES
  eventTitle: string; // {{1}}
  eventDate: string; // {{2}} – סבב 1 בלבד
  eventLocation: string; // {{3}} – סבב 1 בלבד

  /**
   * קישור אישי מלא, לדוגמה:
   * https://www.invistimo.com/invite/INHtag6CZG?token=tSPo8g_1x5Li
   */
  rsvpLink: string;

  // HEADER
  headerImageUrl: string;

  templateName?: string;
  languageCode?: "he" | "he_IL" | string;
};

const ROUND1_TEMPLATE = "rsvp_invitation_media";
const ROUND2_TEMPLATE = "rsvp_reminder_invistimo";

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
 * This guarantees a non-empty string (or returns a fallback).
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

function extractInviteSuffixForButton(rsvpLink: string): string {
  const u = new URL(rsvpLink.trim());
  const parts = u.pathname.split("/").filter(Boolean);

  const inviteIndex = parts.findIndex((p) => p.toLowerCase() === "invite");
  const inviteId = inviteIndex >= 0 ? parts[inviteIndex + 1] : "";

  if (!inviteId) {
    throw new Error("Invalid rsvpLink: inviteId not found");
  }

  return `${inviteId}${u.search || ""}`;
}

function assertRequiredFields(input: SendRsvpTemplateMediaInput): void {
  if (!isNonEmptyString(input.to)) throw new Error("Missing field: to");
  if (!isNonEmptyString(input.eventTitle))
    throw new Error("Missing field: eventTitle");
  if (!isNonEmptyString(input.rsvpLink))
    throw new Error("Missing field: rsvpLink");
  if (!isNonEmptyString(input.headerImageUrl))
    throw new Error("Missing field: headerImageUrl");
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

/* ================= MAIN ================= */

function forceCloudinaryWhatsappQuality(url: string): string {
  const clean = String(url || "").trim();

  if (!clean.includes("res.cloudinary.com")) {
    return clean;
  }

  let next = clean;

  // מוחק טרנספורמציות דחיסה קיימות
  next = next.replace(/\/q_[^,/]+\//g, "/");
  next = next.replace(/\/f_[^,/]+\//g, "/");
  next = next.replace(/\/w_\d+[^/]*\//g, "/");
  next = next.replace(/\/h_\d+[^/]*\//g, "/");
  next = next.replace(/\/c_[^/]+\//g, "/");

  // מוסיף איכות מקסימלית
  next = next.replace(
    "/upload/",
    "/upload/fl_attachment,q_100,f_jpg/"
  );

  return next;
}

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

  const headerImageUrl = forceCloudinaryWhatsappQuality(
  String(input.headerImageUrl ?? "").trim()
);
  if (!isValidHttpsUrl(headerImageUrl)) {
    throw new Error("Invalid headerImageUrl (must be https)");
  }

  const rsvpLink = String(input.rsvpLink ?? "").trim();
  if (!isValidHttpsUrl(rsvpLink)) {
    throw new Error("Invalid rsvpLink (must be https)");
  }

  const buttonUrlParam = extractInviteSuffixForButton(rsvpLink);

  const templateName = (input.templateName || DEFAULT_TEMPLATE_NAME).trim();
  const languageCode = (input.languageCode || DEFAULT_LANGUAGE_CODE).trim();

  /* ================= BODY PARAMETERS ================= */

  let bodyParameters: { type: "text"; text: string }[] = [];

  if (templateName === ROUND1_TEMPLATE) {
    // Round 1 requires 3 body params in the approved template.
    // WhatsApp rejects empty text params, so we always provide fallbacks.
    bodyParameters = [
      { type: "text", text: safeTemplateText(input.eventTitle, "—") },
      { type: "text", text: safeTemplateText(input.eventDate, "תאריך יעודכן בהמשך") },
      { type: "text", text: safeTemplateText(input.eventLocation, "מיקום יישלח בהמשך") },
    ];
  } else if (templateName === ROUND2_TEMPLATE) {
    bodyParameters = [
      { type: "text", text: safeTemplateText(input.eventTitle, "—") },
    ];
  } else {
    throw new Error(`Unsupported templateName "${templateName}"`);
  }

  /* ================= PAYLOAD ================= */

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: { link: headerImageUrl },
            },
          ],
        },
        {
          type: "body",
          parameters: bodyParameters,
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [
            {
              type: "text",
              text: safeTemplateText(buttonUrlParam, "invite"),
            },
          ],
        },
      ],
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
    throw new Error(
      `WhatsApp template send failed (${res.status}): ${JSON.stringify(
        providerResponse
      )}`
    );
  }

  // ⭐⭐ הקריטי – מזהה הודעה ל-delivery tracking
  const messageId = providerResponse?.messages?.[0]?.id ?? null;

  return {
    success: true,
    to,
    templateName,
    languageCode,
    buttonUrlParam,
    messageId, // 👈 זה מה שמחבר ל-Webhook
    providerResponse,
  };
}