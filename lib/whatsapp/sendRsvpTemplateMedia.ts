// lib/whatsapp/sendRsvpTemplateMedia.ts

export type SendRsvpTemplateMediaInput = {
  to: string;
  eventTitle: string;     // {{1}}
  eventDate: string;      // {{2}}
  eventLocation: string;  // {{3}}
  eventTime: string;      // {{4}}
  rsvpLink: string;       // {{5}}
  headerImageUrl: string; // ✅ חובה (אין ברירת מחדל)
  templateName?: string;
  languageCode?: "he" | "he_IL" | string;
};

const DEFAULT_TEMPLATE_NAME = "rsvp_invitation_media";
const DEFAULT_LANGUAGE_CODE = "he";
const D360_ENDPOINT = "https://waba-v2.360dialog.io/messages";

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

function normalizePhoneIL(phone: string): string {
  const p = String(phone || "").replace(/[^\d]/g, "");
  if (!p) return "";

  // כבר בינלאומי
  if (p.startsWith("972")) return p;

  // 05XXXXXXXX -> 9725XXXXXXX
  if (p.startsWith("0")) return `972${p.slice(1)}`;

  // fallback
  return p;
}

function assertRequiredFields(input: SendRsvpTemplateMediaInput): void {
  if (!isNonEmptyString(input.to)) {
    throw new Error("Missing required field: to");
  }
  if (!isNonEmptyString(input.eventTitle)) {
    throw new Error("Missing required field: eventTitle");
  }
  if (!isNonEmptyString(input.eventDate)) {
    throw new Error("Missing required field: eventDate");
  }
  if (!isNonEmptyString(input.eventLocation)) {
    throw new Error("Missing required field: eventLocation");
  }
  if (!isNonEmptyString(input.eventTime)) {
    throw new Error("Missing required field: eventTime");
  }
  if (!isNonEmptyString(input.rsvpLink)) {
    throw new Error("Missing required field: rsvpLink");
  }
  if (!isNonEmptyString(input.headerImageUrl)) {
    throw new Error("Missing required field: headerImageUrl");
  }
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

export async function sendRsvpTemplateMedia(input: SendRsvpTemplateMediaInput) {
  assertRequiredFields(input);

  const apiKey = process.env.D360_API_KEY;
  if (!isNonEmptyString(apiKey)) {
    throw new Error("Missing env var: D360_API_KEY");
  }

  const to = normalizePhoneIL(input.to);
  if (!isNonEmptyString(to) || to.length < 10) {
    throw new Error(`Invalid phone number after normalization: "${input.to}"`);
  }

  const headerImageUrl = input.headerImageUrl.trim();
  if (!isValidHttpUrl(headerImageUrl)) {
    throw new Error("Invalid headerImageUrl");
  }

  const rsvpLink = input.rsvpLink.trim();
  if (!isValidHttpUrl(rsvpLink)) {
    throw new Error("Invalid rsvpLink");
  }

  const templateName = (input.templateName || DEFAULT_TEMPLATE_NAME).trim();
  const languageCode = (input.languageCode || DEFAULT_LANGUAGE_CODE).trim();

  if (!isNonEmptyString(templateName)) {
    throw new Error("Invalid templateName");
  }
  if (!isNonEmptyString(languageCode)) {
    throw new Error("Invalid languageCode");
  }

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
              image: { link: headerImageUrl }, // ✅ תמיד תמונה של האירוע
            },
          ],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: input.eventTitle.trim() },    // {{1}}
            { type: "text", text: input.eventDate.trim() },     // {{2}}
            { type: "text", text: input.eventLocation.trim() }, // {{3}}
            { type: "text", text: input.eventTime.trim() },     // {{4}}
            { type: "text", text: rsvpLink },                   // {{5}}
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
    ok: true,
    status: res.status,
    to,
    templateName,
    languageCode,
    providerResponse,
  };
}
