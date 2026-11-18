import { createDialogProvider } from "@/lib/whatsapp/provider/dialogProvider";
import type { WhatsAppTemplateComponent } from "@/lib/whatsapp/provider/types";
import {
  WHATSAPP_HEADER_PROBE_IMAGE_URL,
  WHATSAPP_HEADER_PROBE_RECIPIENT,
  WHATSAPP_HEADER_PROBE_TEMPLATE,
} from "@/lib/whatsapp/headerProbe";

/**
 * One isolated display check for rsvp_invitation_media.
 *
 * The header in this isolated check stays image.link.
 * Customer invitation sends do not call this module. Nothing is sent unless the
 * caller passes the explicit confirm string.
 */

export const ONE_HEADER_PROBE_PHRASE = "ONE_HEADER_PROBE_SEND";

/** Armed after the dormant deploy was checked. The database lock still allows one send. */
export const LINK_DISPLAY_EXPERIMENT_ARMED = true;

const BUTTON_SUFFIX = "header-probe?token=display";

export const LINK_DISPLAY_LOCK_ID = "one";
export const LINK_DISPLAY_QUEUE_KEY = "whatsapp:link-display-experiment:one";

export type OneHeaderProbeApproval = {
  phrase: typeof ONE_HEADER_PROBE_PHRASE;
  to: string;
};

export type LinkDisplayLockStore = {
  claim(): Promise<"claimed" | "already">;
  complete(result: {
    messageId: string;
    providerResponse: Record<string, unknown>;
  }): Promise<void>;
  fail(error: { message: string }): Promise<void>;
};

export function memoryLinkDisplayLock(): LinkDisplayLockStore {
  let claimed = false;
  return {
    async claim() {
      if (claimed) return "already";
      claimed = true;
      return "claimed";
    },
    async complete() {},
    async fail() {},
  };
}

let processStore = memoryLinkDisplayLock();

/** Test-only. Production uses the database lock. */
export function resetOneHeaderProbeSendForTests() {
  processStore = memoryLinkDisplayLock();
}

export function linkDisplayCronAuthorized(secret: string, authorization: string | null) {
  const expected = String(secret || "").trim();
  if (!expected) return false;
  return String(authorization || "").trim() === `Bearer ${expected}`;
}

function digitsOnly(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export type LinkDisplayRequest = {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: "he" };
    components: WhatsAppTemplateComponent[];
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
    const parameters = (component.parameters ?? []).map((parameter) => {
      const row = parameter as { type?: string; text?: string };
      if (row.type !== "text") return parameter;
      return { ...row, text: "header-probe?token=[redacted]" };
    });
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

function imageOf(body: LinkDisplayRequest) {
  const header = body.template.components[0];
  const parameter = header?.parameters?.[0] as { image?: { link?: string; id?: string } } | undefined;
  return parameter?.image;
}

function buttonTextOf(body: LinkDisplayRequest) {
  const button = body.template.components[2];
  const parameter = button?.parameters?.[0] as { text?: string } | undefined;
  return button?.sub_type === "url" ? parameter?.text : "";
}

/**
 * One explicit owner approval. Message history does not count as approval.
 * The destination must be the probe number named in the approval, the button
 * must be the header-probe link, and the header must be image.link.
 * A second call, or any other number, is refused.
 */
export function oneHeaderProbeSendAllowed(approval: OneHeaderProbeApproval | null | undefined) {
  if (!approval || approval.phrase !== ONE_HEADER_PROBE_PHRASE) return false;
  if (digitsOnly(approval.to) !== WHATSAPP_HEADER_PROBE_RECIPIENT) return false;
  const body = linkDisplayRequestBody(digitsOnly(approval.to));
  const image = imageOf(body);
  if (!image?.link || image.id) return false;
  if (image.link !== WHATSAPP_HEADER_PROBE_IMAGE_URL) return false;
  if (body.to !== WHATSAPP_HEADER_PROBE_RECIPIENT) return false;
  if (buttonTextOf(body) !== BUTTON_SUFFIX) return false;
  return true;
}

export async function sendLinkDisplayExperiment(
  approval: OneHeaderProbeApproval | null | undefined,
  deps: { fetch?: typeof fetch; apiKey?: string; store?: LinkDisplayLockStore } = {}
) {
  if (!oneHeaderProbeSendAllowed(approval)) {
    throw new LinkDisplayNotApproved();
  }
  const store = deps.store ?? processStore;
  if ((await store.claim()) !== "claimed") {
    throw new LinkDisplayNotApproved();
  }
  const body = linkDisplayRequestBody(WHATSAPP_HEADER_PROBE_RECIPIENT);
  try {
    const provider = createDialogProvider({
      fetch: deps.fetch,
      apiKey: deps.apiKey,
    });
    const sent = await provider.sendTemplate({
      to: body.to,
      templateName: body.template.name,
      languageCode: body.template.language.code,
      components: body.template.components,
    });
    await store.complete({
      messageId: sent.messageId,
      providerResponse: sent.providerResponse,
    });
    return sent;
  } catch (error) {
    await store.fail({
      message: error instanceof Error ? error.message : "send failed",
    });
    throw error;
  }
}
