// lib/whatsapp/sendTableNumberTemplate.ts

type SendTableNumberTemplateInput = {
  to: string;
  name: string;        // {{1}}
  tableName: string;   // {{2}}
  eventType: string;   // {{3}}
  urlSuffix: string;   // כפתור URL {{1}}
  templateName?: string;
  languageCode?: string;
};

type D360SuccessResponse = {
  messages?: Array<{ id?: string }>;
  contacts?: Array<{ input?: string; wa_id?: string }>;
  [key: string]: unknown;
};

const D360_ENDPOINT = "https://waba-v2.360dialog.io/messages";
const DEFAULT_TEMPLATE_NAME = "table_number_update_invistimo";
const DEFAULT_LANGUAGE_CODE = "he";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizePhoneIL(phone: string): string {
  const digits = String(phone ?? "").replace(/[^\d+]/g, "").trim();
  if (!digits) return "";

  const noPlus = digits.replace(/^\+/, "");
  const p = noPlus.replace(/\D/g, "");

  if (!p) return "";
  if (p.startsWith("972")) return p;
  if (p.startsWith("0")) return `972${p.slice(1)}`;

  return p;
}

function assertRequired(input: SendTableNumberTemplateInput): void {
  if (!isNonEmptyString(input.to)) {
    throw new Error("Missing required field: to");
  }
  if (!isNonEmptyString(input.name)) {
    throw new Error("Missing required field: name");
  }
  if (!isNonEmptyString(input.tableName)) {
    throw new Error("Missing required field: tableName");
  }
  if (!isNonEmptyString(input.eventType)) {
    throw new Error("Missing required field: eventType");
  }
  if (!isNonEmptyString(input.urlSuffix)) {
    throw new Error("Missing required field: urlSuffix");
  }
}

function assertEnv(): string {
  const apiKey = process.env.WHATSAPP_API_KEY;
  if (!isNonEmptyString(apiKey)) {
    throw new Error("Missing env var: WHATSAPP_API_KEY");
  }
  return apiKey.trim();
}

function sanitizeTemplateName(name?: string): string {
  const value = (name ?? DEFAULT_TEMPLATE_NAME).trim();
  return value || DEFAULT_TEMPLATE_NAME;
}

function sanitizeLanguageCode(code?: string): string {
  const value = (code ?? DEFAULT_LANGUAGE_CODE).trim();
  return value || DEFAULT_LANGUAGE_CODE;
}

export async function sendTableNumberTemplate(
  input: SendTableNumberTemplateInput
): Promise<D360SuccessResponse> {
  assertRequired(input);
  const apiKey = assertEnv();

  const to = normalizePhoneIL(input.to);
  if (!isNonEmptyString(to) || to.length < 11 || to.length > 15) {
    throw new Error(`Invalid phone number after normalization: "${input.to}"`);
  }

  const templateName = sanitizeTemplateName(input.templateName);
  const languageCode = sanitizeLanguageCode(input.languageCode);

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: input.name.trim() },       // {{1}}
            { type: "text", text: input.tableName.trim() },  // {{2}}
            { type: "text", text: input.eventType.trim() },  // {{3}}
          ],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [
            {
              type: "text",
              text: input.urlSuffix.trim(), // רק ה-suffix!
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

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(
      `sendTableNumberTemplate failed (${res.status}): ${JSON.stringify(data)}`
    );
  }

  return data as D360SuccessResponse;
}
