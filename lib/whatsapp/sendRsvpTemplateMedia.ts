// lib/whatsapp/sendRsvpTemplateMedia.ts

export type SendRsvpTemplateMediaInput = {
  to: string;

  // BODY VARIABLES – ORDER IS CRITICAL
  eventTitle: string;     // {{1}}
  eventDate: string;      // {{2}}
  eventLocation: string;  // {{3}}
  eventTime: string;      // {{4}}
  rsvpLink: string;       // {{5}}

  // HEADER
  headerImageUrl: string;

  templateName?: string;
  languageCode?: "he" | "he_IL" | string;
};

const DEFAULT_TEMPLATE_NAME = "rsvp_invitation_media";
const DEFAULT_LANGUAGE_CODE = "he";
const D360_ENDPOINT = "https://waba-v2.360dialog.io/messages";

/* ================= HELPERS ================= */

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * 🔥 קריטי: שבירת טקסט לשורות קצרות
 * מונע "להמשך קריאה" ב-WhatsApp
 */
function normalizeWhatsappText(text: string): string {
  return text
    .replace(/\s*,\s*/g, "\n")
    .replace(/\s*-\s*/g, "\n")
    .replace(/\s{2,}/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizePhoneIL(phone: string): string {
  const p = String(phone || "").replace(/[^\d]/g, "");
  if (!p) return "";

  if (p.startsWith("972")) return p;
  if (p.startsWith("0")) return `972${p.slice(1)}`;

  return p;
}

function assertRequiredFields(input: SendRsvpTemplateMediaInput): void {
  if (!isNonEmptyString(input.to)) throw new Error("Missing field: to");
  if (!isNonEmptyString(input.eventTitle)) throw new Error("Missing field: eventTitle");
  if (!isNonEmptyString(input.eventDate)) throw new Error("Missing field: eventDate");
  if (!isNonEmptyString(input.eventLocation)) throw new Error("Missing field: eventLocation");
  if (!isNonEmptyString(input.eventTime)) throw new Error("Missing field: eventTime");
  if (!isNonEmptyString(input.rsvpLink)) throw new Error("Missing field: rsvpLink");
  if (!isNonEmptyString(input.headerImageUrl)) throw new Error("Missing field: headerImageUrl");
}

async function safeParseResponse(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/* ================= MAIN ================= */

export async function sendRsvpTemplateMedia(
  input: SendRsvpTemplateMediaInput
) {
  assertRequiredFields(input);

  const apiKey = process.env.WHATSAPP_API_KEY;
  if (!isNonEmptyString(apiKey)) {
    throw new Error("Missing env var: WHATSAPP_API_KEY");
  }

  const to = normalizePhoneIL(input.to);
  if (!isNonEmptyString(to) || to.length < 10) {
    throw new Error(`Invalid phone number: ${input.to}`);
  }

  if (!isValidHttpUrl(input.headerImageUrl)) {
    throw new Error("Invalid headerImageUrl");
  }

  if (!isValidHttpUrl(input.rsvpLink)) {
    throw new Error("Invalid rsvpLink");
  }

  const templateName =
    (input.templateName || DEFAULT_TEMPLATE_NAME).trim();
  const languageCode =
    (input.languageCode || DEFAULT_LANGUAGE_CODE).trim();

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
              image: {
                link: input.headerImageUrl.trim(),
              },
            },
          ],
        },
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: normalizeWhatsappText(input.eventTitle),
            }, // {{1}}
            {
              type: "text",
              text: normalizeWhatsappText(input.eventDate),
            }, // {{2}}
            {
              type: "text",
              text: normalizeWhatsappText(input.eventLocation),
            }, // {{3}}
            {
              type: "text",
              text: normalizeWhatsappText(input.eventTime),
            }, // {{4}}
            {
              type: "text",
              text: input.rsvpLink.trim(), // קישור רציף – לא שוברים
            }, // {{5}}
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

  return {
    success: true,
    to,
    templateName,
    languageCode,
    providerResponse,
  };
}
