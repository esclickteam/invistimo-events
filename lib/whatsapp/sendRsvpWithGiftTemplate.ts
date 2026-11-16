import { toWhatsappDigits } from "@/lib/phones/international";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider";

export type SendRsvpWithGiftInput = {
  to: string;

  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventTime: string;

  rsvpLink: string;
  giftCreditUrl: string;

  templateName?: string;
  languageCode?: string;
};

const DEFAULT_TEMPLATE_NAME = "table_number_update_with_gift";
const DEFAULT_LANGUAGE_CODE = "he";

export async function sendRsvpWithGiftTemplate(
  input: SendRsvpWithGiftInput
) {
  const to = toWhatsappDigits(input.to);
  if (!to) {
    throw new Error("INVALID_PHONE");
  }

  const {
    eventTitle,
    eventDate,
    eventLocation,
    eventTime,
    rsvpLink,
    giftCreditUrl,
    templateName = DEFAULT_TEMPLATE_NAME,
    languageCode = DEFAULT_LANGUAGE_CODE,
  } = input;

  const provider = getWhatsAppProvider();
  try {
    const sent = await provider.sendTemplate({
      to,
      templateName,
      languageCode,
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: eventTitle },
            { type: "text", text: eventDate },
            { type: "text", text: eventLocation },
            { type: "text", text: eventTime },
          ],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: rsvpLink }],
        },
        {
          type: "button",
          sub_type: "url",
          index: "1",
          parameters: [{ type: "text", text: giftCreditUrl }],
        },
      ],
    });
    return sent.providerResponse;
  } catch (error: any) {
    if (error?.providerResponse) {
      console.error("WhatsApp Error:", error.providerResponse);
      throw new Error("Failed to send WhatsApp template");
    }
    throw error;
  }
}
