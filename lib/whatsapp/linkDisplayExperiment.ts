import { createDialogProvider } from "@/lib/whatsapp/provider/dialogProvider";
import {
  WHATSAPP_HEADER_PROBE_IMAGE_URL,
  WHATSAPP_HEADER_PROBE_RECIPIENT,
  WHATSAPP_HEADER_PROBE_TEMPLATE,
} from "@/lib/whatsapp/headerProbe";

/**
 * One isolated display check for rsvp_invitation_media.
 *
 * The header is always image.link. WHATSAPP_HEADER_MEDIA is not read.
 * Customer rounds do not call this module. Nothing is sent unless the
 * caller passes the explicit confirm string.
 */

export const LINK_DISPLAY_SEND_CONFIRM = "SEND_ONE_APPROVED";

const BUTTON_SUFFIX = "header-probe?token=display";

export type LinkDisplayRequest = {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: "he" };
    components: Array<Record<string, unknown>>;
  };
};

export function linkDisplayRequestBody(
  to = WHATSAPP_HEADER_PROBE_RECIPIENT
): LinkDisplayRequest {
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: WHATSAPP_HEADER_PROBE_TEMPLATE,
      language: { code: "he" },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: { link: WHATSAPP_HEADER_PROBE_IMAGE_URL },
            },
          ],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: "בדיקת תצוגה" },
            { type: "text", text: "16.11.2026" },
            { type: "text", text: "בדיקה" },
          ],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: BUTTON_SUFFIX }],
        },
      ],
    },
  };
}

/** Same request with the phone and button token removed. */
export function redactLinkDisplayRequest(body: LinkDisplayRequest) {
  const components = body.template.components.map((component) => {
    if (component.type !== "button") return component;
    const parameters = Array.isArray(component.parameters)
      ? component.parameters.map((parameter) => {
          const row = parameter as { type?: string; text?: string };
          if (row.type !== "text") return parameter;
          return { ...row, text: "header-probe?token=[redacted]" };
        })
      : component.parameters;
    return { ...component, parameters };
  });
  return {
    messaging_product: body.messaging_product,
    to: "[redacted]",
    type: body.type,
    template: {
      name: body.template.name,
      language: body.template.language,
      components,
    },
  };
}

export class LinkDisplayNotApproved extends Error {
  constructor() {
    super("link display send is waiting for approval");
    this.name = "LinkDisplayNotApproved";
  }
}

/**
 * Not submitted anywhere. Used only if the link send still renders small on
 * iPhone. The live template rsvp_invitation_media is not in this object.
 */
export function experimentalTemplateDraft() {
  return {
    name: "rsvp_invitation_display_trial",
    language: "he",
    components: [
      { type: "HEADER", format: "IMAGE" },
      {
        type: "BODY",
        text:
          "משפחה וחברים יקרים,\n" +
          "הנכם מוזמנים ל- {{1}}\n" +
          "תאריך: {{2}}\n" +
          "מיקום: {{3}}\n" +
          "לאישור הגעה לחצו על הכפתור למטה",
        example: { body_text: [["בדיקת תצוגה", "16.11.2026", "בדיקה"]] },
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "URL",
            text: "אישור הגעה",
            url: "https://www.invistimo.com/invite/{{1}}",
            example: ["header-probe?token=display"],
          },
        ],
      },
    ],
  };
}

export async function sendLinkDisplayExperiment(
  confirm: string,
  deps: { fetch?: typeof fetch; apiKey?: string } = {}
) {
  if (confirm !== LINK_DISPLAY_SEND_CONFIRM) {
    throw new LinkDisplayNotApproved();
  }
  const body = linkDisplayRequestBody();
  const provider = createDialogProvider({
    fetch: deps.fetch,
    apiKey: deps.apiKey,
  });
  return provider.sendTemplate({
    to: body.to,
    templateName: body.template.name,
    languageCode: body.template.language.code,
    components: body.template.components,
  });
}
