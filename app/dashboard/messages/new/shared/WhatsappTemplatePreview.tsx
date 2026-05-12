"use client";

type Props = {
  templateKey:
    | "rsvp_invitation_media"
    | "rsvp_reminder_invistimo"
    | "table"
    | "custom";

  previewText?: string;
  headerImageUrl?: string;

  invitationTitle?: string;
  eventDate?: string | Date;
  eventTime?: string;
  eventLocation?: string;
  shareId?: string;
  rsvpUrl?: string;
};

function formatDate(value?: string | Date) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("he-IL");
}

function cleanLocation(value?: string) {
  if (!value) return "";

  return value
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ",")
    .trim();
}

function buildRsvpPreviewText({
  templateKey,
  previewText,
  invitationTitle,
  eventDate,
  eventTime,
  eventLocation,
}: {
  templateKey: Props["templateKey"];
  previewText?: string;
  invitationTitle?: string;
  eventDate?: string | Date;
  eventTime?: string;
  eventLocation?: string;
}) {
  const title = invitationTitle?.trim() || "האירוע";
  const dateText = formatDate(eventDate);
  const locationText = cleanLocation(eventLocation);

  if (
    templateKey !== "rsvp_invitation_media" &&
    templateKey !== "rsvp_reminder_invistimo"
  ) {
    return previewText || "";
  }

  if (previewText?.trim()) {
    return previewText
      .replace(/{{invitationTitle}}/g, title)
      .replace(/{{eventDate}}/g, dateText)
      .replace(/{{eventTime}}/g, eventTime || "")
      .replace(/{{eventLocation}}/g, locationText);
  }

  return (
    "משפחה וחברים יקרים,\n" +
    `הנכם מוזמנים ל${title} 🤍\n\n` +
    (dateText ? `📅 תאריך: ${dateText}\n` : "") +
    (eventTime ? `🕘 שעה: ${eventTime}\n` : "") +
    (locationText ? `📍 מיקום: ${locationText}\n\n` : "\n") +
    "לאישור הגעה לחצו על הכפתור למטה 👇\n\n" +
    "מחכים לשמוח איתכם 💖"
  );
}

export default function WhatsappTemplatePreview({
  templateKey,
  previewText,
  headerImageUrl,
  invitationTitle,
  eventDate,
  eventTime,
  eventLocation,
  shareId,
  rsvpUrl,
}: Props) {
  const isRsvp =
    templateKey === "rsvp_invitation_media" ||
    templateKey === "rsvp_reminder_invistimo";

  const finalPreviewText = buildRsvpPreviewText({
    templateKey,
    previewText,
    invitationTitle,
    eventDate,
    eventTime,
    eventLocation,
  });

  const finalRsvpUrl =
    rsvpUrl ||
    (shareId ? `https://www.invistimo.com/invite/${shareId}` : "");

  return (
    <div
      dir="rtl"
      className="
        mx-auto
        w-[360px]
        rounded-[38px]
        bg-black
        p-3
        shadow-[0_26px_70px_rgba(0,0,0,0.35)]
      "
    >
      <div
        className="
          overflow-hidden
          rounded-[30px]
          bg-[#ECE5DD]
        "
        style={{
          backgroundImage: "url('/whatsapp-bg.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "320px",
        }}
      >
        {/* HEADER */}
        <div
          className="
            border-b
            border-black/5
            bg-[#F7F7F7]
            py-2
            text-center
            text-xs
            font-bold
            text-[#5F5F5F]
          "
        >
          INVISTIMO · WhatsApp
        </div>

        <div className="p-4">
          <div className="mx-auto max-w-[92%]">
            <div
              className="
                overflow-hidden
                rounded-[22px]
                bg-white
                shadow-[0_8px_26px_rgba(0,0,0,0.08)]
              "
            >
              {/* IMAGE */}
              {headerImageUrl && (
                <img
                  src={headerImageUrl}
                  alt="Invitation"
                  className="
                    h-[185px]
                    w-full
                    object-cover
                    object-center
                  "
                />
              )}

              {/* MESSAGE */}
              <div
                className="
                  whitespace-pre-wrap
                  break-words
                  px-4
                  py-4
                  text-center
                  text-[14px]
                  leading-7
                  text-[#3E342C]
                "
              >
                {finalPreviewText}
              </div>
            </div>

            {/* BUTTON */}
            {isRsvp && (
              <button
                type="button"
                disabled
                className="
                  mt-2
                  w-full
                  rounded-xl
                  border
                  border-gray-200
                  bg-white
                  py-2.5
                  text-sm
                  font-bold
                  text-[#1D6FB8]
                  shadow-sm
                "
              >
                אישור הגעה
              </button>
            )}

            {isRsvp && finalRsvpUrl && (
              <div className="mt-2 text-center text-[10px] text-black/35">
                {finalRsvpUrl}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}