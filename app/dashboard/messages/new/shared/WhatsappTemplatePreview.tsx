"use client";

type Props = {
  templateKey:
    | "rsvp_invitation_media"
    | "rsvp_reminder_invistimo"
    | "table"
    | "custom";
  previewText: string;
  headerImageUrl?: string;
};

export default function WhatsappTemplatePreview({
  templateKey,
  previewText,
  headerImageUrl,
}: Props) {
  const isRsvp =
    templateKey === "rsvp_invitation_media" ||
    templateKey === "rsvp_reminder_invistimo";

  return (
    <div className="mx-auto bg-black rounded-[36px] p-3 shadow-xl w-[360px]">
      <div
        className="rounded-[28px] overflow-hidden"
        style={{
          backgroundImage: "url('/whatsapp-bg.png')",
          backgroundRepeat: "repeat",
        }}
      >
        {/* HEADER */}
        <div className="bg-gray-100 text-center py-2 text-xs font-semibold">
          INVISTIMO · WhatsApp
        </div>

        <div className="p-4">
          <div className="max-w-[92%] mx-auto">
            {/* 🖼️ IMAGE — זהה בסבב 1 + 2 */}
            {headerImageUrl && (
              <img
                src={headerImageUrl}
                alt="Invitation"
                className="w-full h-[180px] object-cover rounded-t-2xl border border-b-0 border-gray-200"
              />
            )}

            {/* 💬 MESSAGE — זהה לחלוטין */}
            <div className="bg-white border border-gray-200 p-3 text-sm whitespace-pre-wrap leading-relaxed rounded-b-2xl">
              {previewText}
            </div>

            {/* 🔘 BUTTON — זהה לחלוטין */}
            {isRsvp && (
              <button
                disabled
                className="mt-2 w-full bg-white border border-gray-200 rounded-xl py-2 text-sm font-medium text-[#1d6fb8]"
              >
                אישור הגעה
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
