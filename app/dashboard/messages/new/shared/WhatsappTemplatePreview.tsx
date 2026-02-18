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
  const isRound1 = templateKey === "rsvp_invitation_media";
  const isRound2 = templateKey === "rsvp_reminder_invistimo";

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

            {/* 🖼️ IMAGE — גם בסבב 2 */}
            {headerImageUrl && (
              <img
                src={headerImageUrl}
                className={`w-full h-[180px] object-cover border ${
                  isRound1
                    ? "rounded-t-2xl border-b-0"
                    : "rounded-2xl mb-2"
                }`}
              />
            )}

            {/* 💬 MESSAGE */}
            <div
              className={`border border-gray-200 p-3 text-sm whitespace-pre-wrap leading-relaxed ${
                isRound1
                  ? "bg-[#dcf8c6] rounded-b-2xl border-t-0"
                  : "bg-white rounded-2xl"
              }`}
            >
              {previewText}
            </div>

            {/* 🔘 BUTTON */}
            {(isRound1 || isRound2) && (
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
