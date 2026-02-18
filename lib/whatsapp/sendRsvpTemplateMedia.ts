// lib/whatsapp/sendRsvpTemplateMedia.ts

/* ================= TYPES ================= */

type BaseInput = {
  to: string;
  rsvpLink: string;
  headerImageUrl: string;
  languageCode?: "he" | "he_IL" | string;
};

/** סבב 1 – עם גוף */
type RsvpRound1Input = BaseInput & {
  templateName?: "rsvp_invitation_media";
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
};

/** סבב 2 – בלי גוף בכלל */
type RsvpRound2Input = BaseInput & {
  templateName: "rsvp_reminder_invistimo";
};

export type SendRsvpTemplateMediaInput =
  | RsvpRound1Input
  | RsvpRound2Input;

  

/* ================= CONSTS ================= */

const DEFAULT_TEMPLATE_NAME = "rsvp_invitation_media";
const DEFAULT_LANGUAGE_CODE = "he";
const D360_ENDPOINT = "https://waba-v2.360dialog.io/messages";

/* ================= HELPERS ================= */

function isRound1Input(
  input: SendRsvpTemplateMediaInput
): input is RsvpRound1Input {
  return input.templateName !== "rsvp_reminder_invistimo";
}


function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeTemplateText(text: string): string {
  return text
    .replace(/[\n\r\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
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

/**
 * https://www.invistimo.com/invite/ABC?token=123
 * => ABC?token=123
 */
function extractInviteSuffixForButton(rsvpLink: string): string {
  const u = new URL(rsvpLink.trim());
  const parts = u.pathname.split("/").filter(Boolean);

  const inviteIndex = parts.findIndex(
    (p) => p.toLowerCase() === "invite"
  );
  const inviteId = inviteIndex >= 0 ? parts[inviteIndex + 1] : "";

  if (!inviteId) {
    throw new Error("Invalid rsvpLink: inviteId not found");
  }

  const suffix = `${inviteId}${u.search || ""}`.trim();

  if (!suffix || /\s/.test(suffix)) {
    throw new Error("Invalid rsvpLink: bad button suffix");
  }

  return suffix;
}

function assertRequiredFields(input: SendRsvpTemplateMediaInput) {
  if (!isNonEmptyString(input.to)) throw new Error("Missing field: to");
  if (!isNonEmptyString(input.rsvpLink))
    throw new Error("Missing field: rsvpLink");
  if (!isNonEmptyString(input.headerImageUrl))
    throw new Error("Missing field: headerImageUrl");

  if (input.templateName !== "rsvp_reminder_invistimo") {
    if (!isNonEmptyString(input.eventTitle))
      throw new Error("Missing field: eventTitle");
    if (!isNonEmptyString(input.eventDate))
      throw new Error("Missing field: eventDate");
    if (!isNonEmptyString(input.eventLocation))
      throw new Error("Missing field: eventLocation");
  }
}

async function safeParseResponse(res: Response): Promise<any> {
  const text = await res.text().catch(() => "");
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
  if (!isNonEmptyString(to)) {
    throw new Error(`Invalid phone number: ${input.to}`);
  }

  if (!isValidHttpsUrl(input.headerImageUrl)) {
    throw new Error("Invalid headerImageUrl");
  }

  if (!isValidHttpsUrl(input.rsvpLink)) {
    throw new Error("Invalid rsvpLink");
  }

  const buttonUrlParam = extractInviteSuffixForButton(input.rsvpLink);

  const templateName =
    input.templateName || DEFAULT_TEMPLATE_NAME;
  const languageCode =
    input.languageCode || DEFAULT_LANGUAGE_CODE;

  const isReminder =
    templateName === "rsvp_reminder_invistimo";

  const components: any[] = [
    {
      type: "header",
      parameters: [
        {
          type: "image",
          image: { link: input.headerImageUrl.trim() },
        },
      ],
    },
  ];

  // ✅ גוף – רק בסבב 1
  if (isRound1Input(input)) {
  components.push({
    type: "body",
    parameters: [
      {
        type: "text",
        text: normalizeTemplateText(input.eventTitle),
      },
      {
        type: "text",
        text: normalizeTemplateText(input.eventDate),
      },
      {
        type: "text",
        text: normalizeTemplateText(input.eventLocation),
      },
    ],
  });
}


  // ✅ כפתור – תמיד
  components.push({
    type: "button",
    sub_type: "url",
    index: "0",
    parameters: [
      {
        type: "text",
        text: buttonUrlParam,
      },
    ],
  });

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
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
    buttonUrlParam,
    providerResponse,
  };
}
