// lib/whatsapp/sendTableNumberTemplate.ts
type SendTableNumberTemplateInput = {
  to: string;
  name: string;       // {{1}}
  tableName: string;  // {{2}}
  eventType: string;  // {{3}}  (חתונה/ברית/בריתה...)
  templateName?: string;
  languageCode?: string;
};

const D360_ENDPOINT = "https://waba-v2.360dialog.io/messages";
const DEFAULT_TEMPLATE_NAME = "table_number_update";
const DEFAULT_LANGUAGE_CODE = "he";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizePhoneIL(phone: string): string {
  const p = String(phone || "").replace(/[^\d]/g, "");
  if (!p) return "";
  if (p.startsWith("972")) return p;
  if (p.startsWith("0")) return `972${p.slice(1)}`;
  return p;
}

function assertRequired(input: SendTableNumberTemplateInput) {
  if (!isNonEmptyString(input.to)) throw new Error("Missing required field: to");
  if (!isNonEmptyString(input.name)) throw new Error("Missing required field: name");
  if (!isNonEmptyString(input.tableName)) throw new Error("Missing required field: tableName");
  if (!isNonEmptyString(input.eventType)) throw new Error("Missing required field: eventType");
}

export async function sendTableNumberTemplate(input: SendTableNumberTemplateInput) {
  assertRequired(input);

  const apiKey = process.env.D360_API_KEY;
  if (!apiKey) throw new Error("Missing env var: D360_API_KEY");

  const to = normalizePhoneIL(input.to);
  if (!isNonEmptyString(to) || to.length < 10) {
    throw new Error(`Invalid phone number after normalization: "${input.to}"`);
  }

  const templateName = (input.templateName || DEFAULT_TEMPLATE_NAME).trim();
  const languageCode = (input.languageCode || DEFAULT_LANGUAGE_CODE).trim();

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
            { type: "text", text: input.name.trim() },      // {{1}}
            { type: "text", text: input.tableName.trim() }, // {{2}}
            { type: "text", text: input.eventType.trim() }, // {{3}}
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

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      `sendTableNumberTemplate failed (${res.status}): ${JSON.stringify(data)}`
    );
  }

  return data;
}
