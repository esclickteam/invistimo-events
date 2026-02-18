"use client";

type Props = {
  templateKey: "rsvp" | "rsvp_reminder" | "table" | "custom";
  previewText: string;
  headerImageUrl?: string;
  hasGiftButton?: boolean;
};

export default function WhatsappTemplatePreview({
  templateKey,
  previewText,
  headerImageUrl,
  hasGiftButton,
}: Props) {
  const isRsvpLike =
    templateKey === "rsvp" || templateKey === "rsvp_reminder";

  return (
    <div className="mx-auto bg-black rounded-[36px] p-3 shadow-xl w-[360px]">
      <div
        className="rounded-[28px] overflow-hidden"
        style={{
          backgroundImage: "url('/whatsapp-bg.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "auto",
        }}
      >
        {/* HEADER */}
        <div className="bg-gray-100 text-center py-2 text-xs font-semibold">
          INVISTIMO · WhatsApp
        </div>

        {/* BODY */}
        <div className="p-4">
          <div className="max-w-[92%] mx-auto">
            {/* ================= HEADER IMAGE (סבב 1 + סבב 2) ================= */}
            {isRsvpLike && (
              headerImageUrl ? (
                <img
                  src={headerImageUrl}
                  alt="Invitation"
                  className="w-full h-[180px] object-cover rounded-t-2xl border border-b-0 border-gray-200"
                />
              ) : (
                <div className="w-full h-[180px] bg-gray-200 rounded-t-2xl border border-b-0 border-gray-200 flex items-center justify-center text-xs text-gray-500">
                  אין תמונת הזמנה
                </div>
              )
            )}

            {/* ================= MESSAGE ================= */}
            {isRsvpLike && (
              <div className="bg-[#dcf8c6] border border-gray-200 p-3 text-sm whitespace-pre-wrap leading-relaxed rounded-b-2xl border-t-0">
                {previewText.split("\n").map((line, i) => (
                  <p key={i}>{line || <span>&nbsp;</span>}</p>
                ))}
              </div>
            )}

            {/* ================= CTA ================= */}
            {isRsvpLike && (
              <button
                disabled
                className="mt-2 w-full bg-white border border-gray-200 rounded-xl py-2 text-sm font-medium text-[#1d6fb8]"
              >
                אישור הגעה
              </button>
            )}

            {/* ================= TABLE TEMPLATE ================= */}
            {templateKey === "table" && (
              <div className="mt-2 border-t border-gray-200 bg-white rounded-b-2xl overflow-hidden">
                <div className="py-3 text-center text-sm text-[#1d6fb8]">
                  🔗 ניווט לאירוע
                </div>
                {hasGiftButton && (
                  <div className="border-t py-3 text-center text-sm text-[#1d6fb8]">
                    🔗 מתנה באשראי
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
