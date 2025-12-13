import type { Guest } from "@/types/guest";

export type MessageTemplateType = "rsvp" | "table" | "custom";

export function buildMessage({
  template,
  guest,
  invitation,
  customText,
}: {
  template: MessageTemplateType;
  guest: Guest;
  invitation: any;
  customText?: string;
}) {
  const base = {
    rsvp:
      "היי {{name}} 💛\nנשמח לדעת אם תגיע/י לאירוע 🎉\nלאישור הגעה:\n{{rsvpLink}}",

    table:
      "שלום {{name}} 🌸\nשמחים לעדכן שמספר השולחן שלך:\n🪑 {{tableName}}\nמחכים לך!",

    custom: customText || "",
  };

  let message = base[template];

  message = message.replace("{{name}}", guest.name);

  if (message.includes("{{tableName}}")) {
    message = message.replace(
      "{{tableName}}",
      guest.tableName || ""
    );
  }

  if (message.includes("{{rsvpLink}}")) {
    message = message.replace(
      "{{rsvpLink}}",
      `https://invistimo.com/invite/rsvp/${invitation.shareId}?token=${guest.token}`
    );
  }

  return message;
}
