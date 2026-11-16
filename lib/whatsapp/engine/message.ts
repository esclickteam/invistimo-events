/**
 * Template payloads for the new engine.
 * Names and parameter counts stay on the approved Meta templates.
 * The provider is chosen by the caller. This file does not send.
 */

import { buildGuestInviteUrl, getInvitationRsvpSiteMode } from "@/lib/guestInviteUrl";
import { whatsappLocationParameter, extractInviteSuffixForButton } from "@/lib/whatsapp/sendRsvpTemplateMedia";
import {
  EVENT_INVITATION_TEMPLATE_NAME,
  SAVE_THE_DATE_TEMPLATE_NAME,
  eventInvitationBodyParameters,
  resolveEventInvitationVariables,
  resolveSaveTheDateVariables,
  resolveWhatsappSendTemplateName,
  saveTheDateBodyParameters,
} from "@/lib/whatsapp/approvedTemplates";

export const ENGINE_TEMPLATE_NAMES = {
  rsvpRound1: "rsvp_invitation_media",
  rsvpRound2: "rsvp_reminder_invistimo",
  saveTheDate: SAVE_THE_DATE_TEMPLATE_NAME,
  invitation: EVENT_INVITATION_TEMPLATE_NAME,
  thankYou: "thank_you_message",
  table: "table_number_update_invistimo",
  tableWithGift: "table_number_update_with_gift",
} as const;

export type HeaderMediaRef =
  | { mode: "link"; link: string }
  | { mode: "id"; id: string };

export type TemplateComponent = Record<string, unknown>;

export type BuiltWhatsappMessage = {
  templateName: string;
  languageCode: "he";
  to: string;
  components: TemplateComponent[];
  buttonUrlParam: string;
  personalUrl: string;
};

function textParam(value: string) {
  return { type: "text", text: value };
}

function headerComponent(media: HeaderMediaRef) {
  return {
    type: "header",
    parameters: [
      {
        type: "image",
        image: media.mode === "id" ? { id: media.id } : { link: media.link },
      },
    ],
  };
}

function urlButton(index: string, value: string) {
  return {
    type: "button",
    sub_type: "url",
    index,
    parameters: [textParam(value)],
  };
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export function buttonSuffixForGuest(input: {
  shareId: string;
  token: string;
  rsvpSiteMode?: unknown;
}) {
  const personalUrl = buildGuestInviteUrl({
    shareId: input.shareId,
    token: input.token,
    rsvpSiteMode: getInvitationRsvpSiteMode({
      rsvpSiteMode: input.rsvpSiteMode,
    }),
  });
  const suffix =
    extractInviteSuffixForButton(personalUrl) ||
    `${clean(input.shareId)}?token=${clean(input.token)}`;
  return { personalUrl, suffix };
}

export function buildEngineTemplateMessage(input: {
  to: string;
  type: string;
  templateName: string;
  guestName: string;
  shareId: string;
  token: string;
  rsvpSiteMode?: unknown;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  header: HeaderMediaRef | null;
  includeTableNumber: boolean;
  tableName: string;
  giftCreditUrl?: string;
  passthroughComponents?: TemplateComponent[] | null;
}): BuiltWhatsappMessage {
  const templateName =
    resolveWhatsappSendTemplateName({
      type: input.type,
      templateName: input.templateName,
    }) || clean(input.templateName);
  const { personalUrl, suffix } = buttonSuffixForGuest(input);
  const languageCode = "he" as const;
  const base = {
    templateName,
    languageCode,
    to: input.to,
    buttonUrlParam: suffix,
    personalUrl,
  };

  if (input.passthroughComponents?.length) {
    return { ...base, components: input.passthroughComponents };
  }

  if (templateName === ENGINE_TEMPLATE_NAMES.rsvpRound1) {
    return {
      ...base,
      components: [
        headerComponent(requireHeader(input.header)),
        {
          type: "body",
          parameters: [
            textParam(input.eventTitle || "—"),
            textParam(input.eventDate || "תאריך יעודכן בהמשך"),
            textParam(whatsappLocationParameter(input.eventLocation)),
          ],
        },
        urlButton("0", suffix),
      ],
    };
  }

  if (templateName === ENGINE_TEMPLATE_NAMES.rsvpRound2) {
    return {
      ...base,
      components: [
        headerComponent(requireHeader(input.header)),
        {
          type: "body",
          parameters: [textParam(input.eventTitle || "האירוע שלנו")],
        },
        urlButton("0", suffix),
      ],
    };
  }

  if (templateName === ENGINE_TEMPLATE_NAMES.saveTheDate) {
    const vars = resolveSaveTheDateVariables({
      saveTheDateTitle: input.eventTitle,
      eventDate: input.eventDate,
    });
    return {
      ...base,
      buttonUrlParam: "",
      components: [
        headerComponent(requireHeader(input.header)),
        {
          type: "body",
          parameters: saveTheDateBodyParameters({
            saveTheDateTitle: vars.saveTheDateTitle || "—",
            eventDate: vars.eventDate || "תאריך יעודכן בהמשך",
          }),
        },
      ],
    };
  }

  if (templateName === ENGINE_TEMPLATE_NAMES.invitation) {
    const vars = resolveEventInvitationVariables({
      invitationTitle: input.eventTitle,
      eventDate: input.eventDate,
      eventLocation: input.eventLocation,
    });
    return {
      ...base,
      components: [
        headerComponent(requireHeader(input.header)),
        {
          type: "body",
          parameters: eventInvitationBodyParameters({
            invitationTitle: vars.invitationTitle || "—",
            eventDate: vars.eventDate || "תאריך יעודכן בהמשך",
            eventLocation: whatsappLocationParameter(
              vars.eventLocation,
              "מיקום יישלח בהמשך"
            ),
          }),
        },
      ],
    };
  }

  if (templateName === ENGINE_TEMPLATE_NAMES.thankYou) {
    return {
      ...base,
      buttonUrlParam: "",
      components: [
        {
          type: "body",
          parameters: [textParam(input.guestName)],
        },
      ],
    };
  }

  if (
    templateName === ENGINE_TEMPLATE_NAMES.table ||
    templateName === ENGINE_TEMPLATE_NAMES.tableWithGift
  ) {
    const components: TemplateComponent[] = [
      {
        type: "body",
        parameters: [
          textParam(input.guestName),
          textParam(input.includeTableNumber ? input.tableName : ""),
          textParam(input.eventTitle),
        ],
      },
      urlButton("0", suffix),
    ];
    if (
      templateName === ENGINE_TEMPLATE_NAMES.tableWithGift &&
      clean(input.giftCreditUrl)
    ) {
      components.push(urlButton("1", clean(input.giftCreditUrl)));
    }
    return { ...base, components };
  }

  return { ...base, components: [] };
}

function requireHeader(header: HeaderMediaRef | null): HeaderMediaRef {
  if (!header) {
    throw new Error("MISSING_HEADER_MEDIA");
  }
  if (header.mode === "link" && !header.link.startsWith("https://")) {
    throw new Error("MISSING_HEADER_MEDIA");
  }
  if (header.mode === "id" && !header.id) {
    throw new Error("MISSING_HEADER_MEDIA");
  }
  return header;
}
