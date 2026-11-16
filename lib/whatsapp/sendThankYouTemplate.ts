// lib/whatsapp/sendThankYouTemplate.ts
import { toWhatsappDigits } from "@/lib/phones/international";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider";
type SendThankYouTemplateInput = {
  to: string;
  name: string; // {{1}}
  templateName?: string;
  languageCode?: string;
};

const DEFAULT_TEMPLATE_NAME = "thank_you_message";
const DEFAULT_LANGUAGE_CODE = "he";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizePhoneIL(phone: string): string {
  return toWhatsappDigits(phone);
}

function assertRequired(input: SendThankYouTemplateInput) {
  if (!isNonEmptyString(input.to)) throw new Error("Missing required field: to");
  if (!isNonEmptyString(input.name)) throw new Error("Missing required field: name");
}

export async function sendThankYouTemplate(input: SendThankYouTemplateInput) {
  assertRequired(input);

  const provider = getWhatsAppProvider();

  const to = normalizePhoneIL(input.to);
  if (!isNonEmptyString(to) || to.length < 10) {
    throw new Error(`Invalid phone number after normalization: "${input.to}"`);
  }

  const templateName = (input.templateName || DEFAULT_TEMPLATE_NAME).trim();
  const languageCode = (input.languageCode || DEFAULT_LANGUAGE_CODE).trim();

  try {
    const sent = await provider.sendTemplate({
      to,
      templateName,
      languageCode,
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: input.name.trim() }],
        },
      ],
    });
    return sent.providerResponse;
  } catch (error: any) {
    if (error?.httpStatus) {
      throw new Error(
        `sendThankYouTemplate failed (${error.httpStatus}): ${JSON.stringify(error.providerResponse ?? {})}`
      );
    }
    throw error;
  }
}
