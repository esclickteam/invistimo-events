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
const D360_ENDPOINT = "https://waba-v2.360dialog.io/messages";

export async function sendRsvpWithGiftTemplate(
  input: SendRsvpWithGiftInput
) {
  const {
    to,
    eventTitle,
    eventDate,
    eventLocation,
    eventTime,
    rsvpLink,
    giftCreditUrl,
    templateName = DEFAULT_TEMPLATE_NAME,
    languageCode = DEFAULT_LANGUAGE_CODE,
  } = input;

  const response = await fetch(D360_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "D360-API-KEY": process.env.D360_API_KEY!,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
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
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("WhatsApp Error:", data);
    throw new Error("Failed to send WhatsApp template");
  }

  return data;
}
